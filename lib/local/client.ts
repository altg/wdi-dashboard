/**
 * Local DuckDB data client — mirrors the interface of lib/wb/client.ts.
 * Only runs server-side (Node.js). Never import from client components.
 */
import type { DuckDBValue } from "@duckdb/node-api";
import { query } from "./db";
import type { Observation, FetchIndicatorOptions } from "../wb/client";

type CountryRow = {
  country_code: string;
  country_name: string;
  region_code: string;
  region_name: string;
  income_code: string;
  income_name: string;
};

// Shape returned by fetchAllCountries (matches WB API schema used in the app)
export type LocalCountry = {
  id: string;
  name: string;
  region: { id: string; value: string };
  incomeLevel: { id: string; value: string };
};

export async function fetchIndicator({
  iso3s,
  code,
  yearRange,
}: FetchIndicatorOptions): Promise<Observation[]> {
  const [fromYear, toYear] = yearRange;

  if (iso3s.length === 1 && iso3s[0] === "all") {
    // Global snapshot — no country filter
    const rows = await query<{
      country_code: string;
      country_name: string;
      year: number;
      value: number;
    }>(
      `SELECT country_code, country_name, year, value
       FROM observations
       WHERE indicator_code = ?
         AND year >= ? AND year <= ?
       ORDER BY country_code, year`,
      [code, fromYear, toYear]
    );
    return rows.map((r) => ({
      countryIso3: r.country_code,
      countryName: r.country_name,
      indicatorCode: code,
      year: Number(r.year),
      value: r.value !== null ? Number(r.value) : null,
    }));
  }

  // Named country/aggregate list
  const placeholders = iso3s.map(() => "?").join(", ");
  const rows = await query<{
    country_code: string;
    country_name: string;
    year: number;
    value: number;
  }>(
    `SELECT country_code, country_name, year, value
     FROM observations
     WHERE indicator_code = ?
       AND country_code IN (${placeholders})
       AND year >= ? AND year <= ?
     ORDER BY country_code, year`,
    [code, ...iso3s, fromYear, toYear] as DuckDBValue[]
  );

  return rows.map((r) => ({
    countryIso3: r.country_code,
    countryName: r.country_name,
    indicatorCode: code,
    year: Number(r.year),
    value: r.value !== null ? Number(r.value) : null,
  }));
}

export async function fetchAllCountries(): Promise<LocalCountry[]> {
  const rows = await query<CountryRow>(
    `SELECT country_code, country_name, region_code, region_name, income_code, income_name
     FROM countries
     ORDER BY country_name`
  );
  return rows.map((r) => ({
    id: r.country_code,
    name: r.country_name,
    region: { id: r.region_code, value: r.region_name },
    incomeLevel: { id: r.income_code, value: r.income_name },
  }));
}
