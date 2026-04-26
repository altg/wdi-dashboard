import { getLatestAvailableYear } from "@/lib/wb/cache";

const MIN_YEAR = 2000;
const MAX_YEAR = 2025;
const FALLBACK_YEAR = 2023;

export async function resolveYearWindow(
  code: string,
  sp: Record<string, string | string[] | undefined>
): Promise<{ selectedYear: number; compareYear: number; latestYear: number }> {
  const latestYear = Math.min(MAX_YEAR, (await getLatestAvailableYear(code)) ?? FALLBACK_YEAR);
  const yearParam = typeof sp.year === "string" ? sp.year : String(latestYear);
  const compareParam = typeof sp.compare === "string" ? sp.compare : String(MIN_YEAR);
  const selectedYear = Math.min(latestYear, Math.max(MIN_YEAR + 1, parseInt(yearParam, 10)));
  const compareYear = Math.min(selectedYear - 1, Math.max(MIN_YEAR, parseInt(compareParam, 10)));
  return { selectedYear, compareYear, latestYear };
}
