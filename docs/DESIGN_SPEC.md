# WDI Dashboard — Design Spec

Status: v1.0, locked for Phase 0–1. Revisit before Phase 4.

---

## 1. Purpose & audience

A dashboard for policy analysts and government staff to explore World Bank WDI data with a "one indicator, many countries" emphasis. The user is preparing a briefing, benchmarking their country against peers, or tracking SDG progress. They need:

- Numbers they can cite with confidence (source, year, methodology visible)
- Peer-group comparison by default, not just global ranking
- Change-over-time alongside levels
- Data-quality signals (modelled vs reported, gap-filled years, uncertainty)
- Quick export (CSV, PNG, citation string)

They are not:

- Journalists looking for a narrative
- General public looking to explore
- Researchers needing the full indicator long tail (covered by WB's own tools)

---

## 2. Information architecture

Three primary views, navigable via top nav:

1. **Indicator Deep-Dive** (the default, the hero view)
   - Pick one indicator. See it across a peer group, with a benchmark year, distribution, regional trend, and a peer table.
   - Drill into any country → opens the Country Drilldown panel.
2. **Country Drilldown** (invoked from within the deep-dive)
   - One country, one indicator, with long-run trajectory vs benchmarks, driver decomposition, and data-quality notes.
3. **Pinned board** (Phase 4+)
   - User-assembled set of indicator+country combos they want to track.

Peer groups, year selection, and "home country" are persistent in URL params so views are shareable and bookmarkable.

---

## 3. Screen inventory

### 3.1 Indicator Deep-Dive (`/indicator/[code]`)

Layout, top to bottom:

- **Metadata strip** (full width): indicator name, WDI code, source, last update, SDG linkage, coverage count. Always visible. Never hidden behind a tooltip.
- **Filter bar**: peer group selector (region / income group / custom), year selector, comparison-year selector.
- **Headline row (2 cards, equal width)**:
  - Left: World/peer summary stats (4 small stat blocks) + distribution histogram with SDG line overlaid.
  - Right: Indexed regional trend chart (lines), 2000=100 or first-available-year=100.
- **Peer table** (full width): sortable, dense, one country per row. Columns: country, current value, baseline value, absolute delta, percent delta, sparkline, gap-to-target, SDG status badge. Home country row visually highlighted. Regional average as a footer row.
- **Related indicators strip**: 4–6 pre-defined related indicators for the current indicator, shown as mini-stat blocks. Click switches the deep-dive.

### 3.2 Country Drilldown (`/indicator/[code]/country/[iso]`)

Opens as a full page (not a modal — policy users want a URL they can share). Layout:

- **Breadcrumb**: Indicator › Region › Country.
- **Header**: country name + indicator, with the big current value and YoY delta on the right.
- **Long-run trajectory chart** (full width): the country's line, plus MENA/region average, income-group average, and 2 user-selected peer countries. SDG target overlaid as a dashed line. Policy-event annotations where available.
- **Driver decomposition** (60% width): a table of 4–6 "driver" indicators with the country's value, the peer median, and a tick-mark visualization showing position relative to median. Driver indicators are curated per-indicator (see §8).
- **Data quality panel** (40% width): latest observation year, uncertainty interval, underlying data source, gap-filled years, next update. Warning box if estimates are modelled.
- **Action row**: pin to board, open in comparator, download (CSV/PDF/PNG), copy citation.

### 3.3 Pinned board (`/board`) — Phase 4+

Out of scope for Phases 0–3. Deferred.

---

## 4. Component inventory

Claude Code should build these as reusable components. Not every screen needs every component in Phase 1.

| Component | Purpose | Phase |
|---|---|---|
| `MetadataStrip` | Top-of-page indicator metadata bar | 1 |
| `FilterBar` | Peer group / year / comparison-year selectors | 2 |
| `StatCard` | A single stat block (label, big number, delta) | 1 |
| `StatGrid` | Container for N stat cards | 1 |
| `DistributionHistogram` | Histogram with benchmark line overlay | 1 |
| `IndexedTrendChart` | Multi-line time series, indexed to base year | 1 |
| `PeerTable` | Dense sortable country table | 2 |
| `Sparkline` | Inline 60×16 mini-chart | 1 |
| `StatusBadge` | "on track" / "near" / "off track" pill | 1 |
| `RelatedIndicators` | Horizontal strip of indicator quick-switch cards | 3 |
| `Breadcrumb` | Navigation breadcrumb for drilldown | 3 |
| `TrajectoryChart` | Single-country long-run chart with benchmarks + annotations | 3 |
| `DriverTable` | Driver decomposition with peer-median tick marks | 3 |
| `DataQualityPanel` | Data-quality metadata + warning | 3 |
| `ActionBar` | Export/pin/citation action row | 4 |

---

## 5. Interaction patterns

- **Peer group is sticky**. Once selected, it persists in URL and is applied across indicators. The user's "home country" is a separate persistent choice (localStorage).
- **Clicking a country** anywhere (table row, map, chart legend) navigates to the country drilldown for the current indicator. `Cmd/Ctrl+click` opens in new tab.
- **Hover states on tables** highlight the full row, not just the cell.
- **Chart tooltips** show the value formatted with unit, the year, and the delta-from-prior-year.
- **Loading states**: skeleton rows for tables, shimmer boxes for stat cards, a subtle animated dashed line for charts. Never a spinner as the only feedback.
- **Errors**: if the WB API fails, show the specific failure ("World Bank API returned 503 for this indicator") plus a retry button. Never generic "something went wrong."
- **Empty states**: if a country has no data for the selected year, show a dash `—` in tables and fall back to the most recent available year in the country's own line on charts, with a "last: 2021" note.

---

## 6. Design tokens

Implemented in `tailwind.config.ts` under `theme.extend.colors`. Light mode only in v1 (dark mode: Phase 5).

```
colors.surface:          #FFFFFF
colors.surface-2:        #FAFAF8   // secondary surface, stat cards
colors.surface-3:        #F4F2EC   // subtle page background
colors.border-subtle:    rgba(0,0,0,0.08)
colors.border-strong:    rgba(0,0,0,0.18)

colors.text.primary:     #1A1A19
colors.text.secondary:   #5F5E5A
colors.text.tertiary:    #888780

colors.positive:         #3B6D11   // improvement (green)
colors.negative:         #A32D2D   // deterioration (red)
colors.warning:          #BA7517   // amber, for data quality
colors.info:             #185FA5   // blue, for SDG / benchmarks

colors.chart-1:          #0C447C   // home country / primary series
colors.chart-2:          #185FA5   // peer 1
colors.chart-3:          #534AB7   // peer 2
colors.chart-4:          #D85A30   // peer 3
colors.chart-region:     #888780   // regional average
colors.chart-incgroup:   #B4B2A9   // income-group avg (often dashed)
colors.chart-benchmark:  #0C447C   // SDG / target lines (dashed)
```

Typography:

- Font: system stack. `font-sans: ui-sans-serif, system-ui, ...`
- Tabular numerals for all data cells: `font-variant-numeric: tabular-nums`
- Sizes: 11px (dense table meta), 12px (table body), 13px (UI default), 15px (section titles), 20–22px (big stat values)
- Weights: 400 regular, 500 medium. **Never 600 or 700** — too heavy against Tailwind defaults in a dense layout.

Spacing: everything is a multiple of 4px. Card padding is 12–14px. Gap between cards is 8px.

Corner radius: 4px for inline elements (badges, chart ticks), 6px for cards, 8px for the outermost panels.

Borders: 0.5px solid `border-subtle` as default. Semantic borders use the semantic color at the same opacity.

---

## 7. Data model

### 7.1 Core types

```ts
type Indicator = {
  code: string;          // WDI indicator code, e.g. "SH.STA.MMRT"
  name: string;          // "Maternal mortality ratio"
  unit: string;          // "per 100,000 live births"
  source: string;        // "WHO / UN MMEIG"
  sourceUrl?: string;
  topic: string;         // "Health"
  sdgGoal?: number;      // 3
  sdgTarget?: string;    // "3.1"
  sdgTargetValue?: number; // 70
  sdgDirection: "lower-is-better" | "higher-is-better";
  relatedIndicators: string[];  // array of WDI codes, see §8
  driverIndicators: string[];   // array of WDI codes, see §8
  precision: number;     // decimal places for display
  coverageNote?: string; // e.g. "Modelled estimates, 2000 onward"
};

type Country = {
  iso3: string;          // "JOR"
  iso2: string;          // "JO"
  name: string;          // "Jordan"
  region: string;        // "Middle East & North Africa"
  incomeGroup: string;   // "Lower middle income"
  lendingType?: string;  // "IBRD"
};

type Observation = {
  countryIso3: string;
  indicatorCode: string;
  year: number;
  value: number | null;
  isEstimate?: boolean;  // true if modelled / gap-filled (best-effort flag)
};

type PeerGroup = {
  id: string;            // "mena", "lmic", "mena+lmic", "custom:abc"
  label: string;
  countryIso3s: string[];
};
```

### 7.2 WB API endpoints we use

- `/country` — country + region + income-group metadata (fetch once, cache for session)
- `/indicator/{code}` — indicator metadata
- `/country/{iso3}/indicator/{code}` — observations for one country
- `/country/{iso3};{iso3};.../indicator/{code}` — multi-country (preferred for peer tables)
- `/country/all/indicator/{code}` — all countries (use for distribution histograms and global ranking only; paginate with `per_page=500`)

All WB API calls take `?format=json&date=YYYY:YYYY&per_page=N`. Wrap everything in `lib/wb/client.ts` with a single `fetchIndicator({ iso3s, code, yearRange })` function.

### 7.3 Caching strategy

- Server-side: Next.js route handler wraps WB API calls, with `revalidate: 3600` (1 hour) on each.
- Client-side: SWR with `dedupingInterval: 60000`, `revalidateOnFocus: false`.
- Key shape: `["wb", "indicator", code, iso3s.join(","), yearRange.join("-")]`.

### 7.4 The indicator registry

Do not fetch the list of "supported indicators" from the WB API. Maintain a curated list in `lib/registry/indicators.ts` — see §8. This is the single source of truth for which indicators the UI exposes.

---

## 8. Curated indicator registry

V1 ships with ~40 curated indicators. Each has related + driver relationships hard-coded by a domain expert (us, now), not computed. Start with these for Phase 1–3; expand later.

### Health (SDG 3)
- `SH.STA.MMRT` Maternal mortality ratio — drivers: `SH.STA.BRTC.ZS`, `SH.STA.ANV4.ZS`, `SP.DYN.CONU.ZS`, `SP.ADO.TFRT`, `SH.XPD.CHEX.GD.ZS`
- `SH.DYN.MORT` Under-5 mortality rate — drivers: `SH.STA.BRTC.ZS`, `SH.IMM.MEAS`, `SH.STA.STNT.ZS`, `SH.H2O.BASW.ZS`
- `SP.DYN.LE00.IN` Life expectancy at birth — drivers: `SH.DYN.MORT`, `SH.XPD.CHEX.GD.ZS`, `SH.STA.STNT.ZS`
- `SH.IMM.MEAS` Measles immunization — drivers: `SH.XPD.CHEX.GD.ZS`, `SH.MED.PHYS.ZS`
- `SH.XPD.CHEX.GD.ZS` Current health expenditure (% GDP)

### Education (SDG 4)
- `SE.ADT.LITR.ZS` Adult literacy rate
- `SE.PRM.ENRR` Primary enrolment (gross)
- `SE.SEC.ENRR` Secondary enrolment (gross)
- `SE.TER.ENRR` Tertiary enrolment (gross)
- `SE.XPD.TOTL.GD.ZS` Government expenditure on education
- `SE.ENR.PRSC.FM.ZS` Gender parity index (primary+secondary)

### Economy
- `NY.GDP.MKTP.CD` GDP (current US$)
- `NY.GDP.PCAP.CD` GDP per capita (current US$)
- `NY.GDP.PCAP.KD.ZG` GDP per capita growth (annual %)
- `FP.CPI.TOTL.ZG` Inflation, consumer prices
- `SL.UEM.TOTL.ZS` Unemployment, total
- `SL.TLF.CACT.FE.ZS` Labor force participation, female
- `GC.DOD.TOTL.GD.ZS` Central government debt (% GDP)

### Poverty & inequality (SDG 1, 10)
- `SI.POV.DDAY` Poverty headcount ratio at $2.15/day
- `SI.POV.NAHC` Poverty headcount (national lines)
- `SI.POV.GINI` Gini index

### Environment & energy (SDG 7, 13)
- `EG.ELC.ACCS.ZS` Access to electricity
- `EG.FEC.RNEW.ZS` Renewable energy consumption
- `EN.ATM.CO2E.PC` CO₂ emissions per capita
- `AG.LND.FRST.ZS` Forest area (% land)
- `ER.H2O.FWTL.ZS` Freshwater withdrawal

### Infrastructure & digital (SDG 9)
- `IT.NET.USER.ZS` Individuals using the internet
- `IT.CEL.SETS.P2` Mobile cellular subscriptions
- `IS.ROD.PAVE.ZS` Paved roads
- `EG.ELC.LOSS.ZS` Electric power transmission losses

### Demographics
- `SP.POP.TOTL` Population, total
- `SP.POP.GROW` Population growth
- `SP.URB.TOTL.IN.ZS` Urban population
- `SP.DYN.TFRT.IN` Fertility rate
- `SP.POP.DPND` Age dependency ratio

### Governance (SDG 16 — partial, WB's CPIA set)
- `IQ.CPA.PROP.XQ` CPIA property rights rule-based governance
- `IQ.CPA.TRAN.XQ` CPIA transparency, accountability, corruption

Each entry in `lib/registry/indicators.ts` uses the `Indicator` type in §7.1. `driverIndicators` and `relatedIndicators` arrays are hand-curated — don't compute them.

SDG targets per indicator: hard-coded in the registry. Many WDI indicators don't have a numeric SDG target; for those, `sdgTargetValue` is `undefined` and the UI hides the SDG line and "gap to target" column.

---

## 9. Data-quality rules

The UI treats WDI data as estimates unless proven otherwise. Rules:

1. **Always display the "latest observation year"** for each country/indicator pair. It's often not the current year.
2. **Flag gap-filled data**: if we're showing a year more recent than the latest underlying observation, mark it with an amber indicator and a tooltip "Modelled estimate — last reported observation was [year]."
3. **Uncertainty intervals**: the WB API occasionally exposes these (e.g. for maternal mortality via the `SH.STA.MMRT.UB` / `SH.STA.MMRT.LB` companion indicators). When available, show them in the Data Quality panel. Do not clutter charts with error bars by default.
4. **Missing data**: render as `—` in tables. Never as `0`, never as `N/A`. Never interpolate silently in charts — leave the gap.
5. **Citation string**: always generatable. Format: `Indicator name (WDI code [code]). Source: [source]. Retrieved [date] from World Bank.`
6. **Coverage disclosure**: if fewer than 75% of countries in a peer group have data for the selected year, surface a warning in the filter bar.

---

## 10. What "done" looks like for v1

V1 is complete when a policy analyst can:

1. Open `/indicator/SH.STA.MMRT`, see the full deep-dive rendered against live WB data for their default peer group, with correct numbers matching WB's own website.
2. Switch the peer group to a different region and see the table update.
3. Click a country row → land on `/indicator/SH.STA.MMRT/country/JOR` with the trajectory chart, driver table, and data-quality panel.
4. Export a CSV of the peer table.
5. Copy a citation for the indicator.

Phases after v1 add: comparator view (2 countries side-by-side), pinned board, advanced indicator picker for the long tail, dark mode.

---

## 11. Out of scope for v1

- Authentication
- Persistent user accounts
- Sharing / permissions
- Multilingual UI (English only)
- PDF report generation (CSV + PNG export only)
- Predictive / forecasting features
- Non-WDI data (Gates, IMF, OECD, national statistics offices)
