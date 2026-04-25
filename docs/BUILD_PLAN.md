# Build Plan

Claude Code: work through these phases **in order**. At the end of each phase, stop and summarize what changed. Do not begin the next phase until the human confirms.

---

## Phase 0 — Scaffolding & data layer (no UI)

**Goal**: verify the data pipeline works end-to-end before building any UI.

Tasks:

1. `npx create-next-app@latest wdi-dashboard` with App Router, TypeScript, Tailwind, ESLint. Turn on strict mode in `tsconfig.json`.
2. Install: `swr`, `zod`, `recharts`, `clsx`, `@types/node`.
3. Create folder structure:
   ```
   app/
     api/wb/
       countries/route.ts
       indicator/[code]/route.ts
   components/
   lib/
     wb/
       client.ts
       schemas.ts
     registry/
       indicators.ts
       peer-groups.ts
     format.ts
   docs/            (copy DESIGN_SPEC.md + BUILD_PLAN.md here from handoff)
   ```
4. Implement `lib/wb/schemas.ts` with Zod schemas for the WB API response shape (it's an unusual `[meta, data[]]` tuple — read docs first).
5. Implement `lib/wb/client.ts` with `fetchIndicator({ iso3s, code, yearRange })` returning typed `Observation[]`.
6. Implement the two route handlers with `revalidate: 3600`.
7. Implement `lib/registry/indicators.ts` with the ~40 indicators from spec §8. Just the metadata — no UI yet.
8. Implement `lib/registry/peer-groups.ts` with the standard WB regions and income groups as pre-defined peer groups.
9. Implement `lib/format.ts` with `formatNumber`, `formatPercent`, `formatDelta`, `formatYear`, `formatCitation`.
10. Write one smoke-test script at `scripts/smoke.ts` that fetches maternal mortality for Jordan, Morocco, Tunisia, 2000–2023 and prints it. Run it. Confirm numbers match the WB website.

**Stopping point**: smoke test passes, registry compiles, no UI yet. Human reviews. Do not proceed until approved.

---

## Phase 1 — Static Indicator Deep-Dive for one hard-coded indicator

**Goal**: get the layout, components, and tokens right against real data, with no interactivity.

Tasks:

1. Set up design tokens in `tailwind.config.ts` per spec §6.
2. Build `app/globals.css` with base styles, tabular numerals on data cells, the font stack.
3. Build these components (static props, no state):
   - `MetadataStrip`
   - `StatCard` + `StatGrid`
   - `DistributionHistogram` (use Recharts `BarChart` with a `ReferenceLine` for the SDG target)
   - `IndexedTrendChart` (Recharts `LineChart`)
   - `Sparkline` (Recharts `LineChart` with all axes/legend hidden)
   - `StatusBadge`
4. Build `app/indicator/[code]/page.tsx` as a **Server Component**. Hard-code the indicator to `SH.STA.MMRT` and peer group to MENA for now — the dynamic route is a placeholder until Phase 2. Fetch data server-side via `lib/wb/client.ts`.
5. Compose the page: metadata strip → stat grid → (histogram + trend chart side-by-side) → placeholder for peer table (Phase 2).
6. Match the visual density of `mockups/01-indicator-deep-dive.html`. Compare side-by-side in the browser.

**Stopping point**: visiting `http://localhost:3000/indicator/SH.STA.MMRT` renders the top half of the deep-dive against live data, visually close to the mockup. Human reviews. Do not proceed until approved.

---

## Phase 2 — Interactivity: filters + peer table

**Goal**: make the deep-dive respond to filter changes and show the peer table.

Tasks:

1. Build `FilterBar` as a Client Component. URL params drive state: `?peer=mena&year=2023&compare=2000`.
2. Refactor `app/indicator/[code]/page.tsx` to read URL params and pass them down. Server Component stays server-side; filter bar is a client island.
3. Build `PeerTable`:
   - Sortable columns (client-side sort, no server round-trip).
   - Sparkline column uses the `Sparkline` component from Phase 1.
   - Delta columns use `formatDelta` with color coding.
   - Home country row highlighted with a left border accent.
   - Regional average as a footer row (use WB aggregates — the API supports pseudo-country codes like `XQ` for MENA).
4. Use SWR in the peer table for client-side refetch when filters change. Route handlers already have server cache.
5. Persist "home country" in `localStorage` with a small settings gear in the top-right.

**Stopping point**: the deep-dive is fully interactive. Changing filters updates the table, charts, and stats. URL is shareable. Human reviews.

---

## Phase 3 — Country Drilldown

**Goal**: clicking a country opens a full drilldown page.

Tasks:

1. Route: `app/indicator/[code]/country/[iso]/page.tsx` (Server Component, fetches server-side).
2. Build `Breadcrumb`.
3. Build `TrajectoryChart` — the long-run country line vs regional avg, income group avg, and 2 user-selected peers. Dashed SDG target line. Event annotations (hard-coded in `lib/registry/events.ts` per country — start with 2–3 examples).
4. Build `DriverTable` with peer-median tick marks. The driver indicators come from `indicator.driverIndicators` in the registry. Peer median is computed from the current peer group.
5. Build `DataQualityPanel`. Latest observation year, uncertainty interval (if available), gap-filled year flag.
6. Build `RelatedIndicators` strip and wire it to navigation.
7. Click handlers: anywhere a country appears (peer table row, ranking list), `Cmd/Ctrl+click` opens in a new tab, regular click navigates.

**Stopping point**: full end-to-end user journey works. Human reviews.

---

## Phase 4 — Data quality, citations, export

**Goal**: surface the trust signals that matter to this audience.

Tasks:

1. Uncertainty intervals in `DataQualityPanel` for indicators where WB exposes them (maternal mortality, child mortality, HIV, etc.).
2. `ActionBar`:
   - Download CSV of the peer table (client-side, use a small CSV helper).
   - Download PNG of the chart (use `html-to-image` or Recharts' built-in SVG export).
   - "Copy citation" button — populates clipboard with the citation string from `formatCitation`.
3. Coverage warning in `FilterBar` when < 75% of peer group has data for the selected year.
4. Amber "modelled estimate" indicator on stat cards when the displayed year is post-latest-observation for that country.

**Stopping point**: a policy user could now actually use this to prepare a briefing. Human reviews.

---

## Phase 5 — Polish

- Accessibility pass: keyboard navigation on the peer table, ARIA labels on charts, focus rings that match the token system.
- Loading skeletons: proper shimmer for stat cards, skeleton rows for the peer table, dashed placeholder for charts.
- Error states: specific error messages per failure mode.
- Performance: verify the deep-dive renders in < 1.5s on a warm cache. Profile if not.
- README with screenshots and run instructions.

**Stopping point**: v1 complete per spec §10.

---

## Deferred to post-v1

Dark mode · comparator view · pinned board · advanced indicator picker for the long tail · non-WDI data sources · multilingual.
