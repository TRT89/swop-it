"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

function useActive(href: string) {
  const pathname = usePathname();
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const active = useActive(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-sand-200 text-ink-900" : "text-ink-600 hover:bg-sand-100 hover:text-ink-900",
      )}
    >
      {children}
    </Link>
  );
}

export function MobileNavLink({
  href,
  label,
  icon,
  badge = 0,
  highlight = false,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  highlight?: boolean;
}) {
  const active = useActive(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium"
    >
      <span
        className={cn(
          "grid size-8 place-items-center rounded-full transition-colors",
          highlight
            ? "bg-moss-600 text-white"
            : active
              ? "text-moss-700"
              : "text-ink-500",
        )}
      >
        {icon}
      </span>
      <span className={cn(active && !highlight ? "text-moss-700" : "text-ink-500")}>
        {label}
      </span>
      {badge > 0 ? (
        <span className="absolute right-1/2 top-1.5 -mr-3 grid min-w-4 place-items-center rounded-full bg-clay-500 px-1 text-[10px] font-bold leading-4 text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
