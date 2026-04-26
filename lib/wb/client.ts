import { WBResponseSchema, WBCountryResponseSchema } from "./schemas";

const WB_BASE = "https://api.worldbank.org/v2";

export type Observation = {
  countryIso3: string;
  countryName: string;
  indicatorCode: string;
  year: number;
  value: number | null;
};

export type FetchIndicatorOptions = {
  iso3s: string[];
  code: string;
  yearRange: [number, number];
  perPage?: number;
};

/** Fetch multiple indicators for a single country in one batched request. */
export async function fetchCountryIndicators(
  iso3: string,
  codes: string[],
  yearRange: [number, number]
): Promise<Observation[]> {
  if (codes.length === 0) return [];
  return fetchIndicator({ iso3s: [iso3], code: codes.join(";"), yearRange, perPage: 1000 });
}

export async function fetchIndicator({
  iso3s,
  code,
  yearRange,
  perPage = 1000,
}: FetchIndicatorOptions): Promise<Observation[]> {
  const countriesParam = iso3s.join(";");
  const dateParam = `${yearRange[0]}:${yearRange[1]}`;
  const url = `${WB_BASE}/country/${countriesParam}/indicator/${code}?format=json&date=${dateParam}&per_page=${perPage}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`WB API error ${res.status} for ${code}`);
  }

  const raw: unknown = await res.json();

  // WB API returns [{message:[...]}] for unknown indicator codes — treat as no data.
  if (
    Array.isArray(raw) &&
    raw.length === 1 &&
    raw[0] !== null &&
    typeof raw[0] === "object" &&
    "message" in (raw[0] as object)
  ) {
    return [];
  }

  const parsed = WBResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`WB API response parse error: ${parsed.error.message}`);
  }

  const [meta, data] = parsed.data;
  if (!data) return [];

  const observations: Observation[] = data.map((obs) => ({
    countryIso3: obs.countryiso3code,
    countryName: obs.country.value,
    indicatorCode: obs.indicator.id,
    year: parseInt(obs.date, 10),
    value: obs.value,
  }));

  // If there are more pages, fetch them all (paginate)
  if (meta.pages > 1) {
    const extraFetches = Array.from({ length: meta.pages - 1 }, (_, i) =>
      fetch(
        `${WB_BASE}/country/${countriesParam}/indicator/${code}?format=json&date=${dateParam}&per_page=${perPage}&page=${i + 2}`
      ).then((r) => r.json())
    );
    const extras = await Promise.all(extraFetches);
    for (const extra of extras) {
      const p = WBResponseSchema.safeParse(extra);
      if (p.success && p.data[1]) {
        for (const obs of p.data[1]) {
          observations.push({
            countryIso3: obs.countryiso3code,
            countryName: obs.country.value,
            indicatorCode: obs.indicator.id,
            year: parseInt(obs.date, 10),
            value: obs.value,
          });
        }
      }
    }
  }

  return observations;
}

export async function fetchLatestYear(code: string): Promise<number | null> {
  const url = `${WB_BASE}/country/WLD/indicator/${code}?format=json&mrv=1&per_page=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const raw: unknown = await res.json();
  if (
    Array.isArray(raw) &&
    raw.length === 1 &&
    typeof raw[0] === "object" &&
    raw[0] !== null &&
    "message" in (raw[0] as object)
  ) return null;
  const parsed = WBResponseSchema.safeParse(raw);
  if (!parsed.success || !parsed.data[1]?.length) return null;
  const year = parseInt(parsed.data[1][0].date, 10);
  return isNaN(year) ? null : year;
}

export async function fetchAllCountries() {
  const url = `${WB_BASE}/country?format=json&per_page=300`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`WB API error ${res.status} fetching countries`);

  const raw: unknown = await res.json();
  const parsed = WBCountryResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`WB country response parse error: ${parsed.error.message}`);
  }

  return parsed.data[1] ?? [];
}
