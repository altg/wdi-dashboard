import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getIndicator } from "@/lib/registry/indicators";
import { PEER_GROUPS, getPeerGroup } from "@/lib/registry/peer-groups";
import {
  getCachedCountries,
  getCountryHistory,
  getCountryMeta,
  getPeerGroupSnapshot,
} from "@/lib/wb/cache";
import { formatNumber, formatDelta } from "@/lib/format";
import { Breadcrumb } from "@/components/breadcrumb";
import { MetadataStrip } from "@/components/metadata-strip";
import { ComparatorHeader } from "@/components/comparator-header";
import { ComparatorStatColumn } from "@/components/comparator-stat-column";
import { TrajectoryChart } from "@/components/trajectory-chart";
import { DriverTable, type DriverRow } from "@/components/driver-table";
import { sdgStatus } from "@/components/status-badge";

const MIN_YEAR = 2000;
const MAX_YEAR = 2023;

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { code } = await params;
  const sp = await searchParams;
  const indicator = getIndicator(code);
  if (!indicator) return { title: "Comparator — WDI Dashboard" };

  const a = typeof sp.a === "string" ? sp.a : "";
  const b = typeof sp.b === "string" ? sp.b : null;

  const countries = await getCachedCountries().catch(() => []);
  const nameA = countries.find((c) => c.id === a)?.name ?? a;
  const nameB = b ? (countries.find((c) => c.id === b)?.name ?? b) : null;

  const suffix = nameB ? `${nameA} vs ${nameB}` : nameA;
  return { title: `${indicator.name}: ${suffix} — WDI Dashboard` };
}

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { code } = await params;
  const sp = await searchParams;

  const indicator = getIndicator(code);
  if (!indicator) notFound();

  const isoA = typeof sp.a === "string" ? sp.a : null;
  if (!isoA) redirect(`/indicator/${code}`);

  const isoB = typeof sp.b === "string" ? sp.b : null;

  const selectedYear = Math.min(
    MAX_YEAR,
    Math.max(MIN_YEAR + 1, parseInt(typeof sp.year === "string" ? sp.year : String(MAX_YEAR), 10))
  );
  const peerGroupId = PEER_GROUPS.some((p) => p.id === sp.peer) ? (sp.peer as string) : "mena";
  const peerGroup = getPeerGroup(peerGroupId) ?? getPeerGroup("mena")!;

  // Fetch all countries for picker and metadata
  const allCountries = await getCachedCountries();

  const metaA = allCountries.find((c) => c.id === isoA);
  if (!metaA) redirect(`/indicator/${code}`);

  const metaB = isoB ? allCountries.find((c) => c.id === isoB) ?? null : null;

  const driverCodes = indicator.driverIndicators.slice(0, 6);
  const peerIso3s = peerGroup.countryIso3s;

  type ObsArray = Awaited<ReturnType<typeof getCountryHistory>>;
  const empty: ObsArray = [];

  // Fetch trajectories + region/income + drivers
  const regionCode = metaA.region.id;
  const incomeCode = metaA.incomeLevel.id;

  const fetchesB = metaB
    ? driverCodes.flatMap((dc) => [
        getCountryHistory(dc, metaB.id),
        Promise.resolve(empty) as Promise<ObsArray>,
      ])
    : driverCodes.flatMap(() => [Promise.resolve(empty), Promise.resolve(empty)] as Promise<ObsArray>[]);

  const [
    trajA,
    regionObs,
    incomeObs,
    trajBRaw,
    ...rest
  ] = await Promise.all([
    getCountryHistory(code, isoA),
    getCountryHistory(code, regionCode),
    getCountryHistory(code, incomeCode),
    metaB ? getCountryHistory(code, metaB.id) : Promise.resolve(empty),
    // driver pairs for A
    ...driverCodes.flatMap((dc) => [
      getCountryHistory(dc, isoA),
      peerIso3s.length > 0
        ? getPeerGroupSnapshot(dc, peerGroupId, peerIso3s, selectedYear)
        : Promise.resolve(empty),
    ]),
    // driver history for B (no peer snapshot needed — comparator shows both countries side by side)
    ...fetchesB,
  ]);

  const trajB = metaB ? trajBRaw : null;

  const driverPairsA: { country: ObsArray; peers: ObsArray }[] = driverCodes.map((_, i) => ({
    country: rest[i * 2] ?? empty,
    peers: rest[i * 2 + 1] ?? empty,
  }));

  const bDriverOffset = driverCodes.length * 2;
  const driverObsB: ObsArray[] = driverCodes.map(
    (_, i) => rest[bDriverOffset + i * 2] ?? empty
  );

  // Derive driver rows for A
  const driverRowsA: DriverRow[] = driverCodes
    .map((driverCode, i): DriverRow | null => {
      const { country: dCountry, peers: dPeers } = driverPairsA[i];
      const driverIndicator = getIndicator(driverCode);
      if (!driverIndicator) return null;
      const countryEntry = dCountry.find((o) => o.value !== null);
      const peerEntries = dPeers.filter((o) => o.value !== null).map((o) => o.value as number);
      const med = median(peerEntries);
      const row: DriverRow = {
        code: driverCode,
        name: driverIndicator.name,
        unit: driverIndicator.unit,
        countryValue: countryEntry?.value ?? null,
        peerMedian: med,
        peerMin: peerEntries.length ? Math.min(...peerEntries) : null,
        peerMax: peerEntries.length ? Math.max(...peerEntries) : null,
        sdgDirection: driverIndicator.sdgDirection,
        precision: driverIndicator.precision,
      };
      if (metaB) {
        row.compareValue = driverObsB[i]?.find((o) => o.value !== null)?.value ?? null;
      }
      return row;
    })
    .filter((r): r is DriverRow => r !== null);

  // Derive driver rows for B (only when B is set; reuses same peer snapshot)
  const driverRowsB: DriverRow[] = metaB
    ? driverCodes
        .map((driverCode, i): DriverRow | null => {
          const driverIndicator = getIndicator(driverCode);
          if (!driverIndicator) return null;
          const { peers: dPeers } = driverPairsA[i];
          const bObs = driverObsB[i] ?? empty;
          const countryEntry = bObs.find((o) => o.value !== null);
          const peerEntries = dPeers.filter((o) => o.value !== null).map((o) => o.value as number);
          return {
            code: driverCode,
            name: driverIndicator.name,
            unit: driverIndicator.unit,
            countryValue: countryEntry?.value ?? null,
            peerMedian: median(peerEntries),
            peerMin: peerEntries.length ? Math.min(...peerEntries) : null,
            peerMax: peerEntries.length ? Math.max(...peerEntries) : null,
            sdgDirection: driverIndicator.sdgDirection,
            precision: driverIndicator.precision,
          };
        })
        .filter((r): r is DriverRow => r !== null)
    : [];

  // Headline values for stat columns
  function headlineStat(obs: ObsArray) {
    const latest = obs.filter((o) => o.value !== null).sort((a, b) => b.year - a.year)[0] ?? null;
    const prev = latest
      ? (obs.find((o) => o.year === latest.year - 1 && o.value !== null) ?? null)
      : null;
    const regionLatest =
      regionObs.find((o) => o.year === latest?.year && o.value !== null) ?? null;
    return { latest, prev, regionLatest };
  }

  const statA = headlineStat(trajA);
  const statB = trajB ? headlineStat(trajB) : null;

  const regionLabel = metaA.region.value;
  const incomeGroupLabel = metaA.incomeLevel.value;

  const regionLabelB = metaB ? metaB.region.value : regionLabel;

  const peerOptions = allCountries
    .filter((c) => peerIso3s.includes(c.id) && c.id !== isoA)
    .map((c) => ({ iso3: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const backHref = `/indicator/${code}`;

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-6">
      <Breadcrumb
        crumbs={[
          { label: indicator.name, href: backHref },
          { label: "Compare" },
          {
            label: metaB
              ? `${metaA.name} vs ${metaB.name}`
              : `${metaA.name} vs …`,
          },
        ]}
      />

      <MetadataStrip
        indicator={indicator}
        coverage={indicator.coverageNote ?? "2000–2023"}
        yearRange="2000–2023"
      />

      {/* Country pickers */}
      <ComparatorHeader
        code={code}
        isoA={isoA}
        isoB={isoB}
        year={selectedYear}
        peerGroupId={peerGroupId}
      />

      {/* Stat columns */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <section aria-label={metaA.name}>
          <ComparatorStatColumn
            countryName={metaA.name}
            latestValue={statA.latest?.value ?? null}
            latestYear={statA.latest?.year ?? null}
            prevValue={statA.prev?.value ?? null}
            regionAvg={statA.regionLatest?.value ?? null}
            regionLabel={regionLabel}
            indicator={indicator}
          />
        </section>
        <section aria-label={metaB?.name ?? "Country B"}>
          {metaB && statB ? (
            <ComparatorStatColumn
              countryName={metaB.name}
              latestValue={statB.latest?.value ?? null}
              latestYear={statB.latest?.year ?? null}
              prevValue={statB.prev?.value ?? null}
              regionAvg={statB.regionLatest?.value ?? null}
              regionLabel={regionLabelB}
              indicator={indicator}
            />
          ) : (
            <div className="bg-surface border border-subtle rounded-md p-6 flex flex-col items-center justify-center gap-2 min-h-[120px]">
              <div className="text-[12px] text-tertiary">Select a country to compare</div>
            </div>
          )}
        </section>
      </div>

      {/* Trajectory chart — full width */}
      <Suspense
        fallback={
          <div className="h-[280px] bg-surface border border-subtle rounded-md mb-2 animate-pulse" />
        }
      >
        <TrajectoryChart
          indicator={indicator}
          countryIso3={isoA}
          countryName={metaA.name}
          countryObs={trajA}
          regionObs={regionObs}
          regionLabel={regionLabel}
          incomeGroupObs={incomeObs}
          incomeGroupLabel={incomeGroupLabel}
          peerOptions={peerOptions}
          defaultPeer1={peerOptions[0]?.iso3 ?? ""}
          defaultPeer2={peerOptions[1]?.iso3 ?? ""}
          events={[]}
          countryBObs={trajB ?? undefined}
          countryBName={metaB?.name}
          comparatorMode
        />
      </Suspense>

      {/* Driver tables — side by side */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Suspense
          fallback={
            <div className="h-[200px] bg-surface border border-subtle rounded-md animate-pulse" />
          }
        >
          <DriverTable
            rows={driverRowsA}
            countryName={metaA.name}
            peerGroupLabel={peerGroup.label}
            peerCount={peerIso3s.length}
          />
        </Suspense>
        <Suspense
          fallback={
            <div className="h-[200px] bg-surface border border-subtle rounded-md animate-pulse" />
          }
        >
          {metaB ? (
            <DriverTable
              rows={driverRowsB}
              countryName={metaB.name}
              peerGroupLabel={peerGroup.label}
              peerCount={peerIso3s.length}
            />
          ) : (
            <div className="bg-surface border border-subtle rounded-md p-4 flex items-center justify-center text-[12px] text-tertiary">
              Driver data will appear after selecting a country
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}
