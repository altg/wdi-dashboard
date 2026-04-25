"use client";

import { useState, useMemo, useRef } from "react";
import { useDarkMode } from "@/lib/use-dark-mode";
import useSWR from "swr";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
} from "recharts";
import { formatNumber } from "@/lib/format";
import type { Indicator } from "@/lib/registry/indicators";
import type { PolicyEvent } from "@/lib/registry/events";
import type { Observation } from "@/lib/wb/client";

const MIN_YEAR = 2000;
const MAX_YEAR = 2023;

type PeerOption = { iso3: string; name: string };

type Props = {
  indicator: Indicator;
  countryIso3: string;
  countryName: string;
  countryObs: Observation[];
  regionObs: Observation[];
  regionLabel: string;
  incomeGroupObs: Observation[];
  incomeGroupLabel: string;
  peerOptions: PeerOption[];
  defaultPeer1: string;
  defaultPeer2: string;
  events: PolicyEvent[];
};

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API ${r.status}`);
    return r.json() as Promise<Observation[]>;
  });

function buildPoint(
  year: number,
  byIso: Map<string, Map<number, number | null>>,
  keys: { key: string; iso3: string }[]
): Record<string, number | null | number> {
  const pt: Record<string, number | null | number> = { year };
  for (const { key, iso3 } of keys) {
    pt[key] = byIso.get(iso3)?.get(year) ?? null;
  }
  return pt;
}

function obsToByIso(obs: Observation[]): Map<string, Map<number, number | null>> {
  const m = new Map<string, Map<number, number | null>>();
  for (const o of obs) {
    if (!m.has(o.countryIso3)) m.set(o.countryIso3, new Map());
    m.get(o.countryIso3)!.set(o.year, o.value);
  }
  return m;
}

export function TrajectoryChart({
  indicator,
  countryIso3,
  countryName,
  countryObs,
  regionObs,
  regionLabel,
  incomeGroupObs,
  incomeGroupLabel,
  peerOptions,
  defaultPeer1,
  defaultPeer2,
  events,
}: Props) {
  const [peer1, setPeer1] = useState(defaultPeer1);
  const [peer2, setPeer2] = useState(defaultPeer2);
  const [downloading, setDownloading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const isDark = useDarkMode();

  const peer1Name = peerOptions.find((p) => p.iso3 === peer1)?.name ?? peer1;
  const peer2Name = peerOptions.find((p) => p.iso3 === peer2)?.name ?? peer2;

  const swrKey1 = peer1
    ? `/api/wb/indicator/${indicator.code}?iso3s=${peer1}&from=${MIN_YEAR}&to=${MAX_YEAR}`
    : null;
  const swrKey2 = peer2
    ? `/api/wb/indicator/${indicator.code}?iso3s=${peer2}&from=${MIN_YEAR}&to=${MAX_YEAR}`
    : null;

  const { data: peer1Data, isLoading: peer1Loading, error: peer1Error } = useSWR<Observation[]>(swrKey1, fetcher, {
    dedupingInterval: 60_000,
    revalidateOnFocus: false,
  });
  const { data: peer2Data, isLoading: peer2Loading, error: peer2Error } = useSWR<Observation[]>(swrKey2, fetcher, {
    dedupingInterval: 60_000,
    revalidateOnFocus: false,
  });

  const chartData = useMemo(() => {
    const byIso = new Map<string, Map<number, number | null>>();

    for (const [iso, src] of [
      [countryIso3, countryObs],
      [regionLabel, regionObs],
      [incomeGroupLabel, incomeGroupObs],
      ...(peer1Data ? [[peer1, peer1Data]] : []),
      ...(peer2Data ? [[peer2, peer2Data]] : []),
    ] as [string, Observation[]][]) {
      for (const o of src) {
        if (!byIso.has(iso)) byIso.set(iso, new Map());
        byIso.get(iso)!.set(o.year, o.value);
      }
    }

    const keys = [
      { key: "country", iso3: countryIso3 },
      { key: "region", iso3: regionLabel },
      { key: "incomeGroup", iso3: incomeGroupLabel },
      ...(peer1 ? [{ key: "peer1", iso3: peer1 }] : []),
      ...(peer2 ? [{ key: "peer2", iso3: peer2 }] : []),
    ];

    return Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => {
      const year = MIN_YEAR + i;
      return buildPoint(year, byIso, keys);
    });
  }, [countryIso3, countryObs, regionObs, regionLabel, incomeGroupObs, incomeGroupLabel, peer1, peer1Data, peer2, peer2Data]);

  async function handleDownloadPNG() {
    if (!chartRef.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(chartRef.current, { backgroundColor: "#fff", pixelRatio: 2 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${countryName.replace(/\s+/g, "-")}-${indicator.code}.png`;
      a.click();
    } finally {
      setDownloading(false);
    }
  }

  const selectCls =
    "h-6 text-[11px] px-1.5 bg-surface border border-subtle rounded text-primary cursor-pointer";

  return (
    <div className="bg-surface border border-subtle rounded-md p-3.5 mb-2">
      {/* Header row */}
      <div className="flex justify-between items-start mb-2">
        <div className="font-medium text-primary">
          Trajectory vs benchmarks · {MIN_YEAR}–{MAX_YEAR}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            onClick={handleDownloadPNG}
            disabled={downloading}
            className="h-6 text-[11px] px-2 border border-subtle rounded bg-surface text-secondary hover:text-primary hover:bg-surface-2 transition-colors disabled:opacity-50"
            title="Download chart as PNG"
          >
            {downloading ? "…" : "↓ PNG"}
          </button>
          {/* Peer selectors */}
          <span className="text-[10px] uppercase tracking-[0.4px] text-tertiary">Compare:</span>
          <select
            value={peer1}
            onChange={(e) => setPeer1(e.target.value)}
            className={selectCls}
          >
            <option value="">— none —</option>
            {peerOptions.map((p) => (
              <option key={p.iso3} value={p.iso3}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={peer2}
            onChange={(e) => setPeer2(e.target.value)}
            className={selectCls}
          >
            <option value="">— none —</option>
            {peerOptions.map((p) => (
              <option key={p.iso3} value={p.iso3}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div ref={chartRef}>
      <div role="img" aria-label={`Trajectory chart for ${countryName} — ${indicator.name}, ${MIN_YEAR}–${MAX_YEAR}`}>
        <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 8, right: 48, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="2 3" stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"} vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 9, fill: isDark ? "#666460" : "#888780" }}
            axisLine={false}
            tickLine={false}
            tickCount={8}
          />
          <YAxis
            tick={{ fontSize: 9, fill: isDark ? "#666460" : "#888780" }}
            axisLine={false}
            tickLine={false}
            width={32}
            tickFormatter={(v: number) =>
              formatNumber(v, { precision: indicator.precision < 1 ? 0 : 1, compact: true })
            }
          />

          {/* SDG target */}
          {indicator.sdgTargetValue !== undefined && (
            <ReferenceLine
              y={indicator.sdgTargetValue}
              stroke="#185FA5"
              strokeWidth={1}
              strokeDasharray="3 3"
            >
              <Label
                value={`SDG ${indicator.sdgTarget ?? "target"}: ${indicator.sdgTargetValue}`}
                position="right"
                fontSize={9}
                fill="#185FA5"
                offset={4}
              />
            </ReferenceLine>
          )}

          {/* Event annotations */}
          {events.map((ev) => (
            <ReferenceLine
              key={ev.year}
              x={ev.year}
              stroke={isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)"}
              strokeWidth={0.75}
              strokeDasharray="1 2"
            >
              <Label
                value={`${ev.year} · ${ev.label}`}
                position="insideTopRight"
                fontSize={9}
                fill="#888780"
                offset={4}
              />
            </ReferenceLine>
          ))}

          <Tooltip
            contentStyle={{
              fontSize: 11,
              padding: "4px 8px",
              background: isDark ? "#27271F" : "#fff",
              border: `0.5px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
              borderRadius: 4,
              color: isDark ? "#E8E6DF" : "#1A1A19",
            }}
            formatter={(v: unknown, key: unknown) => {
              const val = typeof v === "number" ? formatNumber(v, { precision: indicator.precision }) : "—";
              const labels: Record<string, string> = {
                country: countryName,
                region: regionLabel,
                incomeGroup: incomeGroupLabel,
                peer1: peer1Name,
                peer2: peer2Name,
              };
              return [val, labels[String(key)] ?? String(key)];
            }}
          />

          {/* Income group — dashed thin */}
          <Line
            type="monotone"
            dataKey="incomeGroup"
            stroke="#B4B2A9"
            strokeWidth={1}
            strokeDasharray="4 3"
            dot={false}
            connectNulls
          />
          {/* Region avg */}
          <Line
            type="monotone"
            dataKey="region"
            stroke="#888780"
            strokeWidth={1.2}
            dot={false}
            connectNulls
          />
          {/* Peer 2 */}
          {peer2 && (
            <Line
              type="monotone"
              dataKey="peer2"
              stroke="#D85A30"
              strokeWidth={1.2}
              dot={false}
              connectNulls
            />
          )}
          {/* Peer 1 */}
          {peer1 && (
            <Line
              type="monotone"
              dataKey="peer1"
              stroke="#185FA5"
              strokeWidth={1.2}
              dot={false}
              connectNulls
            />
          )}
          {/* Home country — heaviest, on top */}
          <Line
            type="monotone"
            dataKey="country"
            stroke="#0C447C"
            strokeWidth={2.2}
            dot={false}
            connectNulls
          />
        </LineChart>
        </ResponsiveContainer>
      </div> {/* end role=img */}

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {[
          { label: countryName, color: "#0C447C", dash: false, width: 2.2 },
          { label: regionLabel, color: "#888780", dash: false, width: 1.2 },
          { label: incomeGroupLabel, color: "#B4B2A9", dash: true, width: 1 },
          ...(peer1 ? [{ label: peer1Name, color: "#185FA5", dash: false, width: 1.2 }] : []),
          ...(peer2 ? [{ label: peer2Name, color: "#D85A30", dash: false, width: 1.2 }] : []),
        ].map((s) => (
          <span key={s.label} className="flex items-center gap-1 text-[10px] text-secondary">
            <svg width="14" height="6" viewBox="0 0 14 6">
              <line
                x1="0"
                y1="3"
                x2="14"
                y2="3"
                stroke={s.color}
                strokeWidth={s.width}
                strokeDasharray={s.dash ? "3 2" : undefined}
              />
            </svg>
            {s.label}
          </span>
        ))}
        {/* Peer loading / error indicators */}
        {peer1 && peer1Loading && (
          <span className="text-[10px] text-tertiary animate-pulse ml-2">Loading {peer1Name}…</span>
        )}
        {peer2 && peer2Loading && (
          <span className="text-[10px] text-tertiary animate-pulse ml-2">Loading {peer2Name}…</span>
        )}
        {peer1 && peer1Error && (
          <span className="text-[10px] text-negative ml-2">⚠ Could not load {peer1Name}</span>
        )}
        {peer2 && peer2Error && (
          <span className="text-[10px] text-negative ml-2">⚠ Could not load {peer2Name}</span>
        )}
      </div>
      </div> {/* end chartRef */}
    </div>
  );
}

