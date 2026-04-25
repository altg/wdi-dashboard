"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { buildCSV, downloadCSV } from "@/lib/csv";
import { Sparkline } from "@/components/sparkline";
import { StatusBadge, sdgStatus } from "@/components/status-badge";
import { formatNumber, formatDelta } from "@/lib/format";
import type { Indicator } from "@/lib/registry/indicators";
import type { PeerGroup } from "@/lib/registry/peer-groups";
import type { Observation } from "@/lib/wb/client";

const HOME_KEY = "wdi_home_country";
const MIN_YEAR = 2000;

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json() as Promise<Observation[]>;
  });


type SortKey = "name" | "current" | "baseline" | "delta" | "pct" | "gap";

type Props = {
  code: string;
  peerGroup: PeerGroup;
  selectedYear: number;
  compareYear: number;
  indicator: Indicator;
  /** Server-prefetched history passed as SWR fallback so the table renders without a client fetch. */
  initialData?: Observation[];
};

export function PeerTable({
  code,
  peerGroup,
  selectedYear,
  compareYear,
  indicator,
  initialData,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("current");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(
    indicator.sdgDirection === "lower-is-better" ? "asc" : "desc"
  );
  const [homeCountry, setHomeCountry] = useState<string>("");
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const setRowRef = useCallback((idx: number) => (el: HTMLTableRowElement | null) => {
    rowRefs.current[idx] = el;
  }, []);
  const router = useRouter();
  const sp = useSearchParams();

  // Load home country from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(HOME_KEY);
    if (stored) setHomeCountry(stored);
  }, []);

  function setHome(iso3: string) {
    setHomeCountry(iso3);
    localStorage.setItem(HOME_KEY, iso3);
  }

  function navigateToCountry(iso3: string, newTab = false) {
    const url = `/indicator/${code}/country/${iso3}?${sp.toString()}`;
    if (newTab) window.open(url, "_blank");
    else router.push(url);
  }

  const aggregateCode = peerGroup.wbAggregateCode ?? "";

  // Include aggregate in the fetch so we get the group average in one call
  const allIso3s = [
    ...peerGroup.countryIso3s,
    ...(aggregateCode ? [aggregateCode] : []),
  ];

  const swrKey =
    allIso3s.length > 0
      ? `/api/wb/indicator/${code}?iso3s=${allIso3s.join(",")}&from=${MIN_YEAR}&to=${selectedYear}`
      : null;

  const { data, error, isLoading } = useSWR<Observation[]>(swrKey, fetcher, {
    fallbackData: initialData,
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  const { rows, aggregateRow } = useMemo(() => {
    if (!data) return { rows: [], aggregateRow: null };

    const isAggregate = (iso3: string) => iso3 === aggregateCode;

    // Group by country
    const byCountry = new Map<string, { name: string; byYear: Map<number, number | null> }>();
    for (const obs of data) {
      if (!byCountry.has(obs.countryIso3)) {
        byCountry.set(obs.countryIso3, { name: obs.countryName, byYear: new Map() });
      }
      byCountry.get(obs.countryIso3)!.byYear.set(obs.year, obs.value);
    }

    const sdgTarget = indicator.sdgTargetValue;
    const dir = indicator.sdgDirection;

    const makeRow = (
      iso3: string,
      entry: { name: string; byYear: Map<number, number | null> }
    ) => {
      const vCurrent = entry.byYear.get(selectedYear) ?? null;
      const vBase = entry.byYear.get(compareYear) ?? null;
      const delta = vCurrent !== null && vBase !== null ? vCurrent - vBase : null;
      const pct =
        delta !== null && vBase !== null && vBase !== 0
          ? (delta / vBase) * 100
          : null;
      const gap =
        sdgTarget !== undefined && vCurrent !== null
          ? dir === "lower-is-better"
            ? vCurrent - sdgTarget
            : sdgTarget - vCurrent
          : null;
      const trend = Array.from(entry.byYear.entries())
        .sort(([a], [b]) => a - b)
        .map(([year, value]) => ({ year, value }));
      return {
        iso3,
        name: entry.name,
        vCurrent,
        vBase,
        delta,
        pct,
        gap,
        trend,
        status: sdgStatus(vCurrent, sdgTarget, dir),
      };
    };

    const countryRows: ReturnType<typeof makeRow>[] = [];
    let aggRow: ReturnType<typeof makeRow> | null = null;

    for (const [iso3, entry] of byCountry.entries()) {
      if (isAggregate(iso3)) {
        if (iso3 === aggregateCode) aggRow = makeRow(iso3, entry);
      } else {
        if (entry.byYear.get(selectedYear) !== undefined) {
          countryRows.push(makeRow(iso3, entry));
        }
      }
    }

    return { rows: countryRows, aggregateRow: aggRow };
  }, [data, selectedYear, compareYear, indicator, aggregateCode]);

  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "current":
          return dir * ((a.vCurrent ?? Infinity) - (b.vCurrent ?? Infinity));
        case "baseline":
          return dir * ((a.vBase ?? Infinity) - (b.vBase ?? Infinity));
        case "delta":
          return dir * ((a.delta ?? Infinity) - (b.delta ?? Infinity));
        case "pct":
          return dir * ((a.pct ?? Infinity) - (b.pct ?? Infinity));
        case "gap":
          return dir * ((a.gap ?? Infinity) - (b.gap ?? Infinity));
        default:
          return 0;
      }
    });
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(
        key === "name"
          ? "asc"
          : indicator.sdgDirection === "lower-is-better"
          ? "asc"
          : "desc"
      );
    }
  }

  function handleDownloadCSV() {
    const headers = [
      "Country", "ISO3",
      String(selectedYear), String(compareYear),
      "Delta (abs)", "Delta (%)",
      "Gap to SDG", "Status",
    ];
    const dataRows = sortedRows.map((row) => [
      row.name, row.iso3,
      row.vCurrent, row.vBase,
      row.delta, row.pct !== null ? row.pct.toFixed(1) : null,
      row.gap, row.status,
    ]);
    if (aggregateRow) {
      dataRows.push([
        `${peerGroup.label} avg`, aggregateCode,
        aggregateRow.vCurrent, aggregateRow.vBase,
        aggregateRow.delta, aggregateRow.pct !== null ? aggregateRow.pct.toFixed(1) : null,
        null, null,
      ]);
    }
    const csv = buildCSV(headers, dataRows);
    downloadCSV(`wdi-${code}-${peerGroup.id}-${selectedYear}.csv`, csv);
  }

  const p = indicator.precision;
  const dir = indicator.sdgDirection;

  function arrow(key: SortKey) {
    if (sortKey !== key) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  const thCls =
    "px-3.5 py-1.5 text-[10px] uppercase tracking-[0.4px] text-secondary font-normal bg-surface-2 cursor-pointer select-none hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-info";

  function ariaSortAttr(key: SortKey): "ascending" | "descending" | "none" {
    if (sortKey !== key) return "none";
    return sortDir === "asc" ? "ascending" : "descending";
  }

  function thKeyDown(key: SortKey) {
    return (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleSort(key); }
    };
  }

  if (error) {
    const msg = (error as Error).message ?? "";
    const friendlyError = msg.includes("502") || msg.includes("503")
      ? "World Bank API is temporarily unavailable. Try again in a few minutes."
      : msg.includes("404")
      ? "No data found for this indicator and peer group."
      : msg.toLowerCase().includes("failed to fetch") || msg.toLowerCase().includes("network")
      ? "Could not reach the World Bank API — check your connection."
      : `Data fetch failed: ${msg}`;

    return (
      <div className="bg-surface border border-subtle rounded-md p-6 text-center mb-2">
        <div className="text-[13px] text-negative mb-1">⚠ {friendlyError}</div>
        <button
          onClick={() => window.location.reload()}
          className="text-[12px] text-info underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-subtle rounded-md mb-2">
      {/* Header */}
      <div className="px-3.5 py-2.5 flex justify-between items-center border-b border-subtle">
        <div className="font-medium text-primary">
          Peer group · {peerGroup.label}
          {!isLoading && ` (${sortedRows.length} economies)`}
        </div>
        <div className="flex items-center gap-3">
          {isLoading && (
            <span className="text-[11px] text-tertiary animate-pulse">
              Loading…
            </span>
          )}
          {!isLoading && sortedRows.length > 0 && (
            <button
              onClick={handleDownloadCSV}
              className="text-[11px] text-secondary hover:text-primary px-2 h-6 border border-subtle rounded bg-surface hover:bg-surface-2 transition-colors"
              title="Download peer table as CSV"
            >
              ↓ CSV
            </button>
          )}
          {/* Settings gear — home country picker */}
          <div className="relative group">
            <button
              title="Set home country"
              className="text-[11px] text-tertiary hover:text-secondary px-1"
            >
              ⚙ Home
            </button>
            <div className="absolute right-0 top-6 z-10 hidden group-hover:block bg-surface border border-subtle rounded shadow-sm min-w-[160px] max-h-60 overflow-y-auto">
              {sortedRows.map((row) => (
                <button
                  key={row.iso3}
                  onClick={() => setHome(row.iso3)}
                  className={`block w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-2 ${
                    homeCountry === row.iso3 ? "text-info font-medium" : "text-primary"
                  }`}
                >
                  {row.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr>
            <th
              className={`${thCls} text-left w-[22%]`}
              tabIndex={0}
              aria-sort={ariaSortAttr("name")}
              onClick={() => toggleSort("name")}
              onKeyDown={thKeyDown("name")}
              scope="col"
            >
              Country{arrow("name")}
            </th>
            <th
              className={`${thCls} text-right w-[10%]`}
              tabIndex={0}
              aria-sort={ariaSortAttr("current")}
              onClick={() => toggleSort("current")}
              onKeyDown={thKeyDown("current")}
              scope="col"
            >
              {selectedYear}{arrow("current")}
            </th>
            <th
              className={`${thCls} text-right w-[10%]`}
              tabIndex={0}
              aria-sort={ariaSortAttr("baseline")}
              onClick={() => toggleSort("baseline")}
              onKeyDown={thKeyDown("baseline")}
              scope="col"
            >
              {compareYear}{arrow("baseline")}
            </th>
            <th
              className={`${thCls} text-right w-[10%]`}
              tabIndex={0}
              aria-sort={ariaSortAttr("delta")}
              onClick={() => toggleSort("delta")}
              onKeyDown={thKeyDown("delta")}
              scope="col"
            >
              Δ abs{arrow("delta")}
            </th>
            <th
              className={`${thCls} text-right w-[10%]`}
              tabIndex={0}
              aria-sort={ariaSortAttr("pct")}
              onClick={() => toggleSort("pct")}
              onKeyDown={thKeyDown("pct")}
              scope="col"
            >
              Δ %{arrow("pct")}
            </th>
            <th className={`${thCls} text-left w-[15%] cursor-default`} scope="col">
              Trend
            </th>
            <th
              className={`${thCls} text-right w-[12%]`}
              tabIndex={0}
              aria-sort={ariaSortAttr("gap")}
              onClick={() => toggleSort("gap")}
              onKeyDown={thKeyDown("gap")}
              scope="col"
            >
              Gap to SDG{arrow("gap")}
            </th>
            <th className={`${thCls} text-center w-[11%] cursor-default`} scope="col">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-t border-subtle">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-3.5 py-2">
                      <div className="h-3 bg-surface-2 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            : sortedRows.length === 0
            ? (
                <tr>
                  <td colSpan={8} className="px-3.5 py-6 text-center text-[12px] text-tertiary">
                    No data available for this peer group in {selectedYear}.
                  </td>
                </tr>
              )
            : sortedRows.map((row, idx) => {
                const isHome = homeCountry === row.iso3;
                const isImproving =
                  row.delta !== null
                    ? dir === "lower-is-better"
                      ? row.delta < 0
                      : row.delta > 0
                    : false;
                const deltaClass = isImproving ? "text-positive" : row.delta !== null ? "text-negative" : "text-tertiary";
                const sparkColor =
                  row.status === "on-track"
                    ? "#3B6D11"
                    : row.status === "near"
                    ? "#BA7517"
                    : "#A32D2D";

                return (
                  <tr
                    key={row.iso3}
                    ref={setRowRef(idx)}
                    onClick={(e) => navigateToCountry(row.iso3, e.metaKey || e.ctrlKey)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") navigateToCountry(row.iso3, false);
                      if (e.key === " ") { e.preventDefault(); navigateToCountry(row.iso3, false); }
                      if (e.key === "ArrowDown") { e.preventDefault(); rowRefs.current[idx + 1]?.focus(); }
                      if (e.key === "ArrowUp") { e.preventDefault(); rowRefs.current[idx - 1]?.focus(); }
                    }}
                    tabIndex={0}
                    role="row"
                    aria-label={`${row.name} — click to open country drilldown`}
                    className={`border-t border-subtle hover:bg-surface-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-inset ${
                      isHome
                        ? "bg-[rgba(24,95,165,0.04)] border-l-2 border-l-chart-1"
                        : ""
                    }`}
                  >
                    <td
                      className={`px-3.5 py-1.5 ${isHome ? "font-medium text-primary" : "text-primary"}`}
                    >
                      {row.name}
                    </td>
                    <td className="px-3.5 py-1.5 text-right tabular-nums text-primary font-medium">
                      {row.vCurrent !== null
                        ? formatNumber(row.vCurrent, { precision: p })
                        : "—"}
                    </td>
                    <td className="px-3.5 py-1.5 text-right tabular-nums text-secondary">
                      {row.vBase !== null
                        ? formatNumber(row.vBase, { precision: p })
                        : "—"}
                    </td>
                    <td className={`px-3.5 py-1.5 text-right tabular-nums ${deltaClass}`}>
                      {row.delta !== null
                        ? formatDelta(row.delta, { precision: p })
                        : "—"}
                    </td>
                    <td className={`px-3.5 py-1.5 text-right tabular-nums ${deltaClass}`}>
                      {row.pct !== null
                        ? formatDelta(row.pct, { precision: 0 }) + "%"
                        : "—"}
                    </td>
                    <td className="px-3.5 py-1.5">
                      <Sparkline
                        data={row.trend}
                        color={sparkColor}
                        width={80}
                        height={14}
                      />
                    </td>
                    <td className="px-3.5 py-1.5 text-right tabular-nums">
                      {row.gap !== null ? (
                        row.gap <= 0 ? (
                          <span className="text-positive">met</span>
                        ) : (
                          <span className="text-warning">
                            +{formatNumber(row.gap, { precision: 0 })}
                          </span>
                        )
                      ) : (
                        <span className="text-tertiary">—</span>
                      )}
                    </td>
                    <td className="px-3.5 py-1.5 text-center">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                );
              })}

          {/* Aggregate footer row */}
          {!isLoading && aggregateRow && (
            <tr className="border-t border-subtle italic bg-surface-2">
              <td className="px-3.5 py-1.5 text-secondary">
                {peerGroup.label} avg
              </td>
              <td className="px-3.5 py-1.5 text-right tabular-nums text-secondary">
                {aggregateRow.vCurrent !== null
                  ? formatNumber(aggregateRow.vCurrent, { precision: p })
                  : "—"}
              </td>
              <td className="px-3.5 py-1.5 text-right tabular-nums text-secondary">
                {aggregateRow.vBase !== null
                  ? formatNumber(aggregateRow.vBase, { precision: p })
                  : "—"}
              </td>
              <td className="px-3.5 py-1.5 text-right tabular-nums text-secondary">
                {aggregateRow.delta !== null
                  ? formatDelta(aggregateRow.delta, { precision: p })
                  : "—"}
              </td>
              <td className="px-3.5 py-1.5 text-right tabular-nums text-secondary">
                {aggregateRow.pct !== null
                  ? formatDelta(aggregateRow.pct, { precision: 0 }) + "%"
                  : "—"}
              </td>
              <td colSpan={3} />
            </tr>
          )}
        </tbody>
      </table>

      <div className="px-3.5 py-1.5 text-[11px] text-secondary border-t border-subtle bg-surface-2">
        {sortedRows.length} economies · {selectedYear} vs {compareYear}
        {indicator.coverageNote ? ` · ${indicator.coverageNote}` : ""}
      </div>
    </div>
  );
}
