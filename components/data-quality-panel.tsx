import type { Indicator } from "@/lib/registry/indicators";

type Props = {
  indicator: Indicator;
  latestObsYear: number | null;
  upperBound: number | null;
  lowerBound: number | null;
  selectedYear: number;
};

function Row({ label, value, variant }: { label: string; value: string; variant?: "warning" }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-subtle last:border-0 text-[12px]">
      <span className="text-secondary">{label}</span>
      <span className={variant === "warning" ? "text-warning" : "text-primary"}>{value}</span>
    </div>
  );
}

export function DataQualityPanel({
  indicator,
  latestObsYear,
  upperBound,
  lowerBound,
  selectedYear,
}: Props) {
  const isGapFilled = latestObsYear !== null && latestObsYear < selectedYear;
  const hasUncertainty = upperBound !== null && lowerBound !== null;
  const isModelled = indicator.coverageNote?.toLowerCase().includes("modelled") ?? false;

  return (
    <div className="bg-surface border border-subtle rounded-md p-3.5 h-full">
      <div className="font-medium text-primary mb-2.5">Data quality &amp; notes</div>

      <div className="flex flex-col">
        <Row
          label="Latest observation"
          value={
            latestObsYear
              ? `${latestObsYear}${isModelled ? " (modelled)" : ""}`
              : "—"
          }
        />
        <Row
          label="Uncertainty interval"
          value={
            hasUncertainty
              ? `${lowerBound?.toFixed(0)} – ${upperBound?.toFixed(0)} (80% UI)`
              : "—"
          }
        />
        <Row
          label="Source"
          value={indicator.source}
        />
        <Row
          label="Gap-filled years"
          value={isGapFilled ? `${latestObsYear! + 1}–${selectedYear}` : "None"}
          variant={isGapFilled ? "warning" : undefined}
        />
        <Row
          label="Coverage note"
          value={indicator.coverageNote ?? "—"}
        />
      </div>

      {(isModelled || isGapFilled) && (
        <div className="mt-3 bg-[rgba(186,117,23,0.10)] text-[#633806] rounded p-2 text-[11px] leading-relaxed">
          ⚠︎{" "}
          {isGapFilled
            ? `${latestObsYear! + 1}–${selectedYear} are modelled estimates, not reported values. Cite as "${indicator.source} estimate."`
            : `Values are modelled estimates. Cite as "${indicator.source} estimate."`}
        </div>
      )}
    </div>
  );
}
