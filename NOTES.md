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


-----------------------------------


 Checkpoint committed as a5bf20f — 11 files, 948 insertions. You can roll back with git reset --hard a5bf20f's parent
  (79aa713) if needed. Ready to proceed with the extended indicators feature.

-----------------------

 Committed as 7e0ce9a — checkpoint V1.5 with all 14 changed files. The CRLF warnings are just Git normalizing line
  endings on Windows and don't affect anything.


----------------------------


 Clean build. V2.2 is complete. Here's what was implemented:

  lib/registry/peer-groups.ts — Added CustomPeerGroup type, 6 starter templates (GCC, ASEAN, G20, EU27, OIC, IsDB), and
  localStorage helpers (getCustomPeerGroups, saveCustomPeerGroup, deleteCustomPeerGroup).

  components/peer-group-builder.tsx — New modal with name input, template quick-select buttons, searchable country multi-select
   (reuses /api/wb/countries), chip display of selected countries, and Save/Cancel.

  components/filter-bar.tsx — Custom groups optgroup in the select, + Custom button triggers the modal, edit/delete buttons
  appear when a custom group is active. URL shape: ?peer=custom&members=ISO1,ISO2,....

  app/indicator/[code]/page.tsx — Parses ?peer=custom&members=... to build a synthetic PeerGroup. Custom groups show stat cards
   (same as region groups). Falls back to MENA if members param is absent.

  components/peer-table.tsx — When peerGroup.type === "custom", computes mean from country rows as the aggregate footer row
  labelled "Custom group avg".

  Stopping point per plan: user can build "My GCC" from the modal, see it in the dropdown, share the URL, and the deep-dive
  renders with a custom-group average row. Ready for human review.