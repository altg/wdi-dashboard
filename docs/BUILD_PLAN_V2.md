# Build Plan — V2

Post-v1 expansion. Implement phases **in order**. Stop at each checkpoint for human review before continuing.

Read `docs/DESIGN_SPEC.md`, `docs/BUILD_PLAN.md`, and `docs/BUILD_PLAN_COMPARATOR.md` first. Follow all coding conventions in `CLAUDE.md` — Recharts only (the map exception in V2.5 is a deliberate, scoped break to be discussed with the human before implementation), Tailwind tokens only, server components by default, Zod at boundaries.

---

## What V2 is

V1 made the dashboard browsable. V2 turns it into a **workflow tool** for briefing prep. Four cuts:

1. **Country profile** — one country, all curated indicators at a glance.
2. **Pinned board** — analyst-assembled mix of indicator+country tiles, exportable as JSON.
3. **Custom peer-group builder** — let users define their own groups (OIC, GCC, IsDB members, G20).
4. **Briefing PDF export** — assemble selected charts/tables into a printable deck.

Cross-cutting: a small set of supporting changes (command palette, recently-viewed strip, registry de-duplication) that make the four primary features usable.

---

## Phase V2.0 — Pre-work: shared scaffolding

**Goal**: extract the things every V2 phase will reuse so we don't duplicate them four times.

### Tasks

1. **Year-clamping helper** at `lib/year-range.ts`. Today the same `Math.min(MAX_YEAR, latestAvailable ?? FALLBACK)` clamp logic lives in three pages. Extract `resolveYearWindow(code, sp)` returning `{ selectedYear, compareYear, latestYear }`. Replace the inline copies in:
   - `app/indicator/[code]/page.tsx`
   - `app/indicator/[code]/country/[iso]/page.tsx`
   - `app/indicator/[code]/compare/page.tsx`
2. **Local-storage hook** at `lib/use-local-storage.ts`. Generic `useLocalStorage<T>(key, initial)` with SSR-safe lazy init. Used by board, custom peer groups, recently-viewed.
3. **A namespaced storage key registry** at `lib/storage-keys.ts`:
   ```ts
   export const STORAGE_KEYS = {
     home: "wdi_home_country",
     theme: "wdi_theme",
     board: "wdi_board_v1",
     customPeers: "wdi_custom_peers_v1",
     recents: "wdi_recents_v1",
   } as const;
   ```
   Migrate existing strings (`wdi_home_country`, `wdi_theme`) to use this.
4. **Recently-viewed tracker**: a tiny client utility `lib/recents.ts` that pushes `{ kind: "indicator" | "country" | "compare", code?, iso?, ts }` into `STORAGE_KEYS.recents` (cap 20). Call it from page client islands. Display deferred to V2.5.

**Stopping point**: existing pages still render identically; the three new helpers are imported in at least one place each. Human reviews. Do not proceed until approved.

---

## Phase V2.1 — Country profile page

**Goal**: a single page showing a country's standing across every curated indicator, grouped by topic, suitable for briefing intake.

Route: `app/country/[iso]/page.tsx` (Server Component).

### Tasks

1. **Route + data fetch**.
   - Reuse `getCachedCountries()` for metadata.
   - Fetch all `INDICATORS` (curated only — extended is too much) for the country in **one batched call per topic**. The WB API supports semicolon-joined indicator codes; group by topic to keep request sizes reasonable. Add `fetchCountryIndicators(iso3, codes[])` to `lib/wb/client.ts` and a cache wrapper `getCountryAllIndicators(iso3)` in `lib/wb/cache.ts` keyed by `cai:{iso3}`.
   - For each indicator: derive latest non-null observation, prior-year delta, 5-year delta, SDG status.
2. **`CountryProfileHeader` component** (`components/country-profile-header.tsx`).
   - Country name, region, income group, population (`SP.POP.TOTL` latest), GDP per capita, life expectancy, share of country's indicators currently on-track.
   - One line of metadata + a four-card stat row.
3. **`IndicatorTile` component** (`components/indicator-tile.tsx`).
   - 220×120 tile: indicator code (mono), name, latest value, sparkline, delta vs 2000, SDG badge if applicable.
   - Hover reveals "Open deep-dive" / "Open drilldown" links.
   - Click navigates to country drilldown for that indicator + country.
4. **Topic grid layout**.
   - Reuse `TOPIC_ORDER` and `TOPIC_COLORS` from `app/page.tsx` — extract to `lib/topics.ts` first to avoid copy-paste.
   - One section per topic, `repeat(auto-fill, minmax(220px, 1fr))` grid.
   - Empty cells (no data for this country) render a dashed placeholder, never a 0 or "N/A".
5. **Coverage summary at top**: `Data available for X of Y curated indicators`. If < 50%, render an amber notice.
6. **Wire navigation**:
   - Country names in `PeerTable` rows already link to the drilldown for the current indicator. Add a separate small `→ Profile` icon link that goes to `/country/[iso]`.
   - `Breadcrumb` in the country drilldown gets a new crumb linking back to the profile when the user arrived from one (use `?from=profile`).

