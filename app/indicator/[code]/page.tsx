import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getIndicator } from "@/lib/registry/indicators";
import { PEER_GROUPS, getPeerGroup } from "@/lib/registry/peer-groups";
import { getRegionTrend, getGlobalSnapshot, getPeerGroupHistory } from "@/lib/wb/cache";
import { formatNumber } from "@/lib/format";
import {
  computeHistogramBins,
  buildHistogramBins,
  buildIndexedTrendData,
  type HistogramBin,
  type TrendDataPoint,
} from "@/lib/chart-helpers";
import { MetadataStrip } from "@/components/metadata-strip";
import { StatCard, StatGrid } from "@/components/stat-card";
import { DistributionHistogram } from "@/components/distribution-histogram";
import { IndexedTrendChart, type TrendSeries } from "@/components/indexed-trend-chart";
import { FilterBar } from "@/components/filter-bar";
import { PeerTable } from "@/components/peer-table";
import { RelatedIndicators } from "@/components/related-indicators";

// ── Constants ────────────────────────────────────────────────────────────────
const MIN_YEAR = 2000;
const MAX_YEAR = 2023;

const TREND_SERIES: TrendSeries[] = [
  { key: "MNA", label: "MENA",            color: "#D85A30" },
  { key: "SAS", label: "South Asia",      color: "#534AB7" },
  { key: "SSA", label: "Sub-Sah. Africa", color: "#854F0B" },
  { key: "LAC", label: "Latin America",   color: "#185FA5" },
  { key: "HIC", label: "High income",     color: "#0C447C" },
];

// WB aggregate codes that should be excluded from the distribution histogram
const WB_AGGREGATES = new Set([
  "WLD","EAS","EAP","ECA","LAC","MNA","NAC","SAS","SSA",
  "HIC","LIC","LMC","UMC","IBD","IDA","LDC","OED","INX",
  "PRE","PST","TSA","TSS","XZN","EUU",
]);

