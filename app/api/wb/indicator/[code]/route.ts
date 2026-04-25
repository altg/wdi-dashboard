import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { fetchIndicator } from "@/lib/data-source";

type Params = { params: Promise<{ code: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { code } = await params;
  const { searchParams } = req.nextUrl;

  const iso3sParam = searchParams.get("iso3s") ?? "";
  const fromParam = searchParams.get("from") ?? "2000";
  const toParam = searchParams.get("to") ?? String(new Date().getFullYear());

  const iso3s = iso3sParam ? iso3sParam.split(",").filter(Boolean) : ["all"];
  const yearRange: [number, number] = [
    parseInt(fromParam, 10),
    parseInt(toParam, 10),
  ];

  const cacheKey = `wb-indicator-${code}-${iso3s.join(",")}-${yearRange[0]}-${yearRange[1]}`;

  try {
    const getObservations = unstable_cache(
      () => fetchIndicator({ iso3s, code, yearRange }),
      [cacheKey],
      { revalidate: 3600 }
    );

    const observations = await getObservations();
    return NextResponse.json(observations);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch indicator ${code}: ${message}` },
      { status: 502 }
    );
  }
}
