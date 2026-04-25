import type { Indicator } from "@/lib/registry/indicators";

export type MetadataStripProps = {
  indicator: Indicator;
  coverage: string;
  yearRange: string;
  worldLatest?: number | null;
};

export function MetadataStrip({
  indicator,
  coverage,
  yearRange,
  worldLatest,
}: MetadataStripProps) {
  const hasSdg = indicator.sdgTarget && indicator.sdgTargetValue !== undefined;
  const direction = indicator.sdgDirection === "lower-is-better" ? "<" : ">";

  return (
    <div
      className="grid border border-subtle rounded-md mb-2.5 bg-surface-2"
      style={{ gridTemplateColumns: "1.3fr 1fr 1fr 1fr 0.7fr" }}
    >
      {/* Indicator name */}
      <div className="px-3.5 py-2.5 border-r border-subtle">
        <div className="uppercase text-[10px] tracking-[0.5px] text-tertiary">Indicator</div>
        <div className="text-[14px] font-medium mt-0.5 text-primary">{indicator.name}</div>
        <div className="text-[11px] text-secondary font-mono mt-0.5">
          {indicator.code} · {indicator.unit}
        </div>
      </div>

      {/* Source */}
      <div className="px-3.5 py-2.5 border-r border-subtle">
        <div className="uppercase text-[10px] tracking-[0.5px] text-tertiary">Source</div>
        <div className="mt-0.5 text-primary">{indicator.source}</div>
        {indicator.coverageNote && (
          <div className="text-[11px] text-secondary mt-0.5">{indicator.coverageNote}</div>
        )}
      </div>

      {/* Coverage */}
      <div className="px-3.5 py-2.5 border-r border-subtle">
        <div className="uppercase text-[10px] tracking-[0.5px] text-tertiary">Coverage</div>
        <div className="mt-0.5 text-primary">{coverage} countries</div>
        <div className="text-[11px] text-secondary mt-0.5">{yearRange}</div>
      </div>

      {/* SDG target */}
      <div className="px-3.5 py-2.5 border-r border-subtle">
        <div className="uppercase text-[10px] tracking-[0.5px] text-tertiary">
          {hasSdg ? `SDG target (${indicator.sdgTarget})` : "SDG linkage"}
        </div>
        {hasSdg ? (
          <>
            <div className="mt-0.5 font-medium text-info">
              {direction} {indicator.sdgTargetValue} by 2030
            </div>
            {worldLatest !== null && worldLatest !== undefined && (
              <div className="text-[11px] text-secondary mt-0.5">
                Current world: {worldLatest.toFixed(indicator.precision)}
              </div>
            )}
          </>
        ) : (
          <div className="mt-0.5 text-secondary">
            SDG {indicator.sdgGoal ?? "—"}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-3.5 py-2.5 flex flex-col gap-1 justify-center">
        <button className="h-7 text-[12px] px-2 bg-surface border border-subtle rounded text-primary hover:bg-surface-2 cursor-pointer">
          Export CSV
        </button>
        <button className="h-7 text-[12px] px-2 bg-surface border border-subtle rounded text-primary hover:bg-surface-2 cursor-pointer">
          Cite
        </button>
      </div>
    </div>
  );
}
