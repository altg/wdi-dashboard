export type PolicyEvent = {
  year: number;
  label: string;
};

// Keyed by ISO3 country code. Add more entries as needed.
const COUNTRY_EVENTS: Record<string, PolicyEvent[]> = {
  JOR: [
    { year: 2009, label: "National health reform" },
    { year: 2015, label: "Syria refugee crisis peak" },
  ],
  MAR: [
    { year: 2011, label: "New constitution" },
    { year: 2018, label: "Universal health coverage law" },
  ],
  TUN: [
    { year: 2014, label: "MDG review + new constitution" },
    { year: 2016, label: "Health sector reform" },
  ],
  EGY: [
    { year: 2018, label: "Universal Health Insurance Law" },
  ],
  SAU: [
    { year: 2016, label: "Vision 2030 launched" },
  ],
};

export function getCountryEvents(iso3: string): PolicyEvent[] {
  return COUNTRY_EVENTS[iso3] ?? [];
}
