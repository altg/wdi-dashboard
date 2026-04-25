import clsx from "clsx";

export type StatCardProps = {
  label: string;
  value: string;
  sub?: string;
  subVariant?: "positive" | "negative" | "warning" | "muted";
  modelled?: boolean;
};

export function StatCard({ label, value, sub, subVariant = "muted", modelled }: StatCardProps) {
  const subClass = {
    positive: "text-positive",
    negative: "text-negative",
    warning: "text-warning",
    muted: "text-tertiary",
  }[subVariant];

  return (
    <div className="bg-surface-2 rounded-md p-3">
      <div className="uppercase text-[10px] tracking-[0.5px] text-tertiary leading-tight flex items-center gap-1">
        {label}
        {modelled && (
          <span
            className="inline-block px-1 rounded-[2px] text-[9px] font-medium bg-[rgba(186,117,23,0.15)] text-warning leading-tight"
            title="Modelled estimate — not directly observed"
          >
            est.
          </span>
        )}
      </div>
      <div className="text-[20px] font-medium mt-0.5 tabular-nums text-primary leading-none">
        {value}
      </div>
      {sub && (
        <div className={clsx("text-[11px] mt-0.5 tabular-nums", subClass)}>{sub}</div>
      )}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-surface-2 rounded-md p-3 animate-pulse">
      <div className="h-2 w-14 bg-surface rounded" />
      <div className="h-5 w-20 bg-surface rounded mt-2" />
      <div className="h-2 w-10 bg-surface rounded mt-2" />
    </div>
  );
}

export type StatGridProps = {
  children: React.ReactNode;
  cols?: number;
};

export function StatGrid({ children, cols = 4 }: StatGridProps) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
    >
      {children}
    </div>
  );
}
