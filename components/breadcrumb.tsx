import Link from "next/link";

type Crumb =
  | { label: string; href: string }
  | { label: string; href?: undefined };

type Props = { crumbs: Crumb[] };

export function Breadcrumb({ crumbs }: Props) {
  return (
    <nav className="flex items-baseline gap-2 text-[11px] text-tertiary mb-2">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-baseline gap-2">
          {i > 0 && <span>/</span>}
          {crumb.href ? (
            <Link href={crumb.href} className="text-info hover:underline">
              ← {crumb.label}
            </Link>
          ) : i === crumbs.length - 1 ? (
            <span className="text-primary">{crumb.label}</span>
          ) : (
            <span>{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
