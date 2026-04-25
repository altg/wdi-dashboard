import { unstable_cache } from "next/cache";
import { fetchIndicator, fetchAllCountries } from "../data-source";

const MIN_YEAR = 2000;
const MAX_YEAR = 2023;

const TTL = { revalidate: 3600 } as const;

/**
 * Full year-range history for a single country / aggregate.
 * Key: ch:{code}:{iso3}  — shared across all pages that need this country's trajectory.
 */
export function getCountryHistory(indicatorCode: string, iso3: string) {
  return unstable_cache(
    () =>
      fetchIndicator({
        iso3s: [iso3],
        code: indicatorCode,
        yearRange: [MIN_YEAR, MAX_YEAR],
      }),
    [`ch:${indicatorCode}:${iso3}`],
    TTL
  )();
}

/**
 * Full year-range history for a peer group (countries + optional aggregate code).
 * Key: pgh:{code}:{groupId}:{toYear}  — shared across the page and peer table.
 * Replaces the two single-year getPeerGroupSnapshot calls: stat cards derive their
 * values by filtering this data by year, and PeerTable receives it as fallbackData.
 */
export function getPeerGroupHistory(
  indicatorCode: string,
  groupId: string,
  iso3s: string[],
  toYear: number
) {
  return unstable_cache(
    () =>
      fetchIndicator({
        iso3s,
        code: indicatorCode,
        yearRange: [MIN_YEAR, toYear],
      }),
    [`pgh:${indicatorCode}:${groupId}:${toYear}`],
    TTL
  )();
}

/**
 * Single-year snapshot for a named peer group.
 * Key: pgs:{code}:{groupId}:{year}  — shared regardless of which home country is viewing.
 */
export function getPeerGroupSnapshot(
  indicatorCode: string,
  groupId: string,
  iso3s: string[],
  year: number
) {
  return unstable_cache(
    () =>
      fetchIndicator({
        iso3s,
        code: indicatorCode,
        yearRange: [year, year],
      }),
    [`pgs:${indicatorCode}:${groupId}:${year}`],
    TTL
  )();
}

/**
 * All countries, single year — used for global distribution histogram.
 * Key: gs:{code}:{year}
 */
export function getGlobalSnapshot(indicatorCode: string, year: number) {
  return unstable_cache(
    () =>
      fetchIndicator({
        iso3s: ["all"],
        code: indicatorCode,
        yearRange: [year, year],
        perPage: 500,
      }),
    [`gs:${indicatorCode}:${year}`],
    TTL
  )();
}

/**
 * Full year-range data for a set of regional aggregates.
 * Key: rt:{code}  — regionIso3s are always the same TREND_SERIES set.
 */
export function getRegionTrend(indicatorCode: string, regionIso3s: string[]) {
  return unstable_cache(
    () =>
      fetchIndicator({
        iso3s: regionIso3s,
        code: indicatorCode,
        yearRange: [MIN_YEAR, MAX_YEAR],
      }),
    [`rt:${indicatorCode}`],
    TTL
  )();
}

/**
 * WB country metadata — rarely changes, long TTL is fine.
 * Key: countries
 */
export const getCachedCountries = unstable_cache(
  () => fetchAllCountries(),
  ["countries"],
  TTL
);
