"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getRecents } from "@/lib/recents";
import type { RecentEntry } from "@/lib/recents";
import { getIndicator } from "@/lib/registry/indicators";

const MAX_SHOWN = 8;

function entryHref(e: RecentEntry): string {
  if (e.kind === "indicator") return `/indicator/${e.code}`;
  if (e.kind === "country") return `/country/${e.iso}`;
  return `/indicator/${e.code}/country/${e.iso}`;
}

function entryLabel(e: RecentEntry): { primary: string; secondary: string } {
  if (e.kind === "indicator") {
    const ind = getIndicator(e.code);
    return { primary: ind?.name ?? e.code, secondary: ind?.topic ?? "Indicator" };
  }
  if (e.kind === "country") {
    return { primary: e.iso, secondary: "Country profile" };
  }
  // compare
  const ind = getIndicator(e.code);
  return { primary: ind?.name ?? e.code, secondary: e.iso };
}

export function RecentsStrip() {
  const [entries, setEntries] = useState<RecentEntry[]>([]);

  useEffect(() => {
    setEntries(getRecents().slice(0, MAX_SHOWN));
  }, []);

  if (entries.length === 0) return null;

  return (
    <div className="mb-6 pb-5 border-b border-subtle">
      <div className="text-[10px] uppercase tracking-[0.5px] text-tertiary mb-2">Recently viewed</div>
      <div className="flex flex-wrap gap-1.5">
        {entries.map((e, i) => {
          const { primary, secondary } = entryLabel(e);
          return (
            <Link
              key={i}
              href={entryHref(e)}
              className="inline-flex flex-col px-2.5 py-1.5 bg-surface border border-subtle rounded hover:border-strong hover:shadow-sm transition-all"
            >
              <span className="text-[11px] font-medium text-primary leading-snug truncate max-w-[180px]">
                {primary}
              </span>
              <span className="text-[9px] text-tertiary">{secondary}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
