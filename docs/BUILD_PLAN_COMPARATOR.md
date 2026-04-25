# Build Plan — Comparator View

Standalone post-v1 feature. Implement this plan **in order**, stopping at each checkpoint for human review before continuing.

Read `docs/DESIGN_SPEC.md` and `docs/BUILD_PLAN.md` before starting. Follow all coding conventions in `CLAUDE.md`.

---

## What we are building

A **side-by-side country comparator** for a single indicator: two countries (A and B), showing their trajectories, current values, deltas, and driver decomposition in parallel columns. Entry point is the "Open in comparator" button in `ActionBar` on the country drilldown page.

Route: `/indicator/[code]/compare?a=[iso3]&b=[iso3]`

The comparator is a full page (not a modal) so URLs are shareable.

---

## Phase C1 — Route, URL state, and entry point

**Goal**: the route exists, resolves without errors, and the "Open in comparator" button in `ActionBar` navigates to it correctly.

### Tasks

1. **Enable the button in `ActionBar`** (`components/action-bar.tsx`).
   - Replace the `disabled` stub with a real link. The country drilldown already knows `countryIso3` — use it as the `a` param.
   - Use `useRouter` + `useSearchParams` (it is already a Client Component) to build the URL:
     `/indicator/${indicator.code}/compare?a=${countryIso3}&year=${currentYear}&peer=${peerGroupId}`
   - Leave `b` unset for now — the comparator page will prompt the user to pick a second country.
   - Keep "Pin to board" disabled (out of scope here).

2. **Create the page** `app/indicator/[code]/compare/page.tsx` as a **Server Component**.
   - Read `params.code`, `searchParams.a`, `searchParams.b`, `searchParams.year`, `searchParams.peer`.
   - Validate: if `code` is not in the registry → `notFound()`. If `a` is missing → redirect to `/indicator/${code}`.
   - Clamp `year` to `[MIN_YEAR, MAX_YEAR]` same as the deep-dive page.
   - For now, render a placeholder `<div>Comparator coming soon — A: {a}, B: {b ?? "not set"}</div>` with a back link to the deep-dive.

3. **Create `app/api/wb/countries/route.ts`** if it does not already exist.
   - This endpoint returns the WB country list (`/country?format=json&per_page=300`) as `{ iso3: string; name: string }[]`.
   - Cache with `revalidate: 86400` (countries change rarely).
   - The country picker in Phase C2 will call this.

4. Run `npx tsc --noEmit`. Fix all type errors before stopping.

**Checkpoint C1**: visiting `/indicator/SH.STA.MMRT/compare?a=JOR` renders the placeholder page without errors. The "Open in comparator" button on the Jordan drilldown navigates there. TypeScript clean.

---

## Phase C2 — Country picker

**Goal**: the user can search for and select country B (and optionally swap or replace country A).

### Tasks

1. **Create `components/country-picker.tsx`** — a Client Component.
   - Props: `value: string | null`, `onChange: (iso3: string) => void`, `label: string` (e.g. "Country A").
   - Fetches country list from `/api/wb/countries` via SWR on mount (cache with `dedupingInterval: 3_600_000`).
   - Renders a `<input type="search">` with a dropdown list of matching countries (filter by name prefix, case-insensitive). Show ISO3 code in muted text next to each name.
   - On selection, calls `onChange` with the selected ISO3.
   - Keyboard: ArrowDown/ArrowUp to move through results, Enter to select, Escape to close. `role="combobox"`, `aria-expanded`, `aria-activedescendant` — follow WAI-ARIA combobox pattern.
   - Loading state: skeleton input while country list loads. Error state: "Countries unavailable" in warning color.

2. **Wire picker into the comparator page**.
   - The comparator page is a Server Component — extract the interactive header into a Client Component `components/comparator-header.tsx`.
   - `ComparatorHeader` receives `code`, `isoA`, `isoB | null`, `year`, `peerGroupId` as props.
   - It renders two `CountryPicker`s (one pre-filled with country A, one empty/pre-filled with B).
   - On change, it updates URL params with `router.push` (replace, not push, to avoid back-button clutter): `/indicator/${code}/compare?a=${isoA}&b=${isoB}&year=${year}&peer=${peer}`.
   - Also renders a swap button (⇄) between the two pickers that swaps A and B in the URL.

