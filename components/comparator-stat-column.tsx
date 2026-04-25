import { formatNumber, formatDelta } from "@/lib/format";
import { sdgStatus, StatusBadge } from "@/components/status-badge";
import { StatCard, StatGrid } from "@/components/stat-card";
import type { Indicator } from "@/lib/registry/indicators";

type Props = {
  countryName: string;
  latestValue: number | null;
  latestYear: number | null;
  prevValue: number | null;
  regionAvg: number | null;
  regionLabel: string;
  indicator: Indicator;
};

export function ComparatorStatColumn({
  countryName,
  latestValue,
  latestYear,
  prevValue,
  regionAvg,
  regionLabel,
  indicator,
}: Props) {
  const yoyDelta =
    latestValue !== null && prevValue !== null ? latestValue - prevValue : null;
  const vsRegion =
    latestValue !== null && regionAvg !== null ? latestValue - regionAvg : null;
  const status = sdgStatus(latestValue, indicator.sdgTargetValue, indicator.sdgDirection);

  const isImproving =
    yoyDelta !== null
      ? indicator.sdgDirection === "lower-is-better"
        ? yoyDelta < 0
        : yoyDelta > 0
      : false;

  const vsRegionVariant =
    vsRegion === null
      ? "muted"
      : indicator.sdgDirection === "lower-is-better"
      ? vsRegion < 0
        ? "positive"
        : "negative"
      : vsRegion > 0
      ? "positive"
      : "negative";

  return (
    <div className="bg-surface border border-subtle rounded-md p-3.5">
      <div className="flex items-baseline justify-between mb-3">
        <div className="text-[13px] font-medium text-primary">{countryName}</div>
        <StatusBadge status={status} />
      </div>

      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-[28px] font-medium tabular-nums text-primary leading-none">
          {latestValue !== null
            ? formatNumber(latestValue, { precision: indicator.precision })
            : "—"}
        </span>
        <span className="text-[12px] text-secondary">{indicator.unit}</span>
        {latestYear && (
          <span className="text-[11px] text-tertiary ml-1">({latestYear})</span>
        )}
      </div>

      <StatGrid cols={2}>
        <StatCard
          label="YoY change"
          value={
            yoyDelta !== null
              ? formatDelta(yoyDelta, { precision: indicator.precision })
              : "—"
          }
          subVariant={yoyDelta === null ? "muted" : isImproving ? "positive" : "negative"}
        />
        <StatCard
          label={`vs ${regionLabel}`}
          value={
            vsRegion !== null
              ? formatDelta(vsRegion, { precision: indicator.precision })
              : "—"
          }
          subVariant={vsRegion === null ? "muted" : vsRegionVariant}
        />
      </StatGrid>
    </div>
  );
}
