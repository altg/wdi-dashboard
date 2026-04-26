"use client";

import { useState, useRef, useEffect, useId } from "react";
import useSWR from "swr";
import {
  STARTER_TEMPLATES,
  saveCustomPeerGroup,
  type CustomPeerGroup,
} from "@/lib/registry/peer-groups";

type Country = { id: string; name: string };

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json() as Promise<Country[]>);

type Props = {
  initial?: CustomPeerGroup;
  onClose: () => void;
  onSaved: (group: CustomPeerGroup) => void;
};

export function PeerGroupBuilder({ initial, onClose, onSaved }: Props) {
  const id = useId();
  const nameRef = useRef<HTMLInputElement>(null);

  const [label, setLabel] = useState(initial?.label ?? "");
  const [selectedIso3s, setSelectedIso3s] = useState<string[]>(
    initial?.countryIso3s ?? []
  );
  const [query, setQuery] = useState("");
  const [dropOpen, setDropOpen] = useState(false);

  const { data: countries = [] } = useSWR<Country[]>("/api/wb/countries", fetcher, {
    dedupingInterval: 3_600_000,
    revalidateOnFocus: false,
  });

  const nameMap = new Map(countries.map((c) => [c.id, c.name]));

  const filtered = countries
    .filter(
      (c) =>
        !selectedIso3s.includes(c.id) &&
        (c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.id.toLowerCase().startsWith(query.toLowerCase()))
    )
    .slice(0, 50);

  function addCountry(iso3: string) {
    setSelectedIso3s((prev) => (prev.includes(iso3) ? prev : [...prev, iso3]));
    setQuery("");
    setDropOpen(false);
  }

  function removeCountry(iso3: string) {
    setSelectedIso3s((prev) => prev.filter((i) => i !== iso3));
  }

  function applyTemplate(tmpl: (typeof STARTER_TEMPLATES)[0]) {
    setLabel((prev) => prev || tmpl.label);
    setSelectedIso3s(tmpl.countryIso3s);
  }

  function handleSave() {
    if (!label.trim() || selectedIso3s.length === 0) return;
    const group: CustomPeerGroup = {
      id: initial?.id ?? `custom:${Date.now()}`,
      label: label.trim(),
      type: "custom",
      countryIso3s: selectedIso3s,
      createdAt: initial?.createdAt ?? Date.now(),
    };
    saveCustomPeerGroup(group);
    onSaved(group);
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Focus name input on open
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.4)]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface border border-subtle rounded-lg shadow-xl w-[520px] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-subtle shrink-0">
          <h2
            id={`${id}-title`}
            className="font-medium text-primary text-[14px]"
          >
            {initial ? "Edit peer group" : "New peer group"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-tertiary hover:text-primary text-[18px] leading-none"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {/* Name */}
          <div>
            <label
              htmlFor={`${id}-name`}
              className="block text-[10px] uppercase tracking-[0.4px] text-tertiary mb-1"
            >
              Group name
            </label>
            <input
              ref={nameRef}
              id={`${id}-name`}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. My GCC+"
              className="w-full h-8 text-[12px] px-2 bg-surface border border-subtle rounded text-primary placeholder:text-tertiary outline-none focus:border-info transition-colors"
            />
          </div>

          {/* Starter templates */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.4px] text-tertiary mb-1.5">
              Starter templates
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STARTER_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.label}
                  type="button"
                  onClick={() => applyTemplate(tmpl)}
                  className="px-2 py-1 text-[11px] border border-subtle rounded hover:bg-surface-2 hover:border-[rgba(0,0,0,0.18)] transition-colors text-secondary"
                >
                  {tmpl.label}
                  <span className="ml-1 text-tertiary text-[10px]">
                    ({tmpl.countryIso3s.length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Country search */}
          <div>
            <label
              htmlFor={`${id}-search`}
              className="block text-[10px] uppercase tracking-[0.4px] text-tertiary mb-1"
            >
              Add countries
            </label>
            <div className="relative">
              <input
                id={`${id}-search`}
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setDropOpen(true);
                }}
                onFocus={() => setDropOpen(true)}
                onBlur={() => setTimeout(() => setDropOpen(false), 150)}
                placeholder="Search by name or ISO3…"
                className="w-full h-8 text-[12px] px-2 bg-surface border border-subtle rounded text-primary placeholder:text-tertiary outline-none focus:border-info transition-colors"
              />
              {dropOpen && filtered.length > 0 && (
                <ul className="absolute z-50 top-full mt-0.5 left-0 right-0 max-h-[180px] overflow-y-auto bg-surface border border-subtle rounded shadow-md">
                  {filtered.map((c) => (
                    <li
                      key={c.id}
                      onMouseDown={() => addCountry(c.id)}
                      className="px-3 py-1.5 cursor-pointer flex items-center gap-2 text-[12px] text-primary hover:bg-surface-2"
                    >
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-[10px] text-tertiary font-mono shrink-0">
                        {c.id}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Selected chips */}
          {selectedIso3s.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-[0.4px] text-tertiary mb-1.5">
                Selected ({selectedIso3s.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedIso3s.map((iso3) => (
                  <span
                    key={iso3}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-surface-2 border border-subtle rounded text-[11px]"
                  >
                    <span className="text-primary">
                      {nameMap.get(iso3) ?? iso3}
                    </span>
                    <span className="font-mono text-[9px] text-tertiary">{iso3}</span>
                    <button
                      type="button"
                      onClick={() => removeCountry(iso3)}
                      aria-label={`Remove ${iso3}`}
                      className="text-tertiary hover:text-negative leading-none ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-subtle shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-7 px-3 text-[12px] text-secondary hover:text-primary border border-subtle rounded"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!label.trim() || selectedIso3s.length === 0}
            className="h-7 px-3 text-[12px] bg-info text-white rounded disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Save group
          </button>
        </div>
      </div>
    </div>
  );
}
