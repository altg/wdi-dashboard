import { STORAGE_KEYS } from "@/lib/storage-keys";

export type BoardPin = {
  id: string;
  indicatorCode: string;
  indicatorName: string;
  iso3: string;
  countryName: string;
  pinnedAt: number;
  params?: string;
};

function read(): BoardPin[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.board);
    return raw ? (JSON.parse(raw) as BoardPin[]) : [];
  } catch {
    return [];
  }
}

function write(pins: BoardPin[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.board, JSON.stringify(pins));
  } catch {}
}

export function getBoard(): BoardPin[] {
  return read();
}

export function hasPin(indicatorCode: string, iso3: string): boolean {
  return read().some((p) => p.indicatorCode === indicatorCode && p.iso3 === iso3);
}

export function addPin(pin: Omit<BoardPin, "id" | "pinnedAt">): void {
  const pins = read();
  if (pins.some((p) => p.indicatorCode === pin.indicatorCode && p.iso3 === pin.iso3)) return;
  const id = `${pin.iso3}-${pin.indicatorCode}`;
  write([...pins, { ...pin, id, pinnedAt: Date.now() }]);
}

export function removePin(id: string): void {
  write(read().filter((p) => p.id !== id));
}

export function reorderPins(fromIndex: number, toIndex: number): void {
  const pins = read();
  const next = [...pins];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  write(next);
}

export function exportBoard(): string {
  return JSON.stringify(read(), null, 2);
}

export function importBoard(json: string): BoardPin[] {
  const parsed: unknown = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error("Invalid board JSON: expected an array");
  write(parsed as BoardPin[]);
  return parsed as BoardPin[];
}
