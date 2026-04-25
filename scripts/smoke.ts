import { fetchIndicator } from "../lib/wb/client";

async function main() {
  const iso3s = ["JOR", "MAR", "TUN"];
  const code = "SH.STA.MMRT";
  const yearRange: [number, number] = [2000, 2023];

  console.log(`Fetching ${code} for ${iso3s.join(", ")} — ${yearRange[0]}–${yearRange[1]}\n`);

  const observations = await fetchIndicator({ iso3s, code, yearRange });

  if (observations.length === 0) {
    console.error("No observations returned — check API connectivity.");
    process.exit(1);
  }

  // Sort by country then year
  observations.sort((a, b) =>
    a.countryIso3.localeCompare(b.countryIso3) || a.year - b.year
  );

  let currentCountry = "";
  for (const obs of observations) {
    if (obs.countryIso3 !== currentCountry) {
      currentCountry = obs.countryIso3;
      console.log(`\n${obs.countryName} (${obs.countryIso3}):`);
      console.log("  Year  Value");
      console.log("  ----  -----");
    }
    const val = obs.value !== null ? obs.value.toString() : "—";
    console.log(`  ${obs.year}  ${val}`);
  }

  console.log("\nSmoke test passed.");
}

main().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
