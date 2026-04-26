import { formatNumber } from "@/lib/format";

type Props = {
  countryName: string;
  regionLabel: string;
  incomeGroupLabel: string;
  population: number | null;
  populationYear: number | null;
  gdpPerCapita: number | null;
  gdpYear: number | null;
  lifeExpectancy: number | null;
  lifeExpYear: number | null;
  onTrackCount: number;
  totalWithTarget: number;
  availableCount: number;
  totalCount: number;
};

export function CountryProfileHeader({
  countryName,
  regionLabel,
  incomeGroupLabel,
  population,
  populationYear,
  gdpPerCapita,
  gdpYear,
  lifeExpectancy,
  lifeExpYear,
  onTrackCount,
  totalWithTarget,
  availableCount,
  totalCount,
}: Props) {
  const coveragePct = totalCount > 0 ? (availableCount / totalCount) * 100 : 0;
  const onTrackPct =
    totalWithTarget > 0 ? Math.round((onTrackCount / totalWithTarget) * 100) : null;

  return (
    <div className="mb-4">
      {/* Title row */}
      <div className="pb-3 mb-3 border-b border-subtle">
        <div className="uppercase text-[10px] tracking-[0.5px] text-tertiary">
          Country profile
        </div>
        <h1 className="text-[20px] font-medium text-primary mt-0.5">{countryName}</h1>
        <div className="text-[11px] text-secondary mt-0.5">
          {incomeGroupLabel} · {regionLabel}
        </div>
      </div>

      {/* Coverage notice */}
      {coveragePct < 50 && (
        <div className="mb-3 px-3 py-2 bg-[#FFF3D9] border border-[#E9C57A] rounded text-[11px] text-[#633806]">
          Limited data: {availableCount} of {totalCount} curated indicators available for this
          country ({Math.round(coveragePct)}%).
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard
          label="Population"
          value={
            population !== null
              ? formatNumber(population, { compact: true, precision: 1 })
              : "—"
          }
          sub={populationYear ? String(populationYear) : undefined}
        />
        <StatCard
          label="GDP per capita"
          value={
            gdpPerCapita !== null
              ? `$${formatNumber(gdpPerCapita, { compact: true, precision: 1 })}`
              : "—"
          }
          sub={gdpYear ? String(gdpYear) : undefined}
        />
        <StatCard
          label="Life expectancy"
          value={
            lifeExpectancy !== null
              ? formatNumber(lifeExpectancy, { precision: 1 }) + " yrs"
              : "—"
          }
          sub={lifeExpYear ? String(lifeExpYear) : undefined}
        />
        <StatCard
          label="SDG on track"
          value={onTrackPct !== null ? `${onTrackPct}%` : "—"}
          sub={
            totalWithTarget > 0
              ? `${onTrackCount} of ${totalWithTarget} with targets`
              : "no targets"
          }
          valueClass={
            onTrackPct !== null && onTrackPct >= 50 ? "text-positive" : "text-negative"
          }
        />
      </div>

      {/* Coverage summary line */}
      <div className="mt-2 text-[11px] text-secondary">
        Data available for{" "}
        <span className="font-medium text-primary">
          {availableCount} of {totalCount}
        </span>{" "}
        curated indicators
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  valueClass = "text-primary",
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-surface border border-subtle rounded-md px-3.5 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.4px] text-tertiary mb-1">{label}</div>
      <div className={`text-[20px] font-medium tabular-nums leading-tight ${valueClass}`}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-tertiary mt-0.5">{sub}</div>}
    </div>
  );
}
