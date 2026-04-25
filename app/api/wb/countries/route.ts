import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchAllCountries } from "@/lib/wb/client";

const getCachedCountries = unstable_cache(
  async () => fetchAllCountries(),
  ["wb-countries"],
  { revalidate: 3600 }
);

export async function GET() {
  try {
    const countries = await getCachedCountries();
    return NextResponse.json(countries);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch countries: ${message}` },
      { status: 502 }
    );
  }
}
