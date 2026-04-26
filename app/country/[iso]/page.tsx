import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCachedCountries, getCountryAllIndicators } from "@/lib/wb/cache";
import { INDICATORS } from "@/lib/registry/indicators";
import { TOPIC_ORDER, TOPIC_COLORS } from "@/lib/topics";
import { sdgStatus } from "@/components/status-badge";
import { CountryProfileHeader } from "@/components/country-profile-header";
import { IndicatorTile } from "@/components/indicator-tile";
import { Breadcrumb } from "@/components/breadcrumb";
import type { Observation } from "@/lib/wb/client";

const POP_CODE = "SP.POP.TOTL";
const GDP_CODE = "NY.GDP.PCAP.CD";
const LE_CODE = "SP.DYN.LE00.IN";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ iso: string }>;
}): Promise<Metadata> {
  const { iso } = await params;
  const countries = await getCachedCountries().catch(() => []);
  const meta = countries.find((c) => c.id === iso);
  if (!meta) return { title: "Country Profile — WDI Dashboard" };
  return { title: `${meta.name} — Country Profile — WDI Dashboard` };
}

/** Latest non-null value from an array of observations for a given indicator code */
function latestObs(allObs: Observation[], code: string): Observation | null {
  return (
    allObs
      .filter((o) => o.indicatorCode === code && o.value !== null)
      .sort((a, b) => b.year - a.year)[0] ?? null
  );
}

/** All observations for a given indicator code */
function obsFor(allObs: Observation[], code: string): Observation[] {
  return allObs.filter((o) => o.indicatorCode === code);
}

export default async function CountryProfilePage({
  params,
}: {
  params: Promise<{ iso: string }>;
}) {
  const { iso } = await params;

  const allCountries = await getCachedCountries();
  const countryMeta = allCountries.find((c) => c.id === iso);
  if (!countryMeta) notFound();

  const allObs = await getCountryAllIndicators(iso);

  // ── Header stat derivation ─────────────────────────────────────────────────
  const popObs = latestObs(allObs, POP_CODE);
  const gdpObs = latestObs(allObs, GDP_CODE);
  const leObs = latestObs(allObs, LE_CODE);

  // Coverage
  const codesWithData = new Set(
    allObs.filter((o) => o.value !== null).map((o) => o.indicatorCode)
  );
  const availableCount = INDICATORS.filter((ind) => codesWithData.has(ind.code)).length;

  // SDG on-track summary
  let onTrackCount = 0;
  let totalWithTarget = 0;
  for (const ind of INDICATORS) {
    if (ind.sdgTargetValue === undefined) continue;
    const latest = latestObs(allObs, ind.code);
    if (latest === null) continue;
    totalWithTarget++;
    if (sdgStatus(latest.value, ind.sdgTargetValue, ind.sdgDirection) === "on-track") {
      onTrackCount++;
    }
  }

  // ── Topic grid ─────────────────────────────────────────────────────────────
  const byTopic = new Map<string, typeof INDICATORS>();
  for (const topic of TOPIC_ORDER) byTopic.set(topic, []);
  for (const ind of INDICATORS) {
    const arr = byTopic.get(ind.topic);
    if (arr) arr.push(ind);
    else byTopic.set(ind.topic, [ind]);
  }
  // Drop empty topics
  for (const [k, v] of byTopic) if (v.length === 0) byTopic.delete(k);

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-6">
      <Breadcrumb crumbs={[{ label: "Catalogue", href: "/" }, { label: countryMeta.name }]} />

      <CountryProfileHeader
        countryName={countryMeta.name}
        regionLabel={countryMeta.region.value}
        incomeGroupLabel={countryMeta.incomeLevel.value}
        population={popObs?.value ?? null}
        populationYear={popObs?.year ?? null}
        gdpPerCapita={gdpObs?.value ?? null}
        gdpYear={gdpObs?.year ?? null}
        lifeExpectancy={leObs?.value ?? null}
        lifeExpYear={leObs?.year ?? null}
        onTrackCount={onTrackCount}
        totalWithTarget={totalWithTarget}
        availableCount={availableCount}
        totalCount={INDICATORS.length}
      />

      {/* Topic sections */}
      <div className="flex flex-col gap-6">
        {Array.from(byTopic.entries()).map(([topic, indicators]) => (
          <section key={topic}>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-[0.5px] ${TOPIC_COLORS[topic] ?? "bg-surface-2 text-secondary"}`}
              >
                {topic}
              </span>
              <span className="text-[11px] text-tertiary">{indicators.length} indicators</span>
            </div>
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
            >
              {indicators.map((ind) => (
                <IndicatorTile
                  key={ind.code}
                  indicator={ind}
                  iso3={iso}
                  obs={obsFor(allObs, ind.code)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 pt-4 border-t border-subtle text-[11px] text-tertiary">
        Source: World Bank Open Data · Data fetched live at request time · 1-hour server cache
      </div>
    </div>
  );
}