### Performance note

A single country across ~40 indicators is ~40 small fetches against WB API or one DuckDB query against the local DB. In `local` mode, write a single SQL query that returns all rows for a country. In `api` mode, batch by topic (5–8 indicators per call) and fan out.

**Stopping point**: `/country/JOR` renders all topics with sparklines, links work both ways. Human reviews.

---

## Phase V2.2 — Custom peer-group builder

**Goal**: the user can define and save their own peer groups, which then appear in the existing `FilterBar` selector alongside built-in regions and income groups.

### Tasks

1. **Storage shape** in `lib/registry/peer-groups.ts`:
   ```ts
   type CustomPeerGroup = {
     id: string;          // "custom:abc123"
     label: string;
     type: "custom";
     countryIso3s: string[];
     createdAt: number;
   };
   ```
   Add `getCustomPeerGroups()` (reads `STORAGE_KEYS.customPeers`) and `saveCustomPeerGroup(group)` helpers — client-only since they touch `localStorage`.
2. **`PeerGroupBuilder` modal** (`components/peer-group-builder.tsx`, Client Component).
   - Trigger: a small "+ Custom group" button at the bottom of the `FilterBar` peer-group dropdown.
   - Body: name input + searchable country picker (reuse `CountryPicker` from comparator if its API fits; else extract a `CountryMultiSelect`).
   - Includes a small set of **starter templates**: GCC, OIC, G20, IsDB members, EU27, ASEAN. Picking a template pre-fills the country list — user can edit before saving.
   - Save writes to localStorage; the group immediately appears in the `FilterBar` selector under a "Custom" optgroup.
3. **Edit / delete**: hover a custom group in the dropdown to reveal a small pencil/trash icon. Edit re-opens the modal pre-filled.
4. **Server-side resolution**. The page-level peer-group lookup needs to handle custom IDs. Custom groups live in the browser, so the URL carries the full member list when a custom group is selected: change the URL shape to `?peer=custom&members=JOR,EGY,MAR,...`. Page logic: if `peer === "custom"`, build a synthetic `PeerGroup` object server-side from the `members` param. If `members` is missing, fall back to `mena`.
5. **Aggregate row in `PeerTable`** for custom groups: compute mean/median client-side from the row data instead of fetching a WB aggregate code (since none exists for custom groups). Label as "Custom group avg".
6. **Coverage warning logic** in `FilterBar` already keys off `coveragePct` — this still works for custom groups.

**Stopping point**: user can build "My GCC" group from the modal, see it in the dropdown, share the URL, and the deep-dive renders correctly with a custom-group average row. Human reviews.

---

## Phase V2.3 — Pinned board

**Goal**: a workspace where an analyst pins arbitrary indicator+country tiles, reorders them, annotates them, and exports/imports as JSON.

Route: `app/board/page.tsx` (Client Component — board state lives in `localStorage`).

### Tasks

1. **Board model** at `lib/board.ts`:
   ```ts
   type BoardTile =
     | { kind: "indicator-stat"; code: string; iso3: string; note?: string }
     | { kind: "trajectory"; code: string; iso3: string; note?: string }
     | { kind: "peer-table"; code: string; peerGroupId: string; year: number; note?: string }
     | { kind: "histogram"; code: string; year: number; note?: string };
   type Board = { id: string; title: string; tiles: BoardTile[]; updatedAt: number };
   ```
   `getBoard()`, `saveBoard()`, `addTile()`, `removeTile()`, `reorderTiles()`. Single-board v1 — multi-board deferred.
2. **"Pin" actions**.
   - Re-enable the `Pin to board` button in `ActionBar` — pins the current chart context as a tile.
   - Add a small pin icon to `IndicatorTile` (V2.1), `PeerTable` rows, and the `TrajectoryChart` overflow menu.
   - On pin: toast "Pinned to board · View" with a link.
3. **Board page**.
   - Header: editable title, tile count, "Export JSON" / "Import JSON" buttons, "Clear" with confirm.
   - Grid: drag-and-drop reorder. Use HTML5 drag-and-drop natively — no new dependency. Tiles render at fixed widths matching their kind (stat = 1 col, peer-table = 3 cols, etc.) on a 6-column CSS grid.
   - Each tile has a remove (×) and an annotation textarea (collapsed by default, expands on click).
4. **Tile rendering**: each tile is a Server-Component-friendly variant of the existing chart, but the board page is client-side. Two options:
   - (Preferred) Render each tile via a small client wrapper that fetches its own data with SWR using the existing API routes. Keeps the board page entirely client-rendered with progressive load.
   - (Alternative) Pass the board state as a search param and render server-side. Rejected: tile lists can be long, URLs would explode.
