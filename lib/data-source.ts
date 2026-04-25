/**
 * Routes data fetching to the local DuckDB or the live WB API
 * depending on the DATA_SOURCE environment variable.
 *
 *   DATA_SOURCE=local   → wdidata/wdi.duckdb  (fast, offline)
 *   DATA_SOURCE=api     → api.worldbank.org   (default)
 */
import type { FetchIndicatorOptions, Observation } from "./wb/client";

export const DATA_SOURCE: "local" | "api" =
  process.env.DATA_SOURCE === "local" ? "local" : "api";

export async function fetchIndicator(opts: FetchIndicatorOptions): Promise<Observation[]> {
  if (DATA_SOURCE === "local") {
    const { fetchIndicator: localFetch } = await import("./local/client");
    return localFetch(opts);
  }
  const { fetchIndicator: apiFetch } = await import("./wb/client");
  return apiFetch(opts);
}

export async function fetchAllCountries() {
  if (DATA_SOURCE === "local") {
    const { fetchAllCountries: localFetch } = await import("./local/client");
    return localFetch();
  }
  const { fetchAllCountries: apiFetch } = await import("./wb/client");
  return apiFetch();
}

export async function fetchLatestYear(code: string): Promise<number | null> {
  if (DATA_SOURCE === "local") {
    const { fetchLatestYear: localFetch } = await import("./local/client");
    return localFetch(code);
  }
  const { fetchLatestYear: apiFetch } = await import("./wb/client");
  return apiFetch(code);
}
