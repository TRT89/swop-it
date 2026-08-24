import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid size-8 place-items-center rounded-lg bg-moss-600 text-base font-bold text-white">
        S
      </span>
      <span className="text-lg font-bold tracking-tight text-ink-900">
        Swop<span className="text-moss-600">-it</span>
      </span>
    </Link>
  );
}