5. **Export/import**.
   - Export: download `board-<title>-<date>.json` containing the full `Board` object.
   - Import: file picker → Zod-validate → replace current board with confirm.
   - Schema in `lib/board.ts` using Zod.
6. **Empty state**: friendly explainer with three "Get started" buttons (open MMR deep-dive, open Jordan profile, open the catalogue).
7. **Nav link**: add `Board` to `NavBar` between `Catalogue` and the dark-mode toggle. Show a small dot when board has unsaved changes (future — for now, just show tile count).

**Stopping point**: analyst can pin tiles from any deep-dive / drilldown / profile page, reorder them on `/board`, annotate, export to JSON, re-import. Human reviews.

---

## Phase V2.4 — Briefing PDF export

**Goal**: turn a board into a printable PDF brief — title page, table of contents, one tile per section with its annotation, source citations at the end.

### Tasks

1. **Print stylesheet** at `app/board/print.css` (imported only in the print route). Page-break rules per tile, hide nav / buttons / drag handles, force light mode regardless of user preference, A4 portrait by default.
2. **Print route** `app/board/print/page.tsx` (Server Component reading board from a query param: `?b=<base64-encoded-board-json>`). Reasoning: the board lives in `localStorage` (client only) but PDFs need server-rendered HTML. The `/board` page will base64-encode the board into the URL when the user clicks "Export PDF".
3. **Brief layout**:
   - Cover page: board title, generated date, generator ("WDI Dashboard"), short auto-summary ("4 indicators across 3 countries, peer group: GCC").
   - One section per tile: heading with indicator name + country, the chart, the annotation paragraph, the source/citation line generated via `formatCitation`.
   - Final page: full citation list, one entry per indicator referenced, methodology notes from each indicator's `coverageNote`.
4. **PDF generation**: rely on the browser's native print-to-PDF. The "Export PDF" button on `/board` opens the print route in a new tab and triggers `window.print()` after the page is fully loaded (use a small `useEffect` with a `requestIdleCallback` guard). Document the workflow in the README — no Puppeteer, no headless Chrome dependency.
5. **DOCX export deferred**: stub a disabled button with a tooltip "Coming soon".
6. **Asset capture for non-Recharts elements**: peer tables print fine as HTML; charts render as inline SVG (Recharts default) which prints crisply.

**Stopping point**: user clicks Export PDF, browser print dialog opens, "Save as PDF" produces a clean multi-page document with cover, tiles, and citations. Human reviews.

---

## Phase V2.5 — Polish that makes V2 livable

Small things that turn the four primary features from "works" into "fast and obvious".

### Tasks

1. **Command palette** (Cmd-K / Ctrl-K). `components/command-palette.tsx` — fuzzy-match across:
   - Indicators (curated + extended)
   - Countries
   - Peer groups (built-in + custom)
   - Pages (Catalogue, Board, custom-group builder)
   - Recently viewed (top of list)
   No new dependency: write a tiny scorer (Levenshtein-ish substring rank). Keyboard nav with arrow keys + enter.
2. **Recently-viewed strip** in `NavBar` (or as a Cmd-K section). Wire `lib/recents.ts` from V2.0 — `app/indicator/[code]/page.tsx`, `country/[iso]/page.tsx`, and the new profile page each push on mount.
3. **Profile entry from peer table**: a `→` arrow button on each row that goes to `/country/[iso]` (in addition to the existing row-click which goes to the drilldown for the current indicator).
4. **Empty / partial-data tiles** on the board show the dashed placeholder rather than crashing or showing 0.
5. **Board persistence guard**: before navigating away from the board with unsaved drag reorders, debounce-save (5s) and also save on `beforeunload`. (Nothing to save explicitly — every mutation auto-persists. Just verify.)
6. **Accessibility**: tab through the command palette, board grid, and peer-group builder — focus rings visible, ESC closes modals, ARIA labels on tile pins.
7. **README update** — screenshots of all four new features, JSON board export example, the print-to-PDF workflow.

**Stopping point**: V2 complete. Human reviews against the four-cut goal.

---

## Out of scope for V2 (defer to V3)

- Multiple boards / board library
- Cross-indicator scatter / quadrant view
- Map (choropleth) — needs a non-Recharts dependency, deserves its own design pass
- Forecast / projection lines on trajectory (CAGR-to-target gap analysis)
- Per-capita / %-of-GDP toggles
- Gender-disaggregated paired views
- Beyond-WDI sources (IMF WEO, WHO GHO)
- i18n / RTL
- Multi-user share (anything beyond JSON file handoff)
- DOCX export
- Mobile layout pass

---

## Build order rationale

V2.0 first because every later phase touches `localStorage` and year clamping. V2.1 (profile) before V2.3 (board) because the board's most useful tiles come from the profile page. V2.2 (custom peers) before V2.3 because pinning a peer-table tile from a custom group needs the URL shape settled. V2.4 (PDF) last because it depends on the board existing. V2.5 is polish — it can slip without blocking the cut.
