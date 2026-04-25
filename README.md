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
- **Peer table** — sortable by any column, sparklines, CSV export, home-country highlight, full keyboard navigation (Tab + Arrow keys)
- **Country drilldown** — trajectory vs regional and income group averages, driver indicators, policy event annotations
- **Data quality signals** — coverage warnings, modelled estimate badges, uncertainty intervals
- **Dark mode** — automatic via system preference

## Data source

Live from the World Bank WDI API via Next.js route handlers (avoids CORS, adds 1-hour server cache). No API key required.
