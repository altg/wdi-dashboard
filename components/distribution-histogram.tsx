"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export type { HistogramBin } from "@/lib/chart-helpers";

import type { HistogramBin } from "@/lib/chart-helpers";
import { useDarkMode } from "@/lib/use-dark-mode";

type Props = {
  data: HistogramBin[];
  sdgTarget?: number;
  sdgDirection?: "lower-is-better" | "higher-is-better";
  unit?: string;
};

function binColor(
  min: number,
  sdgTarget: number | undefined,
  sdgDirection: "lower-is-better" | "higher-is-better" | undefined,
  dark: boolean
): string {
  if (!sdgTarget) return dark ? "#3B6A95" : "#A8C4E0";
  // Use 30% of the target as the "near" threshold so colours scale with the indicator's magnitude.
  const band = Math.max(sdgTarget * 0.3, 1);
  if (sdgDirection === "higher-is-better") {
    if (min >= sdgTarget + band) return dark ? "#5A8A3A" : "#8EB96A";
    if (min >= sdgTarget)        return dark ? "#7AAD50" : "#C0DD97";
    if (min >= sdgTarget - band) return dark ? "#C08030" : "#F5C98A";
    if (min >= sdgTarget - band * 3) return dark ? "#B04040" : "#F09595";
    return dark ? "#8A2828" : "#C04040";
  }
  // lower-is-better (default)
  if (min + band <= sdgTarget)   return dark ? "#5A8A3A" : "#8EB96A";
  if (min < sdgTarget)           return dark ? "#7AAD50" : "#C0DD97";
  if (min < sdgTarget + band)    return dark ? "#C08030" : "#F5C98A";
  if (min < sdgTarget + band * 3) return dark ? "#B04040" : "#F09595";
  return dark ? "#8A2828" : "#C04040";
}

export function DistributionHistogram({ data, sdgTarget, sdgDirection, unit }: Props) {
  const isDark = useDarkMode();
  const tickFill = isDark ? "#666460" : "#888780";
  // Show every label when few bins; thin out when many.
  const labelInterval = data.length <= 8 ? 0 : data.length <= 14 ? 1 : 2;

  const targetBin = sdgTarget
    ? data.find((b) => b.min <= sdgTarget && sdgTarget < b.max)
    : undefined;

  return (
    <div role="img" aria-label={`Distribution histogram${sdgTarget ? `, SDG target ${sdgTarget} ${unit ?? ""}` : ""}`}>
    <ResponsiveContainer width="100%" height={80}>
      <BarChart
        data={data}
        margin={{ top: 6, right: 4, bottom: 0, left: 0 }}
        barCategoryGap={2}
      >
        <XAxis
          dataKey="label"
          tick={{ fontSize: 9, fill: tickFill }}
          axisLine={false}
          tickLine={false}
          interval={labelInterval}
        />
        <YAxis hide domain={[0, "dataMax"]} />
        <Tooltip
          formatter={(v) => [`${v} countries`, "Count"]}
          labelFormatter={(l) => `${l} ${unit ?? ""}`}
          contentStyle={{
            fontSize: 11,
            padding: "4px 8px",
            background: isDark ? "#27271F" : "#fff",
            border: `0.5px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
            borderRadius: 4,
            color: isDark ? "#E8E6DF" : "#1A1A19",
          }}
        />
        <Bar dataKey="count" radius={[2, 2, 0, 0]}>
          {data.map((bin) => (
            <Cell key={bin.label} fill={binColor(bin.min, sdgTarget, sdgDirection, isDark)} />
          ))}
        </Bar>
        {targetBin && sdgTarget && (
          <ReferenceLine
            x={targetBin.label}
            stroke={isDark ? "#5B95D4" : "#0C447C"}
            strokeDasharray="3 2"
            strokeWidth={1.5}
            label={{
              value: `SDG ${sdgTarget}`,
              position: "top",
              fontSize: 9,
              fill: isDark ? "#5B95D4" : "#0C447C",
              fontWeight: 500,
            }}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}
