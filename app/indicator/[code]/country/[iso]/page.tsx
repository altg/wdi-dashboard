import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getIndicator } from "@/lib/registry/indicators";
import { getPeerGroup, PEER_GROUPS } from "@/lib/registry/peer-groups";
import {
  getCachedCountries,
  getCountryHistory,
  getPeerGroupSnapshot,
} from "@/lib/wb/cache";
import { resolveYearWindow } from "@/lib/year-range";
import { getCountryEvents } from "@/lib/registry/events";
import { formatNumber, formatDelta } from "@/lib/format";
import { Breadcrumb } from "@/components/breadcrumb";
import { ActionBar } from "@/components/action-bar";
import { TrajectoryChart } from "@/components/trajectory-chart";
import { DriverTable, type DriverRow } from "@/components/driver-table";
import { DataQualityPanel } from "@/components/data-quality-panel";
import { sdgStatus, StatusBadge } from "@/components/status-badge";

// ── Helpers ───────────────────────────────────────────────────────────────────

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function CountryDrilldownPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string; iso: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { code, iso } = await params;
  const sp = await searchParams;

  const indicator = getIndicator(code);
  if (!indicator) notFound();

  const { selectedYear, compareYear } = await resolveYearWindow(code, sp);

  const peerGroupId = PEER_GROUPS.some((p) => p.id === sp.peer) ? sp.peer : "mena";
  const peerGroup = getPeerGroup(peerGroupId) ?? getPeerGroup("mena")!;

  // Step 1: country metadata (fast — cached)
  const allCountries = await getCachedCountries();
  const countryMeta = allCountries.find((c) => c.id === iso);
  if (!countryMeta) notFound();

  const regionCode = countryMeta.region.id;   // e.g. "MNA"
  const incomeCode = countryMeta.incomeLevel.id; // e.g. "LMC"
  const regionLabel = countryMeta.region.value;
  const incomeGroupLabel = countryMeta.incomeLevel.value;

  // Step 2: parallel fetches — each cache entry keyed independently for reuse
  const driverCodes = indicator.driverIndicators.slice(0, 6);
  const peerIso3s = peerGroup.countryIso3s;

  type ObsArray = Awaited<ReturnType<typeof getCountryHistory>>;
  const empty: ObsArray = [];

  const [
    countryTraj,
    regionTraj,
    incomeTraj,
    ...rest
  ] = await Promise.all([
    getCountryHistory(code, iso),
    getCountryHistory(code, regionCode),
    getCountryHistory(code, incomeCode),
    // driver: country history + peer snapshot (two separate cache entries each)
    ...driverCodes.flatMap((dc) => [
      getCountryHistory(dc, iso),
      peerIso3s.length > 0
        ? getPeerGroupSnapshot(dc, peerGroupId, peerIso3s, selectedYear)
        : Promise.resolve(empty),
    ]),
    // Uncertainty bounds
    indicator.uncertaintyIndicators
      ? getCountryHistory(indicator.uncertaintyIndicators.upper, iso)
      : Promise.resolve(empty),
    indicator.uncertaintyIndicators
      ? getCountryHistory(indicator.uncertaintyIndicators.lower, iso)
      : Promise.resolve(empty),
  ]);

  // Unpack driver pairs
  const driverObsArrays: { country: ObsArray; peers: ObsArray }[] =
    driverCodes.map((_, i) => ({
      country: rest[i * 2] ?? empty,
      peers: rest[i * 2 + 1] ?? empty,
    }));
  const upperObs: ObsArray = rest[driverCodes.length * 2] ?? empty;
  const lowerObs: ObsArray = rest[driverCodes.length * 2 + 1] ?? empty;

  // ── Derive obs arrays ────────────────────────────────────────────────────
  const countryObs = countryTraj;
  const regionObs = regionTraj;
  const incomeGroupObs = incomeTraj;

  // ── Headline stat ────────────────────────────────────────────────────────
  const latestObs = countryObs
    .filter((o) => o.value !== null)
    .sort((a, b) => b.year - a.year)[0] ?? null;
  const baseObs = countryObs.find((o) => o.year === compareYear && o.value !== null) ?? null;

  const latestValue = latestObs?.value ?? null;
  const latestYear = latestObs?.year ?? null;
  const baseValue = baseObs?.value ?? null;
  const delta = latestValue !== null && baseValue !== null ? latestValue - baseValue : null;
  const pctChange =
    delta !== null && baseValue !== null && baseValue !== 0
      ? (delta / baseValue) * 100
      : null;

  // ── Driver rows ──────────────────────────────────────────────────────────
  const driverRows: DriverRow[] = driverCodes
    .map((driverCode, i) => {
      const { country: dCountry, peers: dPeers } = driverObsArrays[i];
      const driverIndicator = getIndicator(driverCode);
      if (!driverIndicator) return null;

      const countryEntry = dCountry.find((o) => o.value !== null);
      const peerEntries = dPeers
        .filter((o) => o.value !== null)
        .map((o) => o.value as number);

      const med = median(peerEntries);
      const peerMin = peerEntries.length ? Math.min(...peerEntries) : null;
      const peerMax = peerEntries.length ? Math.max(...peerEntries) : null;

      return {
        code: driverCode,
        name: driverIndicator.name,
        unit: driverIndicator.unit,
        countryValue: countryEntry?.value ?? null,
        peerMedian: med,
        peerMin,
        peerMax,
        sdgDirection: driverIndicator.sdgDirection,
        precision: driverIndicator.precision,
      } satisfies DriverRow;
    })
    .filter((r): r is DriverRow => r !== null);

  // ── Uncertainty ──────────────────────────────────────────────────────────
  const upperBound =
    upperObs
      .filter((o) => o.value !== null)
      .sort((a, b) => b.year - a.year)[0]?.value ?? null;
  const lowerBound =
    lowerObs
      .filter((o) => o.value !== null)
      .sort((a, b) => b.year - a.year)[0]?.value ?? null;

  // ── Events + peer options ────────────────────────────────────────────────
  const events = getCountryEvents(iso);

  const peerOptions = allCountries
    .filter((c) => peerIso3s.includes(c.id) && c.id !== iso)
    .map((c) => ({ iso3: c.id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const defaultPeer1 = peerOptions[0]?.iso3 ?? "";
  const defaultPeer2 = peerOptions[1]?.iso3 ?? "";

  // ── Back URL ─────────────────────────────────────────────────────────────
  const backParams = new URLSearchParams();
  if (sp.peer) backParams.set("peer", sp.peer);
  if (sp.year) backParams.set("year", sp.year);
  if (sp.compare) backParams.set("compare", sp.compare);
  const backHref = `/indicator/${code}${backParams.size ? `?${backParams}` : ""}`;
  const fromProfile = sp.from === "profile";

  const isImproving =
    pctChange !== null
      ? indicator.sdgDirection === "lower-is-better"
        ? pctChange < 0
        : pctChange > 0
      : false;
  const status = sdgStatus(latestValue, indicator.sdgTargetValue, indicator.sdgDirection);

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-6">
      {/* Breadcrumb */}
      <Breadcrumb
        crumbs={[
          ...(fromProfile
            ? [{ label: `${countryMeta.name} profile`, href: `/country/${iso}` }]
            : []),
          { label: indicator.name, href: backHref },
          { label: peerGroup.label },
          { label: countryMeta.name },
        ]}
      />

      {/* Page header */}
      <div className="flex justify-between items-end pb-3 mb-3 border-b border-subtle">
        <div>
          <div className="uppercase text-[10px] tracking-[0.5px] text-tertiary">
            Country focus
          </div>
          <h1 className="text-[20px] font-medium text-primary mt-0.5">
            {countryMeta.name} · {indicator.name}
          </h1>
          <div className="text-[11px] text-secondary mt-1">
            {incomeGroupLabel} · {regionLabel}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-baseline gap-1.5 justify-end">
            <span className="text-[28px] font-medium tabular-nums text-primary">
              {latestValue !== null
                ? formatNumber(latestValue, { precision: indicator.precision })
                : "—"}
            </span>
            <span className="text-[13px] text-secondary">{indicator.unit}</span>
          </div>
          <div
            className={`text-[11px] mt-0.5 ${isImproving ? "text-positive" : pctChange !== null ? "text-negative" : "text-tertiary"}`}
          >
            {pctChange !== null ? (
              <>
                {isImproving ? "▼" : "▲"} {Math.abs(pctChange).toFixed(0)}% since {compareYear}
                {status === "on-track" && (
                  <span className="ml-2 text-positive">· SDG met</span>
                )}
              </>
            ) : (
              "No trend data"
            )}
          </div>
          <div className="mt-1">
            <StatusBadge status={status} />
          </div>
        </div>
      </div>

      {/* Trajectory chart */}
      <Suspense fallback={<div className="h-[300px] bg-surface border border-subtle rounded-md mb-2 animate-pulse" />}>
        <TrajectoryChart
          indicator={indicator}
          countryIso3={iso}
          countryName={countryMeta.name}
          countryObs={countryObs}
          regionObs={regionObs}
          regionLabel={regionLabel}
          incomeGroupObs={incomeGroupObs}
          incomeGroupLabel={incomeGroupLabel}
          peerOptions={peerOptions}
          defaultPeer1={defaultPeer1}
          defaultPeer2={defaultPeer2}
          events={events}
        />
      </Suspense>

      {/* Driver table + data quality */}
      <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: "1.3fr 1fr" }}>
        <DriverTable
          rows={driverRows}
          countryName={countryMeta.name}
          peerGroupLabel={peerGroup.label}
          peerCount={peerIso3s.length}
        />
        <DataQualityPanel
          indicator={indicator}
          latestObsYear={latestYear}
          upperBound={upperBound}
          lowerBound={lowerBound}
          selectedYear={selectedYear}
        />
      </div>

      {/* Action bar */}
      <ActionBar
        indicator={indicator}
        countryName={countryMeta.name}
        countryIso3={iso}
        trajectoryObs={countryObs}
        regionObs={regionObs}
        regionLabel={regionLabel}
        incomeGroupObs={incomeGroupObs}
        incomeGroupLabel={incomeGroupLabel}
      />
    </div>
  );
}
