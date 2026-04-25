"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { PEER_GROUPS } from "@/lib/registry/peer-groups";

const REGIONS = PEER_GROUPS.filter((pg) => pg.type === "region");
const INCOME_GROUPS = PEER_GROUPS.filter((pg) => pg.type === "income");

const MIN_YEAR = 2000;

type Props = {
  coveragePct?: number | null;
  latestYear?: number;
};

export function FilterBar({ coveragePct, latestYear = 2023 }: Props) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const YEARS = Array.from(
    { length: latestYear - MIN_YEAR + 1 },
    (_, i) => latestYear - i
  );

  const peer = sp.get("peer") ?? "mena";
  const year = sp.get("year") ?? String(latestYear);
  const compare = sp.get("compare") ?? String(MIN_YEAR);

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString());
    params.set(key, value);
    // Keep compare < year
    if (key === "year" && parseInt(compare, 10) >= parseInt(value, 10)) {
      params.set("compare", String(parseInt(value, 10) - 1));
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const selectCls =
    "h-7 text-[12px] px-2 bg-surface border border-subtle rounded text-primary cursor-pointer";

  return (
    <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
      <span className="uppercase text-[10px] tracking-[0.5px] text-tertiary">
        Peer group
      </span>

      <select
        value={peer}
        onChange={(e) => update("peer", e.target.value)}
        className={`${selectCls} min-w-[150px]`}
      >
        <optgroup label="Regions">
          {REGIONS.map((pg) => (
            <option key={pg.id} value={pg.id}>
              {pg.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Income groups">
          {INCOME_GROUPS.map((pg) => (
            <option key={pg.id} value={pg.id}>
              {pg.label}
            </option>
          ))}
        </optgroup>
      </select>

      <span className="ml-2 uppercase text-[10px] tracking-[0.5px] text-tertiary">
        Year
      </span>
      <select
        value={year}
        onChange={(e) => update("year", e.target.value)}
        className={`${selectCls} w-20`}
      >
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <span className="ml-2 uppercase text-[10px] tracking-[0.5px] text-tertiary">
        Compare to
      </span>
      <select
        value={compare}
        onChange={(e) => update("compare", e.target.value)}
        className={`${selectCls} w-20`}
      >
        {YEARS.filter((y) => y < parseInt(year, 10)).map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      {coveragePct !== null && coveragePct !== undefined && coveragePct < 75 && (
        <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-[rgba(186,117,23,0.12)] text-warning">
          ⚠ Only {Math.round(coveragePct)}% of peer group has data for {year}
        </span>
      )}
    </div>
  );
}