3. Run `npx tsc --noEmit`. Fix all type errors.

**Checkpoint C2**: the comparator page shows two country pickers. Selecting a country in either updates the URL. Swapping works. TypeScript clean.

---

## Phase C3 — Data layer and server fetch

**Goal**: the comparator page fetches all data it needs server-side before rendering, passing it as `initialData` to client components (same pattern as `PeerTable`).

### Data needed per country (A and B):

| Data | WB API call | Already exists? |
|---|---|---|
| Trajectory observations (2000→year) | multi-country indicator fetch | `getRegionTrend` is close but fetches aggregates; reuse `getPeerGroupHistory` pattern |
| Region average observations | same as deep-dive (`getRegionTrend`) | yes — `lib/wb/cache.ts` |
| Income-group average | same as country drilldown | yes — already fetched in country drilldown page |
| Driver indicator observations (latest year) | multi-indicator fetch for each driver | yes — fetched in country drilldown |
| Country metadata (name, region, income group) | `/api/wb/countries` or registry | needs a new `getCountryMeta` helper |

### Tasks

1. **Add `getCountryMeta(iso3: string): Promise<{ name: string; region: string; incomeGroup: string } | null>`** to `lib/wb/cache.ts` (or a new `lib/wb/countries.ts`).
   - Calls the WB `/country/${iso3}` endpoint.
   - Returns `null` if the country is not found (so the page can handle unknown ISO3s gracefully).
   - Cache with `unstable_cache`, TTL 86400.

2. **Add `getCountryTrajectory(indicatorCode: string, iso3: string, fromYear: number, toYear: number): Promise<Observation[]>`** to `lib/wb/cache.ts`.
   - Wraps `fetchIndicator` for a single country over a year range.
   - Cache key includes all four params.
   - TTL 3600 (same as other caches).

3. **Update `app/indicator/[code]/compare/page.tsx`** to fetch in parallel when both A and B are present:
   ```
   const [metaA, metaB, trajA, trajB, regionObs, driverObsA, driverObsB] = await Promise.all([...])
   ```
   - If `a` is invalid (country not found), redirect to `/indicator/${code}`.
   - If `b` is set but invalid, render the picker with an error note, but still render country A's data.
   - Pass all fetched data as props to the layout components (built in Phase C4).

4. Run `npx tsc --noEmit`. Fix all type errors.

**Checkpoint C3**: the page fetches real data. Add a temporary `<pre>{JSON.stringify(metaA, null, 2)}</pre>` to confirm correct data before removing it. TypeScript clean.

---

## Phase C4 — Comparator layout

**Goal**: the comparator renders the side-by-side layout with real data.

### Layout spec (top to bottom)

```
┌─────────────────────────────────────────────────────────────────┐
│  MetadataStrip (full width, same as deep-dive)                  │
├─────────────────────────────────────────────────────────────────┤
│  ComparatorHeader: [CountryPicker A] ⇄ [CountryPicker B]  year  │
├────────────────────────────┬────────────────────────────────────┤
│  Country A column          │  Country B column                  │
│  ─ big current value       │  ─ big current value               │
│  ─ YoY delta               │  ─ YoY delta                       │
│  ─ vs region avg           │  ─ vs region avg                   │
│  ─ SDG status badge        │  ─ SDG status badge                │
├────────────────────────────┴────────────────────────────────────┤
│  Trajectory chart (full width): A line + B line + region avg    │
│  + income-group avg + SDG dashed line                           │
├────────────────────────────┬────────────────────────────────────┤
│  Driver table (A)          │  Driver table (B)                  │
│  same design as drilldown  │  same design as drilldown          │
└────────────────────────────┴────────────────────────────────────┘
```

### Tasks

1. **Create `components/comparator-stat-column.tsx`** — renders the big value, YoY delta, vs-region-avg delta, and `StatusBadge` for one country. Props: `countryName`, `value`, `prevValue`, `regionAvg`, `indicator`. Reuse `StatCard` and `formatNumber`/`formatDelta` from existing helpers.

