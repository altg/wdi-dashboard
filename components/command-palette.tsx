"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { INDICATORS, EXTENDED_INDICATORS } from "@/lib/registry/indicators";

// ── Types ─────────────────────────────────────────────────────────────────────

type WbCountry = { id: string; name: string; region?: { id: string; value: string } };

type Hit =
  | { kind: "indicator"; code: string; name: string; topic: string; unit: string }
  | { kind: "country"; iso: string; name: string; region: string };

// ── Search helpers ─────────────────────────────────────────────────────────────

const ALL_INDICATORS: Hit[] = [
  ...INDICATORS.map((i) => ({
    kind: "indicator" as const,
    code: i.code,
    name: i.name,
    topic: i.topic,
    unit: i.unit,
  })),
  ...EXTENDED_INDICATORS.map((i) => ({
    kind: "indicator" as const,
    code: i.code,
    name: i.name,
    topic: i.topic,
    unit: i.unit,
  })),
];

function score(hit: Hit, q: string): number {
  const lq = q.toLowerCase();
  const id = hit.kind === "indicator" ? hit.code : hit.iso;
  const name = hit.name.toLowerCase();
  if (id.toLowerCase() === lq) return 100;
  if (id.toLowerCase().startsWith(lq)) return 90;
  if (name.startsWith(lq)) return 80;
  if (name.includes(lq)) return 60;
  const terms = lq.split(/\s+/);
  if (terms.length > 1 && terms.every((t) => name.includes(t))) return 50;
  return 0;
}

function search(q: string, countries: WbCountry[]): Hit[] {
  const countryHits: Hit[] = countries
    .filter((c) => c.region && c.region.id !== "NA" && c.region.value !== "Aggregates")
    .map((c) => ({
      kind: "country" as const,
      iso: c.id,
      name: c.name,
      region: c.region?.value ?? "",
    }));

  return [...ALL_INDICATORS, ...countryHits]
    .map((h) => ({ h, s: score(h, q) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 8)
    .map(({ h }) => h);
}

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<WbCountry[]>);

// ── Component ─────────────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const router = useRouter();

  // Fetch countries lazily once palette is opened for the first time
  const { data: countries = [] } = useSWR<WbCountry[]>(
    open ? "/api/wb/countries" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 3_600_000 }
  );

  const hits = query.trim().length >= 2 ? search(query, countries) : [];

  // Global shortcut: Cmd/Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focus input when palette opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Reset active index when hits change
  useEffect(() => setActive(0), [hits.length]);

  const navigate = useCallback(
    (hit: Hit) => {
      setOpen(false);
      if (hit.kind === "indicator") router.push(`/indicator/${hit.code}`);
      else router.push(`/country/${hit.iso}`);
    },
    [router]
  );

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, hits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && hits[active]) {
      navigate(hits[active]);
    }
  }

  if (!open) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="bg-surface border border-strong rounded-lg shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-subtle">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-tertiary shrink-0">
            <circle cx="8.5" cy="8.5" r="5.75" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search indicators or countries…"
            className="flex-1 bg-transparent text-[13px] text-primary placeholder:text-tertiary outline-none"
            aria-label="Search"
            aria-autocomplete="list"
            aria-controls="cmd-palette-list"
            aria-activedescendant={hits[active] ? `cmd-hit-${active}` : undefined}
            role="combobox"
            aria-expanded={hits.length > 0}
          />
          <kbd className="text-[10px] text-tertiary border border-subtle rounded px-1 py-0.5 shrink-0">Esc</kbd>
        </div>

        {/* Results */}
        {hits.length > 0 && (
          <ul
            ref={listRef}
            id="cmd-palette-list"
            role="listbox"
            aria-label="Search results"
            className="py-1 max-h-80 overflow-y-auto"
          >
            {hits.map((hit, i) => (
              <li
                key={hit.kind === "indicator" ? hit.code : hit.iso}
                id={`cmd-hit-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => navigate(hit)}
                className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                  i === active ? "bg-surface-2" : ""
                }`}
              >
                {/* Kind icon */}
                <span className="text-[10px] text-tertiary w-14 shrink-0 text-right font-mono">
                  {hit.kind === "indicator" ? hit.topic : hit.region}
                </span>
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-primary truncate">
                    {hit.name}
                  </div>
                  <div className="text-[10px] text-tertiary font-mono">
                    {hit.kind === "indicator" ? hit.code : hit.iso}
                  </div>
                </div>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className="text-tertiary shrink-0 ml-auto">
                  <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </li>
            ))}
          </ul>
        )}

        {/* Empty state */}
        {query.trim().length >= 2 && hits.length === 0 && (
          <div className="px-3 py-6 text-center text-[12px] text-tertiary">
            No results for <strong className="text-secondary">{query}</strong>
          </div>
        )}

        {/* Hint */}
        {query.trim().length < 2 && (
          <div className="px-3 py-3 text-[11px] text-tertiary">
            Type at least 2 characters to search indicators and countries.
          </div>
        )}
      </div>
    </div>
  );
}
