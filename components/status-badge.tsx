import clsx from "clsx";

export type StatusBadgeStatus = "on-track" | "near" | "off-track" | "no-target";

export type StatusBadgeProps = {
  status: StatusBadgeStatus;
};

const CONFIG: Record<StatusBadgeStatus, { label: string; className: string }> = {
  "on-track": {
    label: "on track",
    className: "bg-[#EAF3DE] text-[#27500A] dark:bg-[#1b3a10] dark:text-[#6BAF3F]",
  },
  near: {
    label: "near",
    className: "bg-[#FAEEDA] text-[#633806] dark:bg-[#3a2810] dark:text-[#E09B3A]",
  },
  "off-track": {
    label: "off track",
    className: "bg-[#FCEBEB] text-[#791F1F] dark:bg-[#3a1010] dark:text-[#E06060]",
  },
  "no-target": {
    label: "—",
    className: "bg-surface-2 text-tertiary",
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = CONFIG[status];
  return (
    <span
      className={clsx(
        "inline-block px-1.5 py-0.5 rounded-[3px] text-[10px] font-medium",
        className
      )}
    >
      {label}
    </span>
  );
}

export function sdgStatus(
  value: number | null,
  target: number | undefined,
  direction: "lower-is-better" | "higher-is-better"
): StatusBadgeStatus {
  if (value === null || target === undefined) return "no-target";
  const met =
    direction === "lower-is-better" ? value <= target : value >= target;
  const near =
    direction === "lower-is-better"
      ? value <= target * 1.2
      : value >= target * 0.8;
  if (met) return "on-track";
  if (near) return "near";
  return "off-track";
}