2. **Adapt `TrajectoryChart`** for two-country mode. The existing `TrajectoryChart` in `components/trajectory-chart.tsx` renders one country line vs benchmarks. Add an optional `countryBObs?: Observation[]` prop and `countryBName?: string`. When present, render a second country line in `chart-3` color (`#534AB7`). Do not break the single-country usage on the drilldown page.

3. **Adapt `DriverTable`** for comparator use. The existing `DriverTable` computes peer-median ticks from the current peer group. For the comparator it just needs to show two columns of values side by side. Add an optional `compareValue?: number | null` prop to each driver row — rendered as a second tick in `chart-3` color. Do not break the single-country usage.

4. **Assemble `app/indicator/[code]/compare/page.tsx`** using the above components. Use a 2-column CSS grid (`grid-cols-2 gap-2`) for the stat columns and driver tables. The trajectory chart and metadata strip are full-width.

5. Add a breadcrumb: `{indicator.name} › Compare › {countryA} vs {countryB}`. Reuse the existing `Breadcrumb` component.

6. Handle the case where `b` is not yet set: render country A's full column + an empty country B column with the picker prominently centered and a "Select a country to compare" prompt.

7. Run `npx tsc --noEmit`. Fix all type errors.

**Checkpoint C4**: the full comparator layout renders for `/indicator/SH.STA.MMRT/compare?a=JOR&b=TUN`. Both columns show real values and the trajectory chart shows two lines. TypeScript clean. Verify in browser.

---

## Phase C5 — Polish and loading states

**Goal**: loading, error, and empty states are handled consistently. Accessibility pass.

### Tasks

1. **Loading skeletons**: wrap the stat columns and driver tables in `<Suspense>` fallbacks using `StatCardSkeleton` shimmer blocks. The trajectory chart should show a dashed animated placeholder (same pattern as the deep-dive).

2. **Error states**: if either country's trajectory fetch fails, show an inline error inside that column ("Data unavailable for {countryName}") with a retry button — do not collapse the entire page.

3. **Accessibility**:
   - `CountryPicker` WAI-ARIA combobox pattern (already specified in C2 but verify it's complete: `aria-label`, `role="option"`, `aria-selected`).
   - The comparator trajectory chart: `role="img"` + `aria-label` describing what the chart shows (same pattern as existing charts).
   - Swap button: `aria-label="Swap countries"`.
   - Both stat columns: wrap in `<section aria-label="{countryName}">`.

4. **URL sync**: when the user uses the browser back button, the comparator should reflect the previous A/B selection (it will, naturally, because we use URL params — verify this works).

5. **Page title**: export `generateMetadata` from the compare page:
   ```ts
   export async function generateMetadata({ params, searchParams }) {
     // return { title: `${indicatorName}: ${countryA} vs ${countryB} — WDI Dashboard` }
   }
   ```

6. Run `npx tsc --noEmit`. Verify in browser: navigate from Jordan drilldown → "Open in comparator" → pick Tunisia → confirm both columns render, trajectory chart shows two lines, swap works, back button works.

**Checkpoint C5**: feature complete. Policy user can open the comparator from any country drilldown, pick a peer, and see a side-by-side comparison with trajectory, stat summary, and driver breakdown. TypeScript clean.

---

## Files created / modified

| File | Action |
|---|---|
| `components/action-bar.tsx` | modify — enable "Open in comparator" button |
| `app/indicator/[code]/compare/page.tsx` | create |
| `app/api/wb/countries/route.ts` | create (if not exists) |
| `lib/wb/cache.ts` | modify — add `getCountryMeta`, `getCountryTrajectory` |
| `components/country-picker.tsx` | create |
| `components/comparator-header.tsx` | create |
| `components/comparator-stat-column.tsx` | create |
| `components/trajectory-chart.tsx` | modify — add optional `countryBObs` prop |
| `components/driver-table.tsx` | modify — add optional `compareValue` per row |

---

## Things NOT to do

- Do not introduce a global state manager (Redux, Zustand, Context) for comparator state — URL params are the source of truth.
- Do not copy the `TrajectoryChart` or `DriverTable` into new components — modify the existing ones with backwards-compatible optional props.
- Do not fetch data on the client for the initial render — fetch server-side and pass as `initialData`.
- Do not add a "save comparison" or "share" feature — URL is already shareable.
- Do not implement "Pin to board" as part of this plan — it is a separate post-v1 feature.
