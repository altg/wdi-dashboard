type FormatNumberOptions = {
  precision?: number;
  compact?: boolean;
};

export function formatNumber(
  value: number | null | undefined,
  options: FormatNumberOptions = {}
): string {
  if (value === null || value === undefined) return "—";

  const { precision = 1, compact = false } = options;

  if (compact && Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(precision)}B`;
  }
  if (compact && Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(precision)}M`;
  }
  if (compact && Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(precision)}K`;
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value);
}

export function formatPercent(
  value: number | null | undefined,
  precision = 1
): string {
  if (value === null || value === undefined) return "—";
  return `${formatNumber(value, { precision })}%`;
}

type DeltaOptions = {
  precision?: number;
  showSign?: boolean;
};

export function formatDelta(
  value: number | null | undefined,
  options: DeltaOptions = {}
): string {
  if (value === null || value === undefined) return "—";
  const { precision = 1, showSign = true } = options;
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, { precision })}`;
}

export function formatYear(year: number | null | undefined): string {
  if (year === null || year === undefined) return "—";
  return String(year);
}

type CitationOptions = {
  indicatorName: string;
  indicatorCode: string;
  source: string;
  retrievedDate?: string;
};

export function formatCitation({
  indicatorName,
  indicatorCode,
  source,
  retrievedDate,
}: CitationOptions): string {
  const date =
    retrievedDate ?? new Date().toISOString().split("T")[0];
  return `${indicatorName} (WDI code ${indicatorCode}). Source: ${source}. Retrieved ${date} from World Bank Open Data (https://data.worldbank.org).`;
}
