import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  emoji = "🌱",
  title,
  description,
  action,
  className,
}: {
  emoji?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-sand-300 bg-white/60 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="text-3xl" aria-hidden>
        {emoji}
      </span>
      <h3 className="mt-3 font-semibold text-ink-900">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-ink-500">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
