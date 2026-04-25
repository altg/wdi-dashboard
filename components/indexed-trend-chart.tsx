"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import type { TrendDataPoint } from "@/lib/chart-helpers";
import { useDarkMode } from "@/lib/use-dark-mode";

export type TrendSeries = {
  key: string;
  label: string;
  color: string;
};

export type { TrendDataPoint };

type Props = {
  data: TrendDataPoint[];
  series: TrendSeries[];
  baseYear: number;
};

export function IndexedTrendChart({ data, series, baseYear }: Props) {
  const isDark = useDarkMode();
  const tickFill = isDark ? "#666460" : "#888780";

  return (
    <div>
      <div role="img" aria-label="Regional trend chart, indexed to base year">
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid
            strokeDasharray="2 3"
            stroke={isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}
            vertical={false}
          />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 9, fill: tickFill }}
            axisLine={false}
            tickLine={false}
            tickCount={6}
          />
          <YAxis
            tick={{ fontSize: 9, fill: tickFill }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}`}
            width={28}
          />
          <ReferenceLine
            y={100}
            stroke={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"}
            strokeDasharray="2 2"
            strokeWidth={0.75}
          />
          <Tooltip
            contentStyle={{
              fontSize: 11,
              padding: "4px 8px",
              background: isDark ? "#27271F" : "#fff",
              border: `0.5px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
              borderRadius: 4,
              color: isDark ? "#E8E6DF" : "#1A1A19",
            }}
            formatter={(v, name) => {
              const s = series.find((sr) => sr.key === String(name));
              const num = typeof v === "number" ? v.toFixed(1) : String(v);
              return [num, s?.label ?? String(name)];
            }}
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={1.5}
              dot={false}
              connectNulls={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div
        className="grid gap-x-3 gap-y-0.5 mt-1"
        style={{ gridTemplateColumns: "1fr 1fr" }}
      >
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1 text-[10px] text-secondary">
            <span
              className="inline-block w-2.5 h-0.5 rounded-full shrink-0"
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
