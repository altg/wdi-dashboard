"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Props = {
  isLocal: boolean;
};

export function NavBar({ isLocal }: Props) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("wdi_theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <nav className="border-b border-subtle bg-surface px-4 py-1.5 flex items-center gap-3">
      {/* Home link — hidden on the catalogue page itself */}
      {!isHome && (
        <Link
          href="/"
          className="flex items-center gap-1 text-[11px] text-secondary hover:text-primary transition-colors px-1.5 py-0.5 rounded hover:bg-surface-2 border border-transparent hover:border-subtle"
          title="Back to indicator catalogue"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M6.5 2L3.5 5L6.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Home
        </Link>
      )}

      {/* Title */}
      <Link
        href="/"
        className="text-[11px] font-semibold text-primary tracking-wide hover:text-info transition-colors"
      >
        WDI Dashboard
      </Link>

      <div className="flex-1" />

      {/* Data source badge */}
      <span
        title={isLocal ? "Serving data from local DuckDB (wdidata/wdi.duckdb)" : "Fetching live data from World Bank API"}
        className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${
          isLocal
            ? "bg-[#e8f5e9] text-[#2e7d32] border-[#c8e6c9] dark:bg-[#1b3a1f] dark:text-[#6BAF3F] dark:border-[#2d5c32]"
            : "bg-surface-2 text-tertiary border-subtle"
        }`}
      >
        {isLocal ? "local DB" : "live API"}
      </span>

      {/* Dark mode toggle */}
      <button
        onClick={toggleDark}
        title={dark ? "Switch to light mode" : "Switch to dark mode"}
        className="w-6 h-6 flex items-center justify-center rounded text-secondary hover:text-primary hover:bg-surface-2 transition-colors border border-transparent hover:border-subtle"
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {/* Show sun in dark mode, moon in light mode */}
        {mounted && dark ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </button>
    </nav>
  );
}
