"use client";

import { useRef } from "react";

type Props = {
  min: number;
  max: number;
  from: number;
  to: number;
  onChange: (from: number, to: number) => void;
};

export function YearRangeSlider({ min, max, from, to, onChange }: Props) {
  const range = max - min;
  const fromPct = ((from - min) / range) * 100;
  const toPct = ((to - min) / range) * 100;

  const trackRef = useRef<HTMLDivElement>(null);

  // Always-fresh values for the pointer-event closures (avoids stale capture).
  const liveRef = useRef({ from, to, onChange });
  liveRef.current = { from, to, onChange };

  function pxToYear(clientX: number): number {
    if (!trackRef.current) return min;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return Math.round(min + (x / rect.width) * range);
  }

  function makeDragHandler(thumb: "from" | "to") {
    return function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
      e.preventDefault();
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);

      function onMove(ev: PointerEvent) {
        const year = pxToYear(ev.clientX);
        const { from: f, to: t, onChange: cb } = liveRef.current;
        if (thumb === "from") {
          cb(Math.max(min, Math.min(year, t - 1)), t);
        } else {
          cb(f, Math.min(max, Math.max(year, f + 1)));
        }
      }

      function onUp() {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
      }

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
    };
  }

  const thumbCls =
    "absolute w-[13px] h-[13px] rounded-full bg-info border-2 border-surface shadow-sm cursor-grab active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-info";

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] tabular-nums text-secondary w-[30px] text-right">
        {from}
      </span>

      <div
        ref={trackRef}
        className="relative flex items-center"
        style={{ width: 140, height: 20 }}
      >
        {/* Track */}
        <div
          className="absolute inset-x-0 h-[3px] rounded-full pointer-events-none"
          style={{
            background: `linear-gradient(to right,
              rgba(136,135,128,0.3) ${fromPct}%,
              #185FA5 ${fromPct}%,
              #185FA5 ${toPct}%,
              rgba(136,135,128,0.3) ${toPct}%)`,
          }}
        />

        {/* From thumb */}
        <div
          role="slider"
          aria-label="Start year"
          aria-valuenow={from}
          aria-valuemin={min}
          aria-valuemax={to - 1}
          tabIndex={0}
          className={thumbCls}
          style={{ left: `calc(${fromPct}% - 6.5px)`, zIndex: 2, touchAction: "none" }}
          onPointerDown={makeDragHandler("from")}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") onChange(Math.max(min, from - 1), to);
            if (e.key === "ArrowRight") onChange(Math.min(from + 1, to - 1), to);
          }}
        />

        {/* To thumb */}
        <div
          role="slider"
          aria-label="End year"
          aria-valuenow={to}
          aria-valuemin={from + 1}
          aria-valuemax={max}
          tabIndex={0}
          className={thumbCls}
          style={{ left: `calc(${toPct}% - 6.5px)`, zIndex: 2, touchAction: "none" }}
          onPointerDown={makeDragHandler("to")}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") onChange(from, Math.max(from + 1, to - 1));
            if (e.key === "ArrowRight") onChange(from, Math.min(max, to + 1));
          }}
        />
      </div>

      <span className="text-[10px] tabular-nums text-secondary w-[30px]">
        {to}
      </span>
    </div>
  );
}
