"use client";

import { useState, useEffect } from "react";
import { addPin, removePin, hasPin } from "@/lib/board";
import type { BoardPin } from "@/lib/board";

type Props = {
  indicatorCode: string;
  indicatorName: string;
  iso3: string;
  countryName: string;
  params?: string;
  className?: string;
};

export function PinButton({
  indicatorCode,
  indicatorName,
  iso3,
  countryName,
  params,
  className,
}: Props) {
  const [pinned, setPinned] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    setPinned(hasPin(indicatorCode, iso3));
  }, [indicatorCode, iso3]);

  function toggle() {
    if (pinned) {
      removePin(`${iso3}-${indicatorCode}`);
      setPinned(false);
    } else {
      const pin: Omit<BoardPin, "id" | "pinnedAt"> = {
        indicatorCode,
        indicatorName,
        iso3,
        countryName,
        params,
      };
      addPin(pin);
      setPinned(true);
      setFlash(true);
      setTimeout(() => setFlash(false), 1500);
    }
  }

  const base =
    className ??
    "h-7 text-[11px] px-3 bg-surface border rounded transition-colors";

  const state = pinned
    ? flash
      ? "border-positive text-positive"
      : "border-info text-info hover:text-negative hover:border-negative"
    : "border-subtle text-secondary hover:text-primary hover:bg-surface-2";

  return (
    <button onClick={toggle} className={`${base} ${state}`} title={pinned ? "Remove from board" : "Pin to board"}>
      {flash ? "✓ Pinned!" : pinned ? "★ Pinned" : "☆ Pin to board"}
    </button>
  );
}
