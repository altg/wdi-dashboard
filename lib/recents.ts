import { STORAGE_KEYS } from "@/lib/storage-keys";

export type RecentEntry =
  | { kind: "indicator"; code: string; ts: number }
  | { kind: "country"; iso: string; ts: number }
  | { kind: "compare"; code: string; iso: string; ts: number };

const MAX_RECENTS = 20;

function isSameEntry(a: RecentEntry, b: RecentEntry): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "indicator" && b.kind === "indicator") return a.code === b.code;
  if (a.kind === "country" && b.kind === "country") return a.iso === b.iso;
  if (a.kind === "compare" && b.kind === "compare") return a.code === b.code && a.iso === b.iso;
  return false;
}

export function pushRecent(entry: Omit<RecentEntry, "ts">): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.recents);
    const existing: RecentEntry[] = raw ? (JSON.parse(raw) as RecentEntry[]) : [];
    const withTs = { ...entry, ts: Date.now() } as RecentEntry;
    const next = [withTs, ...existing.filter((e) => !isSameEntry(e, withTs))].slice(
      0,
      MAX_RECENTS
    );
    window.localStorage.setItem(STORAGE_KEYS.recents, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function getRecents(): RecentEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.recents);
    return raw ? (JSON.parse(raw) as RecentEntry[]) : [];
  } catch {
    return [];
  }
}
