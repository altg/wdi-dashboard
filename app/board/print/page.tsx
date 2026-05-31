"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, ReferenceLine, CartesianGrid } from "recharts";
import { getBoard } from "@/lib/board";
import type { BoardPin } from "@/lib/board";
import { getIndicator } from "@/lib/registry/indicators";
import type { Indicator } from "@/lib/registry/indicators";
import { formatNumber } from "@/lib/format";

// ── Types ─────────────────────────────────────────────────────────────────────

type Observation = {
  countryIso3: string;
  countryName: string;
  indicatorCode: string;
  year: number;
  value: number | null;
};

type PinDetail = {
  pin: BoardPin;
  indicator: Indicator | undefined;
  obs: Observation[];
  latestValue: number | null;
  latestYear: number | null;
  compareYear: number;
  baseValue: number | null;
  delta: number | null;
  pctChange: number | null;
};

// ── Data helpers ──────────────────────────────────────────────────────────────

async function fetchObs(code: string, iso3: string): Promise<Observation[]> {
  try {
    const res = await fetch(`/api/wb/indicator/${encodeURIComponent(code)}?iso3s=${iso3}&from=2000&to=2025`);
    if (!res.ok) return [];
    const data: unknown = await res.json();
    return Array.isArray(data) ? (data as Observation[]) : [];
  } catch {
    return [];
  }
}

function deriveStats(
  obs: Observation[],
  compareYear: number
): Pick<PinDetail, "latestValue" | "latestYear" | "baseValue" | "delta" | "pctChange"> {
  const valid = obs.filter((o) => o.value !== null).sort((a, b) => b.year - a.year);
  const latest = valid[0] ?? null;
  const base = obs.find((o) => o.year === compareYear && o.value !== null) ?? null;
  const latestValue = latest?.value ?? null;
  const latestYear = latest?.year ?? null;
  const baseValue = base?.value ?? null;
  const delta = latestValue !== null && baseValue !== null ? latestValue - baseValue : null;
  const pctChange =
    delta !== null && baseValue !== null && baseValue !== 0
      ? (delta / baseValue) * 100
      : null;
  return { latestValue, latestYear, baseValue, delta, pctChange };
}

function parseCompareYear(params: string | undefined): number {
  if (!params) return 2000;
  const match = new URLSearchParams(params).get("compare");
  const n = match ? parseInt(match, 10) : NaN;
  return isNaN(n) ? 2000 : n;
}

// ── Page component ────────────────────────────────────────────────────────────

