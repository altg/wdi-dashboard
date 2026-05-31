"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBoard, removePin, reorderPins, exportBoard, importBoard } from "@/lib/board";
import type { BoardPin } from "@/lib/board";

export default function BoardPage() {
  const [pins, setPins] = useState<BoardPin[]>(() => getBoard());
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const dragSrc = useRef<number | null>(null);

  function handleRemove(id: string) {
    removePin(id);
    setPins(getBoard());
  }

  function handleExport() {
    const json = exportBoard();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wdi-board.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = importBoard(ev.target?.result as string);
        setPins(imported);
        setImportError(null);
      } catch {
        setImportError("Invalid file — expected a JSON array of board pins.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function onDragStart(index: number) {
    dragSrc.current = index;
  }

  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragSrc.current === null || dragSrc.current === index) return;
    reorderPins(dragSrc.current, index);
    dragSrc.current = index;
    setPins(getBoard());
  }

  function onDragEnd() {
    dragSrc.current = null;
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[15px] font-semibold text-primary">Pinned Board</h1>
          <p className="text-[11px] text-tertiary mt-0.5">
            {pins.length === 0
              ? "No pins yet — visit a country drilldown and click \"Pin to board\"."
              : `${pins.length} pin${pins.length === 1 ? "" : "s"} · drag to reorder`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/board/print")}
            disabled={pins.length === 0}
            className="h-7 text-[11px] px-3 bg-surface border border-subtle rounded text-secondary hover:text-primary hover:bg-surface-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ⎙ Print / Export PDF
          </button>
          <button
            onClick={handleExport}
            disabled={pins.length === 0}
            className="h-7 text-[11px] px-3 bg-surface border border-subtle rounded text-secondary hover:text-primary hover:bg-surface-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ↓ Export JSON
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="h-7 text-[11px] px-3 bg-surface border border-subtle rounded text-secondary hover:text-primary hover:bg-surface-2 transition-colors"
          >
            ↑ Import JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
      </div>

      {importError && (
        <div className="mb-4 px-3 py-2 rounded border border-[#A32D2D] bg-[#fdf2f2] text-[11px] text-negative">
          {importError}
        </div>
      )}

      {/* Empty state */}
      {pins.length === 0 && (
        <div className="border border-dashed border-subtle rounded-lg px-8 py-16 text-center">
          <div className="text-[28px] mb-3 text-tertiary select-none">☆</div>
          <p className="text-[12px] font-medium text-secondary mb-1">Your board is empty</p>
          <p className="text-[11px] text-tertiary">
            Open any{" "}
            <Link href="/" className="text-info hover:underline">
              indicator
            </Link>{" "}
            and drill into a country, then click <strong>Pin to board</strong>.
          </p>
        </div>
      )}

      {/* Pin grid */}
      {pins.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pins.map((pin, i) => (
            <PinCard
              key={pin.id}
              pin={pin}
              index={i}
              onRemove={handleRemove}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}
    </main>
  );
}

type CardProps = {
  pin: BoardPin;
  index: number;
  onRemove: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
};

function PinCard({ pin, index, onRemove, onDragStart, onDragOver, onDragEnd }: CardProps) {
  const href = `/indicator/${pin.indicatorCode}/country/${pin.iso3}${pin.params ? `?${pin.params}` : ""}`;
  const pinnedDate = new Date(pin.pinnedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      className="group relative bg-surface border border-subtle rounded-md p-3 hover:border-[rgba(0,0,0,0.18)] hover:shadow-sm transition-all cursor-grab active:cursor-grabbing"
    >
      {/* Drag handle + remove */}
      <div className="flex items-start justify-between mb-2">
        <span className="text-tertiary text-[14px] leading-none select-none" aria-hidden="true">
          ⠿
        </span>
        <button
          onClick={() => onRemove(pin.id)}
          className="text-[11px] text-tertiary hover:text-negative transition-colors leading-none"
          aria-label="Remove pin"
          title="Remove pin"
        >
          ×
        </button>
      </div>

      {/* Country */}
      <div className="text-[13px] font-semibold text-primary leading-snug">
        {pin.countryName}
      </div>
      <div className="text-[10px] font-mono text-tertiary mb-2">{pin.iso3}</div>

      {/* Indicator */}
      <div className="text-[11px] text-secondary leading-snug line-clamp-2 mb-1">
        {pin.indicatorName}
      </div>
      <code className="text-[10px] font-mono text-tertiary">{pin.indicatorCode}</code>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-subtle">
        <span className="text-[10px] text-tertiary">Pinned {pinnedDate}</span>
        <Link
          href={href}
          className="text-[10px] text-info hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Open →
        </Link>
      </div>
    </div>
  );
}
