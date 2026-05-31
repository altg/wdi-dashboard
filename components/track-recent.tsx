"use client";

import { useEffect } from "react";
import { pushRecent } from "@/lib/recents";

type Props =
  | { kind: "indicator"; code: string }
  | { kind: "country"; iso: string }
  | { kind: "compare"; code: string; iso: string };

export function TrackRecent(props: Props) {
  useEffect(() => {
    pushRecent(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
