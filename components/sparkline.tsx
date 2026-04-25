"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";

type DataPoint = { year: number; value: number | null };

type Props = {
  data: DataPoint[];
  color?: string;
  width?: number;
  height?: number;
};

export function Sparkline({
  data,
  color = "#888780",
  width = 80,
  height = 16,
}: Props) {
  const chartData = data.map((d) => ({ year: d.year, v: d.value }));

  return (
    // aria-hidden: sparklines are decorative — the table columns provide the data
    <LineChart
      aria-hidden="true"
      width={width}
      height={height}
      data={chartData}
      margin={{ top: 1, right: 1, bottom: 1, left: 1 }}
    >
      <Line
        type="monotone"
        dataKey="v"
        stroke={color}
        strokeWidth={1.2}
        dot={false}
        connectNulls={false}
        isAnimationActive={false}
      />
    </LineChart>
  );
}
