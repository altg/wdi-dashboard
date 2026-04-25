"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { getIndicator } from "@/lib/registry/indicators";
import { formatNumber } from "@/lib/format";
import type { Observation } from "@/lib/wb/client";

const HOME_KEY = "wdi_home_country";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API ${r.status}`);
    return r.json() as Promise<Observation[]>;
  });

function RelatedCard({
  code,
  homeIso3,
  selectedYear,
  onClick,
}: {
  code: string;
  homeIso3: string;
  selectedYear: string;
  onClick: () => void;
}) {
  const indicator = getIndicator(code);
  const swrKey =
    homeIso3 && indicator
      ? `/api/wb/indicator/${code}?iso3s=${homeIso3}&from=${selectedYear}&to=${selectedYear}`
      : null;
  const { data, isLoading, error } = useSWR<Observation[]>(swrKey, fetcher, {
    dedupingInterval: 120_000,
    revalidateOnFocus: false,
  });

  if (!indicator) return null;

  const obs = data?.find((o) => o.value !== null);
  const value = obs?.value ?? null;

  return (
    <button
      onClick={onClick}
      className="bg-surface-2 hover:bg-surface border border-subtle rounded-md p-3 text-left transition-colors w-full"
    >
      <div className="uppercase text-[10px] tracking-[0.5px] text-tertiary truncate font-mono">
        {code}
      </div>
      <div
        className="text-[12px] text-primary font-medium mt-1 leading-tight"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {indicator.name}
      </div>
      {isLoading && homeIso3 ? (
        <div className="h-4 w-10 bg-surface rounded animate-pulse mt-1.5" />
      ) : error ? (
        <div className="text-[11px] text-warning mt-1.5">unavailable</div>
      ) : (
        <div className="text-[13px] font-medium text-primary tabular-nums mt-1.5">
          {value !== null ? formatNumber(value, { precision: indicator.precision }) : "—"}
        </div>
      )}
      <div className="text-[10px] text-tertiary truncate">{indicator.unit}</div>
    </button>
  );
}

type Props = {
  relatedCodes: string[];
  currentCode: string;
};

export function RelatedIndicators({ relatedCodes, currentCode }: Props) {
  const [homeIso3, setHomeIso3] = useState("");
  const router = useRouter();
  const sp = useSearchParams();
  const selectedYear = sp.get("year") ?? "2023";

  useEffect(() => {
    const stored = localStorage.getItem(HOME_KEY);
    if (stored) setHomeIso3(stored);
  }, []);

  if (relatedCodes.length === 0) return null;

  function navigate(code: string) {
    const params = new URLSearchParams(sp.toString());
    router.push(`/indicator/${code}?${params.toString()}`);
  }

  return (
    <div className="bg-surface border border-subtle rounded-md p-3.5">
      <div className="flex justify-between items-baseline mb-2.5">
        <div className="font-medium text-primary">Related indicators</div>
        {homeIso3 && (
          <div className="text-[11px] text-tertiary">
            Values for {homeIso3} · {selectedYear}
          </div>
        )}
      </div>
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${Math.min(relatedCodes.length, 5)}, 1fr)` }}
      >
        {relatedCodes.slice(0, 5).map((code) => (
          <RelatedCard
            key={code}
            code={code}
            homeIso3={homeIso3}
            selectedYear={selectedYear}
            onClick={() => navigate(code)}
          />
        ))}
      </div>
    </div>
  );
}
