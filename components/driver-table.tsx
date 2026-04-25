import { formatNumber } from "@/lib/format";

export type DriverRow = {
  code: string;
  name: string;
  unit: string;
  countryValue: number | null;
  peerMedian: number | null;
  peerMin: number | null;
  peerMax: number | null;
  sdgDirection: "lower-is-better" | "higher-is-better";
  precision: number;
};

type Props = {
  rows: DriverRow[];
  countryName: string;
  peerGroupLabel: string;
  peerCount: number;
};

const TRACK_W = 110;
const TRACK_PAD = 5;

function toPx(value: number, min: number, max: number): number {
  if (max === min) return TRACK_PAD + TRACK_W / 2;
  return TRACK_PAD + ((value - min) / (max - min)) * TRACK_W;
}

function dotColor(
  country: number,
  median: number,
  dir: "lower-is-better" | "higher-is-better"
): string {
  const rel = Math.abs(country - median) / (Math.abs(median) || 1);
  const isBetter =
    dir === "lower-is-better" ? country < median : country > median;
  if (rel < 0.05) return "#BA7517";
  if (isBetter) return "#3B6D11";
  return "#A32D2D";
}

function TickMark({
  row,
}: {
  row: DriverRow;
}) {
  const { countryValue: cv, peerMedian: pm, peerMin, peerMax } = row;
  if (cv === null || pm === null || peerMin === null || peerMax === null) {
    return <span className="text-tertiary text-[11px]">—</span>;
  }

  const allMin = Math.min(peerMin, cv);
  const allMax = Math.max(peerMax, cv);
  const medPx = toPx(pm, allMin, allMax);
  const dotPx = toPx(cv, allMin, allMax);
  const color = dotColor(cv, pm, row.sdgDirection);

  return (
    <svg
      viewBox={`0 0 ${TRACK_W + TRACK_PAD * 2} 12`}
      width={TRACK_W + TRACK_PAD * 2}
      height={12}
      className="overflow-visible"
    >
      {/* track */}
      <line
        x1={TRACK_PAD}
        y1={6}
        x2={TRACK_PAD + TRACK_W}
        y2={6}
        stroke="var(--svg-track)"
        strokeWidth={0.75}
      />
      {/* median tick */}
      <line
        x1={medPx}
        y1={2}
        x2={medPx}
        y2={10}
        stroke="#888780"
        strokeWidth={1.5}
      />
      {/* country dot */}
      <circle cx={dotPx} cy={6} r={3.5} fill={color} />
    </svg>
  );
}

export function DriverTable({ rows, countryName, peerGroupLabel, peerCount }: Props) {
  if (rows.length === 0) {
    return (
      <div className="bg-surface border border-subtle rounded-md p-3.5 text-[12px] text-tertiary">
        No driver indicators defined for this indicator.
      </div>
    );
  }

  return (
    <div className="bg-surface border border-subtle rounded-md">
      <div className="px-3.5 py-2.5 flex justify-between items-baseline border-b border-subtle">
        <div className="font-medium text-primary">Associated drivers · {countryName} vs peer median</div>
        <div className="text-[10px] text-tertiary font-mono">
          {peerGroupLabel}, n={peerCount}
        </div>
      </div>

      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr>
            <th className="px-3.5 py-1.5 text-left text-[10px] uppercase tracking-[0.4px] text-secondary font-normal bg-surface-2 w-[38%]">
              Indicator
            </th>
            <th className="px-3.5 py-1.5 text-right text-[10px] uppercase tracking-[0.4px] text-secondary font-normal bg-surface-2 w-[16%]">
              {countryName}
            </th>
            <th className="px-3.5 py-1.5 text-right text-[10px] uppercase tracking-[0.4px] text-secondary font-normal bg-surface-2 w-[16%]">
              Peer median
            </th>
            <th className="px-3.5 py-1.5 text-center text-[10px] uppercase tracking-[0.4px] text-secondary font-normal bg-surface-2 w-[30%]">
              Position
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.code} className="border-t border-subtle hover:bg-surface-2 transition-colors">
              <td className="px-3.5 py-2 text-primary leading-tight">
                <div>{row.name}</div>
                <div className="text-[10px] text-tertiary font-mono mt-0.5">{row.unit}</div>
              </td>
              <td className="px-3.5 py-2 text-right tabular-nums font-medium text-primary">
                {row.countryValue !== null
                  ? formatNumber(row.countryValue, { precision: row.precision })
                  : "—"}
              </td>
              <td className="px-3.5 py-2 text-right tabular-nums text-secondary">
                {row.peerMedian !== null
                  ? formatNumber(row.peerMedian, { precision: row.precision })
                  : "—"}
              </td>
              <td className="px-3.5 py-2 flex justify-center">
                <TickMark row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="px-3.5 py-1.5 text-[10px] text-tertiary border-t border-subtle bg-surface-2">
        Tick mark = peer median. Dot = {countryName}&apos;s value on same scale.
        <span className="ml-3 text-[#3B6D11]">● better</span>
        <span className="ml-2 text-[#BA7517]">● near median</span>
        <span className="ml-2 text-[#A32D2D]">● worse</span>
      </div>
    </div>
  );
}