// ── Helper ───────────────────────────────────────────────────────────────────
function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function IndicatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const { code } = await params;
  const sp = await searchParams;

  const indicator = getIndicator(code);
  if (!indicator) notFound();

  // Parse + clamp URL params
  const peerGroupId = PEER_GROUPS.some((p) => p.id === sp.peer)
    ? sp.peer
    : "mena";
  const selectedYear = Math.min(
    MAX_YEAR,
    Math.max(MIN_YEAR + 1, parseInt(sp.year ?? String(MAX_YEAR), 10))
  );
  const compareYear = Math.min(
    selectedYear - 1,
    Math.max(MIN_YEAR, parseInt(sp.compare ?? String(MIN_YEAR), 10))
  );

  const peerGroup = getPeerGroup(peerGroupId) ?? getPeerGroup("mena")!;

  // Include the WB aggregate code in the peer fetch so PeerTable can show the group average.
  const aggregateCode = peerGroup.wbAggregateCode ?? "";
  const peerIso3s = peerGroup.countryIso3s.length > 0 ? peerGroup.countryIso3s : [];
  const allPeerIso3s = aggregateCode
    ? [...peerIso3s, aggregateCode]
    : peerIso3s;
  const regionIso3s = TREND_SERIES.map((s) => s.key);

  // Parallel fetch: region trend + global distribution + full peer history.
  // Peer history (2000→selectedYear) serves both the stat cards (filtered by year)
  // and the PeerTable (passed as fallbackData so it renders without a client fetch).
  const [regionObs, allObs, peerHistoryObs] = await Promise.all([
    getRegionTrend(code, regionIso3s),
    getGlobalSnapshot(code, selectedYear),
    allPeerIso3s.length > 0
      ? getPeerGroupHistory(code, peerGroupId, allPeerIso3s, selectedYear)
      : Promise.resolve([]),
  ]);

  // ── Stat cards ───────────────────────────────────────────────────────────
  // Derive snapshot values from the cached history rather than separate fetches.
  const peerLatest = peerHistoryObs.filter(
    (o) => o.year === selectedYear && o.value !== null && peerIso3s.includes(o.countryIso3)
  );
  const peerBase = peerHistoryObs.filter(
    (o) => o.year === compareYear && o.value !== null && peerIso3s.includes(o.countryIso3)
  );

  const coveragePct =
    peerIso3s.length > 0
      ? (peerLatest.length / peerIso3s.length) * 100
      : null;

  const isModelled = !!(indicator.coverageNote?.toLowerCase().includes("modelled"));

  const peerAvgLatest = avg(peerLatest.map((o) => o.value as number));
  const peerAvgBase   = avg(peerBase.map((o) => o.value as number));
  const pctChange =
    peerAvgBase > 0
      ? ((peerAvgLatest - peerAvgBase) / peerAvgBase) * 100
      : null;

  const sdgTarget = indicator.sdgTargetValue;
  const onTrackCount =
    sdgTarget !== undefined
      ? peerLatest.filter((o) =>
          indicator.sdgDirection === "lower-is-better"
            ? (o.value as number) <= sdgTarget
            : (o.value as number) >= sdgTarget
        ).length
      : null;
  const offTrackCount =
    onTrackCount !== null ? peerLatest.length - onTrackCount : null;

  // ── Histogram ────────────────────────────────────────────────────────────
  const allCountryValues = allObs
    .filter((o) => !WB_AGGREGATES.has(o.countryIso3) && o.value !== null)
    .map((o) => o.value as number);

  const histogramData: HistogramBin[] = buildHistogramBins(
    allCountryValues,
    computeHistogramBins(allCountryValues)
  );

  // ── Indexed trend ────────────────────────────────────────────────────────
  const trendData: TrendDataPoint[] = buildIndexedTrendData(
    regionObs,
    TREND_SERIES.map((s) => ({ key: s.key, iso3: s.key })),
    MIN_YEAR
  );

  // World latest value for metadata strip (from region obs)
  const worldLatest = regionObs.find(
    (o) => o.countryIso3 === "WLD" && o.year === selectedYear
  )?.value ?? null;

  // ── Render ───────────────────────────────────────────────────────────────
  const isRegionGroup = peerGroup.type === "region";

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-6">
      {/* Metadata strip */}
      <MetadataStrip
        indicator={indicator}
        coverage={String(allCountryValues.length)}
        yearRange={`${MIN_YEAR}–${MAX_YEAR}`}
        worldLatest={worldLatest}
      />

      {/* Filter bar — client island */}
      <Suspense fallback={
        <div className="flex items-center gap-1.5 mb-2.5 animate-pulse">
          <div className="h-2 w-16 bg-surface-2 rounded" />
          <div className="h-7 w-40 bg-surface-2 rounded" />
          <div className="h-2 w-8 bg-surface-2 rounded ml-2" />
          <div className="h-7 w-20 bg-surface-2 rounded" />
          <div className="h-2 w-16 bg-surface-2 rounded ml-2" />
          <div className="h-7 w-20 bg-surface-2 rounded" />
        </div>
      }>
        <FilterBar coveragePct={coveragePct} />
      </Suspense>

      {/* Headline row */}
      <div className="grid grid-cols-2 gap-2 mb-2">

        {/* Left panel — stats + histogram */}
        <div className="bg-surface border border-subtle rounded-md p-3.5">
          <div className="flex justify-between items-baseline mb-2.5">
            <div className="font-medium text-primary">
              {peerGroup.label} · headline
            </div>
            <div className="text-[11px] text-tertiary font-mono">
              {compareYear} → {selectedYear}
            </div>
          </div>

          {isRegionGroup && peerLatest.length > 0 ? (
            <StatGrid cols={4}>
              <StatCard
                label="Peer avg"
                modelled={isModelled}
                value={formatNumber(peerAvgLatest, { precision: indicator.precision })}
                sub={
                  pctChange !== null
                    ? `${pctChange > 0 ? "▲" : "▼"} ${Math.abs(pctChange).toFixed(0)}%`
                    : undefined
                }
                subVariant={
                  pctChange === null
                    ? "muted"
                    : indicator.sdgDirection === "lower-is-better"
                    ? pctChange < 0 ? "positive" : "negative"
                    : pctChange > 0 ? "positive" : "negative"
                }
              />
              <StatCard
                label={`Avg ${compareYear}`}
                value={formatNumber(peerAvgBase, { precision: indicator.precision })}
                sub="baseline"
                subVariant="muted"
              />
              <StatCard
                label="On track"
                value={onTrackCount !== null ? String(onTrackCount) : "—"}
                sub={peerLatest.length > 0 ? `of ${peerLatest.length}` : undefined}
                subVariant="muted"
              />
              <StatCard
                label="Off track"
                value={offTrackCount !== null ? String(offTrackCount) : "—"}
                sub={sdgTarget ? `SDG ${sdgTarget}` : undefined}
                subVariant={
                  offTrackCount !== null && offTrackCount > 0 ? "negative" : "muted"
                }
              />
            </StatGrid>
          ) : (
            <div className="h-[68px] flex items-center justify-center text-[12px] text-tertiary">
              {peerGroup.type === "income"
                ? "Country-level breakdown for income groups coming soon"
                : "No data available"}
            </div>
          )}

          <div className="text-[11px] text-secondary mt-3.5 mb-1">
            Distribution across {allCountryValues.length} countries ({selectedYear})
          </div>
          <DistributionHistogram
            data={histogramData}
            sdgTarget={indicator.sdgTargetValue}
            sdgDirection={indicator.sdgDirection}
            unit={indicator.unit}
          />
        </div>

        {/* Right panel — indexed trend chart */}
        <div className="bg-surface border border-subtle rounded-md p-3.5">
          <div className="flex justify-between items-baseline mb-2.5">
            <div className="font-medium text-primary">Trend by region, indexed</div>
            <div className="text-[11px] text-tertiary font-mono">
              {MIN_YEAR} = 100
            </div>
          </div>
          <IndexedTrendChart
            data={trendData}
            series={TREND_SERIES}
            baseYear={MIN_YEAR}
          />
        </div>
      </div>

      {/* Peer table — renders immediately from server-fetched history; SWR revalidates in background */}
      <PeerTable
        code={code}
        peerGroup={peerGroup}
        selectedYear={selectedYear}
        compareYear={compareYear}
        indicator={indicator}
        initialData={peerHistoryObs}
      />

      {/* Related indicators */}
      <Suspense fallback={<div className="h-28 bg-surface border border-subtle rounded-md animate-pulse" />}>
        <RelatedIndicators
          relatedCodes={indicator.relatedIndicators}
          currentCode={code}
        />
      </Suspense>
    </div>
  );
}
