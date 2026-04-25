import Link from "next/link";
import { INDICATORS, EXTENDED_INDICATORS } from "@/lib/registry/indicators";
import type { Indicator } from "@/lib/registry/indicators";

// ── Topic ordering ────────────────────────────────────────────────────────────
const TOPIC_ORDER = [
  "Health",
  "Education",
  "Economy",
  "Poverty & inequality",
  "Environment & energy",
  "Infrastructure & digital",
  "Demographics",
  "Governance",
];

const TOPIC_COLORS: Record<string, string> = {
  "Health":                   "bg-[#EAF3DE] text-[#27500A]",
  "Education":                "bg-[#E3EDFB] text-[#0C3B75]",
  "Economy":                  "bg-[#FFF3D9] text-[#633806]",
  "Poverty & inequality":     "bg-[#FCEBEB] text-[#791F1F]",
  "Environment & energy":     "bg-[#E6F4F1] text-[#14493E]",
  "Infrastructure & digital": "bg-[#EDE9FB] text-[#2D2475]",
  "Demographics":             "bg-[#F4F0E8] text-[#4A3B1A]",
  "Governance":               "bg-[#F0F0F0] text-[#333333]",
};

function groupByTopic(indicators: Indicator[]): Map<string, Indicator[]> {
  const map = new Map<string, Indicator[]>();
  for (const topic of TOPIC_ORDER) map.set(topic, []);
  for (const ind of indicators) {
    const arr = map.get(ind.topic);
    if (arr) arr.push(ind);
    else map.set(ind.topic, [ind]);
  }
  // Remove empty groups
  for (const [k, v] of map) if (v.length === 0) map.delete(k);
  return map;
}

function SdgBadge({ goal, target }: { goal: number; target?: string }) {
  return (
    <span className="inline-block px-1 py-0.5 rounded-[3px] text-[9px] font-medium bg-[#E3EDFB] text-[#0C3B75] leading-tight">
      SDG {target ?? goal}
    </span>
  );
}

function IndicatorCard({ indicator, extended = false }: { indicator: Indicator; extended?: boolean }) {
  return (
    <Link
      href={`/indicator/${indicator.code}`}
      className={`group block bg-surface border rounded-md p-3 hover:shadow-sm transition-all ${
        extended
          ? "border-dashed border-subtle hover:border-[rgba(0,0,0,0.14)] opacity-80 hover:opacity-100"
          : "border-subtle hover:border-[rgba(0,0,0,0.18)]"
      }`}
    >
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <code className="text-[10px] font-mono text-tertiary group-hover:text-secondary transition-colors leading-tight">
          {indicator.code}
        </code>
        {indicator.sdgGoal ? (
          <SdgBadge goal={indicator.sdgGoal} target={indicator.sdgTarget} />
        ) : extended ? (
          <span className="inline-block px-1 py-0.5 rounded-[3px] text-[9px] font-medium bg-surface-2 text-tertiary leading-tight">
            WDI
          </span>
        ) : null}
      </div>
      <div className="text-[12px] font-medium text-primary leading-snug mb-1">
        {indicator.name}
      </div>
      <div className="text-[10px] text-tertiary leading-tight truncate">
        {indicator.unit}
      </div>
      {indicator.coverageNote && (
        <div className="mt-1.5 text-[9px] text-warning truncate">
          {indicator.coverageNote}
        </div>
      )}
    </Link>
  );
}

export default function CataloguePage() {
  const grouped = groupByTopic(INDICATORS);
  const extendedGrouped = groupByTopic(EXTENDED_INDICATORS);
  const totalExtended = EXTENDED_INDICATORS.length;

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      {/* Page header */}
      <div className="mb-8 pb-5 border-b border-subtle">
        <div className="uppercase text-[10px] tracking-[0.5px] text-tertiary mb-1">
          World Development Indicators
        </div>
        <h1 className="text-[22px] font-medium text-primary">Indicator catalogue</h1>
        <p className="text-[13px] text-secondary mt-1 max-w-xl">
          {INDICATORS.length} curated indicators from the World Bank WDI database.{" "}
          <span className="text-tertiary">{totalExtended} additional WDI indicators available — expand any topic to see them.</span>
        </p>
      </div>

      {/* Topic sections */}
      <div className="flex flex-col gap-8">
        {Array.from(grouped.entries()).map(([topic, indicators]) => {
          const extended = extendedGrouped.get(topic) ?? [];
          return (
            <section key={topic}>
              <div className="flex items-center gap-2 mb-3">
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
                  <IndicatorCard key={ind.code} indicator={ind} />
                ))}
              </div>

              {extended.length > 0 && (
                <details className="mt-3">
                  <summary className="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden inline-flex items-center gap-1.5 text-[11px] text-tertiary hover:text-secondary transition-colors py-1 group">
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 8 8"
                      className="transition-transform details-open:rotate-90 shrink-0"
                      style={{ transform: "rotate(0deg)" }}
                    >
                      <path d="M2 1l4 3-4 3V1z" fill="currentColor" />
                    </svg>
                    <span>Extended WDI indicators · {extended.length} more</span>
                  </summary>
                  <div
                    className="grid gap-2 mt-2"
                    style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
                  >
                    {extended.map((ind) => (
                      <IndicatorCard key={ind.code} indicator={ind} extended />
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-tertiary">
                    Extended indicators include basic metadata only — no driver analysis or SDG event annotations.
                  </p>
                </details>
              )}
            </section>
          );
        })}
      </div>

      <div className="mt-10 pt-5 border-t border-subtle text-[11px] text-tertiary">
        Source: World Bank Open Data · Data fetched live at request time · 1-hour server cache
      </div>
    </div>
  );
}
