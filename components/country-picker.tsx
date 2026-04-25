"use client";

import { useState, useRef, useId, useEffect } from "react";
import useSWR from "swr";

type Country = { id: string; iso2Code: string; name: string };

type Props = {
  value: string | null;
  onChange: (iso3: string) => void;
  label: string;
};

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API ${r.status}`);
    return r.json() as Promise<Country[]>;
  });

export function CountryPicker({ value, onChange, label }: Props) {
  const { data: countries, isLoading, error } = useSWR<Country[]>(
    "/api/wb/countries",
    fetcher,
    { dedupingInterval: 3_600_000, revalidateOnFocus: false }
  );

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const listId = `${id}-list`;

  const selectedName = countries?.find((c) => c.id === value)?.name ?? value ?? "";

  const filtered = (countries ?? [])
    .filter((c) =>
      c.name.toLowerCase().startsWith(query.toLowerCase()) ||
      c.id.toLowerCase().startsWith(query.toLowerCase())
    )
    .slice(0, 60);

  // Sync display when external value changes
  useEffect(() => {
    if (!open) setQuery("");
  }, [open, value]);

  function handleSelect(iso3: string) {
    onChange(iso3);
    setOpen(false);
    setQuery("");
    setActiveIdx(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && filtered[activeIdx]) {
        handleSelect(filtered[activeIdx].id);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      setActiveIdx(-1);
    }
  }

  // Scroll active option into view
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const el = listRef.current.children[activeIdx] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIdx]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-[0.4px] text-tertiary">{label}</span>
        <div className="h-8 w-[200px] bg-surface-2 border border-subtle rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-[0.4px] text-tertiary">{label}</span>
        <div className="h-8 w-[200px] bg-surface border border-subtle rounded flex items-center px-2 text-[11px] text-warning">
          Countries unavailable
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 relative">
      <label htmlFor={id} className="text-[10px] uppercase tracking-[0.4px] text-tertiary">
        {label}
      </label>
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-owns={listId}
        className="relative"
      >
        <input
          ref={inputRef}
          id={id}
          type="search"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={activeIdx >= 0 ? `${listId}-${activeIdx}` : undefined}
          aria-label={label}
          value={open ? query : selectedName}
          placeholder={selectedName || "Search country…"}
          onFocus={() => {
            setOpen(true);
            setQuery("");
            setActiveIdx(-1);
          }}
          onBlur={(e) => {
            // Delay so click on option registers first
            if (!listRef.current?.contains(e.relatedTarget as Node)) {
              setTimeout(() => {
                setOpen(false);
                setQuery("");
              }, 150);
            }
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIdx(-1);
          }}
          onKeyDown={handleKeyDown}
          className="h-8 w-[200px] text-[12px] px-2 bg-surface border border-subtle rounded text-primary placeholder:text-tertiary outline-none focus:border-info transition-colors"
        />
        {open && filtered.length > 0 && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            className="absolute z-50 top-full mt-0.5 left-0 w-[240px] max-h-[220px] overflow-y-auto bg-surface border border-subtle rounded shadow-md"
          >
            {filtered.map((c, i) => (
              <li
                key={c.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={c.id === value}
                onMouseDown={() => handleSelect(c.id)}
                className={`px-3 py-1.5 cursor-pointer flex items-center gap-2 text-[12px] ${
                  i === activeIdx
                    ? "bg-surface-2 text-primary"
                    : c.id === value
                    ? "text-info bg-surface-2"
                    : "text-primary hover:bg-surface-2"
                }`}
              >
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-[10px] text-tertiary font-mono shrink-0">{c.id}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
