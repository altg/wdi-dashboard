"use client";

import { useState } from "react";
import { formatCitation } from "@/lib/format";
import { buildCSV, downloadCSV } from "@/lib/csv";
import type { Indicator } from "@/lib/registry/indicators";
import type { Observation } from "@/lib/wb/client";

type Props = {
  indicator: Indicator;
  countryName: string;
  countryIso3: string;
  trajectoryObs: Observation[];
  regionObs: Observation[];
  regionLabel: string;
  incomeGroupObs: Observation[];
  incomeGroupLabel: string;
};

export function ActionBar({
  indicator,
  countryName,
  countryIso3,
  trajectoryObs,
  regionObs,
  regionLabel,
  incomeGroupObs,
  incomeGroupLabel,
}: Props) {
  const [citationCopied, setCitationCopied] = useState(false);

  async function handleCopyCitation() {
    const citation = formatCitation({
      indicatorName: indicator.name,
      indicatorCode: indicator.code,
      source: indicator.source,
    });
    await navigator.clipboard.writeText(citation);
    setCitationCopied(true);
    setTimeout(() => setCitationCopied(false), 2000);
  }

  function handleDownloadCSV() {
    const years = Array.from(
      new Set([...trajectoryObs, ...regionObs, ...incomeGroupObs].map((o) => o.year))
    ).sort((a, b) => a - b);

    const countryByYear = new Map(
      trajectoryObs.filter((o) => o.countryIso3 === countryIso3).map((o) => [o.year, o.value])
    );
    const regionByYear = new Map(regionObs.map((o) => [o.year, o.value]));
    const incomeByYear = new Map(incomeGroupObs.map((o) => [o.year, o.value]));

    const headers = ["Year", countryName, regionLabel, incomeGroupLabel];
    const rows = years.map((y) => [
      y,
      countryByYear.get(y) ?? null,
      regionByYear.get(y) ?? null,
      incomeByYear.get(y) ?? null,
    ]);

    const csv = buildCSV(headers, rows);
    downloadCSV(`${countryIso3}-${indicator.code}-trajectory.csv`, csv);
  }

  const btnCls =
    "h-7 text-[11px] px-3 bg-surface border border-subtle rounded text-secondary hover:text-primary hover:bg-surface-2 transition-colors";

  return (
    <div className="flex gap-2 justify-end">
      <button className={btnCls} disabled title="Phase 5">
        Pin to board
      </button>
      <button className={btnCls} disabled title="Phase 5">
        Open in comparator
      </button>
      <button onClick={handleDownloadCSV} className={btnCls}>
        ↓ CSV
      </button>
      <button
        onClick={handleCopyCitation}
        className={`${btnCls} ${citationCopied ? "text-positive border-positive" : ""}`}
      >
        {citationCopied ? "✓ Copied!" : "Copy citation"}
      </button>
    </div>
  );
}
