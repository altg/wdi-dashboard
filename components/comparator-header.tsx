"use client";

import { useRouter } from "next/navigation";
import { CountryPicker } from "@/components/country-picker";

type Props = {
  code: string;
  isoA: string;
  isoB: string | null;
  year: number;
  peerGroupId: string;
};

export function ComparatorHeader({ code, isoA, isoB, year, peerGroupId }: Props) {
  const router = useRouter();

  function navigate(a: string, b: string | null) {
    const params = new URLSearchParams({ a });
    if (b) params.set("b", b);
    params.set("year", String(year));
    params.set("peer", peerGroupId);
    router.replace(`/indicator/${code}/compare?${params}`);
  }

  function handleSwap() {
    if (isoB) navigate(isoB, isoA);
  }

  return (
    <div className="flex items-end gap-3 mb-4 py-3 border-b border-subtle">
      <CountryPicker
        value={isoA}
        onChange={(iso) => navigate(iso, isoB)}
        label="Country A"
      />

      <button
        onClick={handleSwap}
        disabled={!isoB}
        aria-label="Swap countries"
        className="h-8 px-2 mb-0 text-[13px] bg-surface border border-subtle rounded text-secondary hover:text-primary hover:bg-surface-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        ⇄
      </button>

      <CountryPicker
        value={isoB}
        onChange={(iso) => navigate(isoA, iso)}
        label="Country B"
      />

      <div className="ml-auto text-[11px] text-tertiary">
        Year: <span className="text-primary font-medium">{year}</span>
      </div>
    </div>
  );
}
