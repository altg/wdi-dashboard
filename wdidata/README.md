# wdidata/

This folder holds the local WDI data files used by the ingest script (`npm run ingest`).

## Required file

Place **WDIEXCEL.xlsx** here before running the ingest script.

Download it from the World Bank:

```
https://databank.worldbank.org/data/download/WDI_EXCEL.zip
```

Unzip and copy `WDIEXCEL.xlsx` into this folder. The file is ~120 MB and is excluded from the repository via `.gitignore`.

## Generated files

`npm run ingest` reads `WDIEXCEL.xlsx` and produces `wdi.duckdb` in this folder. Both files are gitignored and must be generated locally.
