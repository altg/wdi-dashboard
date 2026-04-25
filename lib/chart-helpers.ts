// Pure computation helpers — no browser APIs, safe to call from Server Components.

export type HistogramBin = {
  label: string;
  min: number;
  max: number;
  count: number;
};

/** Round a rough step up to the nearest "nice" value (1/2/5 × 10^n). */
function niceStep(rough: number): number {
  if (rough <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const f = rough / pow;
  const m = f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10;
  return m * pow;
}

function fmtEdge(v: number, step: number): string {
  if (Math.abs(v) >= 1_000_000) return `${+(v / 1_000_000).toPrecision(3)}M`;
  if (Math.abs(v) >= 10_000)    return `${Math.round(v / 1_000)}k`;
  if (Math.abs(v) >= 1_000)     return `${+(v / 1_000).toPrecision(2)}k`;
  if (step < 0.1)               return v.toFixed(2);
  if (step < 1)                 return v.toFixed(1);
  return String(Math.round(v));
}

/**
 * Derive histogram bin definitions from the actual data range.
 * Produces ~targetBins uniformly-wide bins with human-readable edges.
 * The last bin is open-ended (max = Infinity) to catch all values.
 */
export function computeHistogramBins(
  values: number[],
  targetBins = 12
): { label: string; min: number; max: number }[] {
  if (!values.length) return [];

  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (lo === hi) {
    return [{ label: fmtEdge(lo, 1), min: lo - 0.5, max: lo + 0.5 }];
  }

  const step = niceStep((hi - lo) / targetBins);
  const start = Math.floor(lo / step) * step;

  const bins: { label: string; min: number; max: number }[] = [];
  let edge = start;

  while (edge < hi) {
    const next = edge + step;
    const isLast = next > hi;
    bins.push({
      label: isLast
        ? `${fmtEdge(edge, step)}+`
        : `${fmtEdge(edge, step)}–${fmtEdge(next, step)}`,
      min: edge,
      max: isLast ? Infinity : next,
    });
    if (isLast) break;
    edge = next;
  }

  return bins;
}

export function buildHistogramBins(
  values: (number | null)[],
  binDefs: { label: string; min: number; max: number }[]
): HistogramBin[] {
  const bins: HistogramBin[] = binDefs.map((b) => ({ ...b, count: 0 }));
  for (const v of values) {
    if (v === null) continue;
    const bin = bins.find((b) => v >= b.min && v < b.max);
    if (bin) bin.count++;
  }
  return bins;
}

export type TrendDataPoint = {
  year: number;
  [key: string]: number | null;
};

export function buildIndexedTrendData(
  observations: { countryIso3: string; year: number; value: number | null }[],
  seriesKeys: { key: string; iso3: string }[],
  baseYear: number
): TrendDataPoint[] {
  const lookup = new Map<string, Map<number, number | null>>();
  for (const obs of observations) {
    if (!lookup.has(obs.countryIso3)) lookup.set(obs.countryIso3, new Map());
    lookup.get(obs.countryIso3)!.set(obs.year, obs.value);
  }

  const years = Array.from(
    new Set(observations.map((o) => o.year))
  ).sort((a, b) => a - b);

  return years.map((year) => {
    const point: TrendDataPoint = { year };
    for (const { key, iso3 } of seriesKeys) {
      const byYear = lookup.get(iso3);
      const baseVal = byYear?.get(baseYear) ?? null;
      const currVal = byYear?.get(year) ?? null;
      point[key] =
        baseVal !== null && baseVal !== 0 && currVal !== null
          ? Math.round(((currVal / baseVal) * 100) * 10) / 10
          : null;
    }
    return point;
  });
}
