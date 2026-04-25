What was implemented:

  Ingestion (scripts/ingest_wdi.py) — one-time setup, ~107s:
  - Reads WDIEXCEL.xlsx, pivots wide→long, keeps only non-null values
  - Uses pandas DataFrame → DuckDB (no slow executemany), 8.9M observations
  - Outputs wdidata/wdi.duckdb (336MB) with two tables: countries and observations
  - Indexed on (indicator_code, country_code) and (indicator_code, year) for fast queries
  - Run with: npm run ingest

  App integration:
  - lib/local/db.ts — singleton DuckDB read-only connection (native module, server-only)
  - lib/local/client.ts — mirrors fetchIndicator/fetchAllCountries from the WB client
  - lib/data-source.ts — dispatcher: DATA_SOURCE=local → DuckDB, else → WB API
  - lib/wb/cache.ts — now imports from data-source.ts, so both modes are cached identically
  - next.config.ts — serverExternalPackages: ["@duckdb/node-api"] (prevents webpack bundling native binary)

  Activation: set DATA_SOURCE=local in .env.local (already done). A "local DB" / "live API" badge appears in the top bar.
  Switch back to API by removing that line or setting DATA_SOURCE=api.

  Home button — The "WDI Dashboard" title in the nav bar is now a <Link href="/">. On any page that isn't the catalogue
  (i.e., indicator or country drilldown pages), a ← Home button also appears to the left of it. Clicking either returns to
  the indicator catalogue.

  Dark mode — Full system:
  - Anti-flash script injected in <head> before React hydrates — reads localStorage and also respects prefers-color-scheme,
  so first-time visitors get the OS default with no white flash
  - Toggle button in the nav bar (moon → sun icon) persists the choice in localStorage
  - CSS token overrides in globals.css — all --color-* design tokens are overridden under html.dark, so every Tailwind
  utility (bg-surface, text-primary, etc.) picks up dark values automatically
  - Chart components — useDarkMode() hook (MutationObserver on <html>) updates chart grid strokes, reference line strokes,
  and Recharts tooltip background/border/text colors reactively when toggled
  - Driver table SVG track — uses var(--svg-track) CSS custom property (overridden in html.dark) since it's a Server
  Component
  - Status badges — dark: Tailwind variants for green/amber/red backgrounds

---------------------------

 - Commit 79aa713 — all 47 files staged and committed (phases 1–3 work: API routes, components, lib, docs, scripts)
  - Tag checkpoint-pre-next-phase — annotated tag for easy rollback

  To roll back to this point later if needed:
  git reset --hard checkpoint-pre-next-phase
  Or to inspect without resetting:
  git checkout checkpoint-pre-next-phase

