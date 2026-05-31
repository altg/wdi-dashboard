# WDI Dashboard

A local-first dashboard for exploring World Bank **World Development Indicators** (WDI). Built for policy analysts and government staff. Dense, data-rich layout with peer-group comparisons, SDG benchmarks, and data-quality signals.

## Stack

- **Next.js 14** — App Router, Server Components, TypeScript strict mode
- **Tailwind CSS** — custom token layer (`bg-surface`, `text-primary`, etc.)
- **Recharts** — all charts
- **SWR** — client-side data fetching and caching
- **Zod** — runtime validation of World Bank API responses

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. Navigate to any indicator, e.g.:

```
/indicator/SH.STA.MMRT    — Maternal mortality
/indicator/SE.ADT.LITR.ZS — Adult literacy rate
/indicator/EG.ELC.ACCS.ZS — Access to electricity
```

## Local data mode (optional)

For offline use or faster responses, load WDI data into DuckDB:

1. Download `WDIEXCEL.xlsx` from the World Bank data portal
2. Place it in `D:\Projects\AI\WDI2\`
3. Run the ingest script:
   ```
   D:\Projects\AI\WDI2\ingest.bat
   ```
4. Set the environment variable and restart:
   ```bash
   DATA_SOURCE=local npm run dev
   ```

## Features

- **Indicator deep-dive** — metadata strip, headline stat cards, SDG gap tracking
- **Distribution histogram** — adaptive bin widths, SDG target reference line, color-coded by distance to target
- **Regional trend chart** — indexed to 2000 baseline across MENA / South Asia / Sub-Saharan Africa / Latin America / High income
- **Peer table** — sortable by any column, sparklines, CSV export, home-country highlight, full keyboard navigation (Tab + Arrow keys + Enter to drill in)
- **Custom peer groups** — build any group from 6 starter templates (income bands, regions, custom), saved to localStorage
- **Country profile** — header stats (population, GDP, life expectancy), SDG on-track summary, per-indicator tile grid
- **Country drilldown** — trajectory vs regional and income group averages, driver indicators, policy event annotations
- **Pinned board** — pin country × indicator snapshots, drag-to-reorder, JSON export/import
- **Briefing PDF export** — `/board/print` renders a cover page + per-pin detail pages with trend charts; auto-opens the print dialog
- **Command palette** — press `Cmd K` (or `Ctrl K`) from anywhere to search indicators and countries by name or code
- **Recently viewed** — the home page shows a strip of recently visited indicators and country profiles
- **Data quality signals** — coverage warnings, modelled estimate badges, uncertainty intervals
- **Dark mode** — automatic via system preference, toggle in the nav bar

## Data source

Live from the World Bank WDI API via Next.js route handlers (avoids CORS, adds 1-hour server cache). No API key required.
