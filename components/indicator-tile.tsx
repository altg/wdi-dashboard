import Link from "next/link";
import { Sparkline } from "@/components/sparkline";
import { formatNumber } from "@/lib/format";
import type { Indicator } from "@/lib/registry/indicators";
import type { Observation } from "@/lib/wb/client";

type Props = {
  indicator: Indicator;
  iso3: string;
  obs: Observation[];
  extraParams?: string;
};

export function IndicatorTile({ indicator, iso3, obs, extraParams }: Props) {
  const sorted = obs.filter((o) => o.value !== null).sort((a, b) => b.year - a.year);
  const latest = sorted[0] ?? null;
  const latestValue = latest?.value ?? null;
  const latestYear = latest?.year ?? null;

  const base2000 = obs.find((o) => o.year === 2000 && o.value !== null) ?? null;
  const delta =
    latestValue !== null && base2000 !== null
      ? latestValue - (base2000.value as number)
      : null;

  const isImproving =
    delta !== null
      ? indicator.sdgDirection === "lower-is-better"
        ? delta < 0
        : delta > 0
      : false;

  const sparkData = obs
    .filter((o) => o.value !== null)
    .sort((a, b) => a.year - b.year)
    .map((o) => ({ year: o.year, value: o.value }));

  const drillParams = new URLSearchParams(extraParams ?? "");
  drillParams.set("from", "profile");
  const drillHref = `/indicator/${indicator.code}/country/${iso3}?${drillParams}`;
  const deepHref = `/indicator/${indicator.code}${extraParams ? `?${extraParams}` : ""}`;

  if (latestValue === null) {
    return (
      <div
        className="border border-dashed border-subtle rounded-md p-3 flex flex-col"
        style={{ minHeight: 112 }}
        aria-label={`${indicator.name}: no data`}
      >
        <code className="text-[10px] font-mono text-tertiary mb-1">{indicator.code}</code>
        <div className="text-[11px] font-medium text-secondary leading-snug">
          {indicator.name}
        </div>
        <div className="text-[10px] text-tertiary mt-auto pt-2">No data</div>
      </div>
    );
  }

  return (
    /*
     * Layout: relative container with an absolutely-positioned primary link that
     * covers the full tile. The hover strip sits at the bottom with z-10 so its
     * own links are clickable and override the primary link. No nested <a> tags.
     */
    <div
      className="group relative bg-surface border border-subtle rounded-md p-3 hover:border-[rgba(0,0,0,0.18)] hover:shadow-sm transition-all overflow-hidden"
      style={{ minHeight: 112 }}
    >
      {/* Primary link — covers the tile body, sits below the hover strip */}
      <Link
        href={drillHref}
        className="absolute inset-0 z-0"
        aria-label={`${indicator.name} — country drilldown`}
      />

      {/* Code + SDG badge */}
      <div className="relative z-10 flex items-start justify-between gap-1 mb-1 pointer-events-none">
        <code className="text-[10px] font-mono text-tertiary">{indicator.code}</code>
        {indicator.sdgGoal && (
          <span className="inline-block px-1 py-0.5 rounded-[3px] text-[9px] font-medium bg-[#E3EDFB] text-[#0C3B75] leading-tight shrink-0">
            SDG {indicator.sdgTarget ?? indicator.sdgGoal}
          </span>
        )}
      </div>

      {/* Indicator name */}
      <div className="relative z-10 text-[11px] font-medium text-primary leading-snug line-clamp-2 mb-2 pointer-events-none">
        {indicator.name}
      </div>

      {/* Value + sparkline */}
      <div className="relative z-10 flex items-end justify-between gap-2 pointer-events-none">
        <div>
          <div className="text-[17px] font-medium tabular-nums text-primary leading-none">
            {formatNumber(latestValue, { precision: indicator.precision })}
          </div>
          <div className="text-[9px] text-tertiary mt-0.5 leading-tight">
            {latestYear}
            {delta !== null && (
              <span className={`ml-1.5 ${isImproving ? "text-positive" : "text-negative"}`}>
                {isImproving ? "▼" : "▲"}{" "}
                {formatNumber(Math.abs(delta), { precision: indicator.precision })} since 2000
              </span>
            )}
          </div>
        </div>
        {sparkData.length >= 3 && (
          <Sparkline
            data={sparkData}
            color={isImproving ? "#3B6D11" : "#A32D2D"}
            width={72}
            height={28}
          />
        )}
      </div>

      {/* Hover strip — z-10 so its links override the primary link */}
      <div className="absolute inset-x-0 bottom-0 z-10 hidden group-hover:flex items-center gap-2 px-3 py-1.5 bg-surface-2 border-t border-subtle text-[10px]">
        <Link href={drillHref} className="text-info hover:underline">
          Country drilldown
        </Link>
        <span className="text-tertiary pointer-events-none">·</span>
        <Link href={deepHref} className="text-info hover:underline">
          All peers
        </Link>
      </div>
    </div>
  );
}
