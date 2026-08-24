import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/** Compact rating for tight spaces: one star and the number. */
export function StarValue({
  rating,
  className,
}: {
  rating: number | null;
  className?: string;
}) {
  if (rating == null) return null;
  return (
    <span
      className={cn("inline-flex items-center gap-0.5 text-xs text-ink-600", className)}
    >
      <Star size={11} className="fill-amber-400 text-amber-400" aria-hidden />
      <span className="font-medium">{rating.toFixed(1)}</span>
      <span className="sr-only">out of 5</span>
    </span>
  );
}

export function Stars({
  rating,
  count,
  size = 14,
  className,
}: {
  rating: number | null;
  count?: number;
  size?: number;
  className?: string;
}) {
  if (rating == null) {
    return <span className={cn("text-xs text-ink-400", className)}>No ratings yet</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <span className="inline-flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            className={
              i <= Math.round(rating)
                ? "fill-amber-400 text-amber-400"
                : "fill-sand-200 text-sand-300"
            }
          />
        ))}
      </span>
      <span className="font-medium text-ink-800">{rating.toFixed(1)}</span>
      {count != null ? <span className="text-ink-400">({count})</span> : null}
      <span className="sr-only">{rating.toFixed(1)} out of 5</span>
    </span>
  );
}