export default function BoardPrintPage() {
  const [details, setDetails] = useState<PinDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pins = getBoard();
    if (pins.length === 0) {
      setLoading(false);
      return;
    }
    Promise.all(
      pins.map(async (pin): Promise<PinDetail> => {
        const indicator = getIndicator(pin.indicatorCode);
        const obs = await fetchObs(pin.indicatorCode, pin.iso3);
        const compareYear = parseCompareYear(pin.params);
        return {
          pin,
          indicator,
          obs,
          compareYear,
          ...deriveStats(obs, compareYear),
        };
      })
    ).then((results) => {
      setDetails(results);
      setLoading(false);
    });
  }, []);

  // Auto-open print dialog once data is ready
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [loading]);

  const generatedDate = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      {/* Screen-only toolbar */}
      <div className="print:hidden fixed top-0 left-0 right-0 z-50 bg-surface border-b border-subtle px-4 h-10 flex items-center gap-3">
        <Link href="/board" className="text-[11px] text-info hover:underline">
          ← Back to board
        </Link>
        {loading && (
          <span className="text-[11px] text-tertiary">Loading data…</span>
        )}
        {!loading && (
          <span className="text-[11px] text-tertiary">
            {details.length} pin{details.length === 1 ? "" : "s"} · Print dialog should open automatically.
          </span>
        )}
        <button
          onClick={() => window.print()}
          disabled={loading}
          className="ml-auto h-7 text-[11px] px-3 bg-surface border border-subtle rounded text-secondary hover:text-primary hover:bg-surface-2 transition-colors disabled:opacity-40"
        >
          Print / Save as PDF
        </button>
      </div>

      {/* ── Cover page ─────────────────────────────────────────────────────── */}
      <div className="print:pt-0 pt-12 max-w-4xl mx-auto px-8 py-10">
        <p className="text-[10px] font-mono text-tertiary uppercase tracking-widest mb-8">
          World Bank · World Development Indicators
        </p>
        <h1 className="text-[30px] font-semibold text-primary leading-tight mb-3">
          Pinned Briefing
        </h1>
        <p className="text-[13px] text-secondary mb-10">
          {details.length} indicator{details.length === 1 ? "" : "s"} · Generated {generatedDate}
        </p>

        {/* Summary table on cover */}
        {details.length > 0 && (
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="border-b-2 border-strong">
                <th className="text-left py-1.5 pr-4 font-medium text-secondary">Country</th>
                <th className="text-left py-1.5 pr-4 font-medium text-secondary">Indicator</th>
                <th className="text-right py-1.5 pr-4 font-medium text-secondary">Latest</th>
                <th className="text-right py-1.5 font-medium text-secondary">Change</th>
              </tr>
            </thead>
            <tbody>
              {details.map(({ pin, indicator, latestValue, latestYear, pctChange, compareYear }) => {
                const improving =
                  pctChange !== null && indicator
                    ? indicator.sdgDirection === "lower-is-better"
                      ? pctChange < 0
                      : pctChange > 0
                    : null;
                return (
                  <tr key={pin.id} className="border-b border-subtle">
                    <td className="py-1.5 pr-4 font-medium text-primary">
                      {pin.countryName}{" "}
                      <span className="font-mono text-[9px] text-tertiary">{pin.iso3}</span>
                    </td>
                    <td className="py-1.5 pr-4 text-secondary">
                      {pin.indicatorName}
                    </td>
                    <td className="py-1.5 pr-4 text-right tabular-nums text-primary">
                      {latestValue !== null
                        ? formatNumber(latestValue, { precision: indicator?.precision ?? 1 })
                        : "—"}
                      {latestYear && (
                        <span className="text-tertiary text-[9px] ml-1">({latestYear})</span>
                      )}
                    </td>
                    <td
                      className={`py-1.5 text-right tabular-nums ${
                        improving === true
                          ? "text-positive"
                          : improving === false
                          ? "text-negative"
                          : "text-tertiary"
                      }`}
                    >
                      {pctChange !== null
                        ? `${pctChange > 0 ? "+" : ""}${pctChange.toFixed(0)}% vs ${compareYear}`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {details.length === 0 && !loading && (
          <p className="text-[12px] text-tertiary italic">No pins on this board.</p>
        )}

        <div className="mt-12 pt-4 border-t border-subtle text-[10px] text-tertiary">
          Generated by WDI Dashboard · World Bank Open Data · data.worldbank.org
        </div>
      </div>

      {/* ── One detail page per pin ─────────────────────────────────────────── */}
      {details.map((d, i) => (
        <PinDetailPage key={d.pin.id} detail={d} pageNumber={i + 1} total={details.length} />
      ))}
    </>
  );
}

// ── Detail page ───────────────────────────────────────────────────────────────

function PinDetailPage({
  detail,
  pageNumber,
  total,
}: {
  detail: PinDetail;
  pageNumber: number;
  total: number;
}) {
  const { pin, indicator, obs, latestValue, latestYear, compareYear, baseValue, pctChange } = detail;

  const improving =
    pctChange !== null && indicator
      ? indicator.sdgDirection === "lower-is-better"
        ? pctChange < 0
        : pctChange > 0
      : null;

  // Build chart data — one point per year, sorted ascending
  const chartData = obs
    .filter((o) => o.value !== null)
    .sort((a, b) => a.year - b.year)
    .map((o) => ({ year: o.year, value: o.value as number }));

  const yValues = chartData.map((d) => d.value);
  const yMin = yValues.length ? Math.min(...yValues) : 0;
  const yMax = yValues.length ? Math.max(...yValues) : 100;
  const yPad = (yMax - yMin) * 0.12 || 1;

  const pinnedDate = new Date(pin.pinnedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className="max-w-4xl mx-auto px-8 py-10"
      style={{ breakBefore: "page", pageBreakBefore: "always" }}
    >
      {/* Page header */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b-2 border-strong">
        <div>
          <p className="text-[10px] font-mono text-tertiary uppercase tracking-widest mb-1">
            {indicator?.topic ?? "Indicator"} · {indicator?.sdgTarget ? `SDG ${indicator.sdgTarget}` : pin.indicatorCode}
          </p>
          <h2 className="text-[22px] font-semibold text-primary leading-tight">
            {pin.countryName}
          </h2>
          <p className="text-[13px] text-secondary mt-0.5">{pin.indicatorName}</p>
        </div>
        <div className="text-right shrink-0 ml-6">
          <div className="flex items-baseline gap-1.5 justify-end">
            <span className="text-[32px] font-semibold tabular-nums text-primary leading-none">
              {latestValue !== null
                ? formatNumber(latestValue, { precision: indicator?.precision ?? 1 })
                : "—"}
            </span>
          </div>
          <p className="text-[11px] text-secondary mt-1">{indicator?.unit ?? ""}</p>
          {latestYear && (
            <p className="text-[10px] text-tertiary">Latest: {latestYear}</p>
          )}
          {pctChange !== null && (
            <p
              className={`text-[11px] mt-1 font-medium ${
                improving === true
                  ? "text-positive"
                  : improving === false
                  ? "text-negative"
                  : "text-tertiary"
              }`}
            >
              {improving === true ? "▼" : "▲"} {Math.abs(pctChange).toFixed(1)}% since {compareYear}
              {baseValue !== null && (
                <span className="text-tertiary font-normal ml-1">
                  (was {formatNumber(baseValue, { precision: indicator?.precision ?? 1 })})
                </span>
              )}
            </p>
          )}
          {indicator?.sdgTargetValue !== undefined && (
            <p className="text-[10px] text-tertiary mt-0.5">
              SDG target: {formatNumber(indicator.sdgTargetValue, { precision: indicator.precision })}
            </p>
          )}
        </div>
      </div>

      {/* Trend chart */}
      {chartData.length > 1 ? (
        <div className="mb-6">
          <p className="text-[10px] text-tertiary mb-2 uppercase tracking-wide">
            Trend 2000–{latestYear ?? "present"}
          </p>
          <LineChart
            width={672}
            height={220}
            data={chartData}
            margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.07)" vertical={false} />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 10, fill: "#888780" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(0,0,0,0.12)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin - yPad, yMax + yPad]}
              tick={{ fontSize: 10, fill: "#888780" }}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) =>
                formatNumber(v, { precision: indicator?.precision ?? 1, compact: true })
              }
            />
            {indicator?.sdgTargetValue !== undefined && (
              <ReferenceLine
                y={indicator.sdgTargetValue}
                stroke="#0C447C"
                strokeDasharray="4 3"
                strokeWidth={1}
                label={{
                  value: `SDG ${formatNumber(indicator.sdgTargetValue, { precision: indicator.precision })}`,
                  position: "insideTopRight",
                  fontSize: 9,
                  fill: "#0C447C",
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke="#185FA5"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          </LineChart>
        </div>
      ) : (
        <p className="text-[11px] text-tertiary italic mb-6">No historical trend data available.</p>
      )}

      {/* Metadata footer */}
      <div className="mt-4 pt-3 border-t border-subtle grid grid-cols-3 gap-4 text-[10px] text-tertiary">
        <div>
          <span className="font-medium text-secondary">Source</span>
          <br />
          {indicator?.source ?? "World Bank WDI"}
        </div>
        <div>
          <span className="font-medium text-secondary">Code</span>
          <br />
          <code>{pin.indicatorCode}</code>
        </div>
        <div>
          <span className="font-medium text-secondary">Pinned</span>
          <br />
          {pinnedDate}
        </div>
      </div>

      {/* Page counter (screen only for orientation; print hides with CSS if desired) */}
      <div className="mt-6 text-right text-[9px] text-tertiary">
        {pageNumber} / {total}
      </div>
    </div>
  );
}
