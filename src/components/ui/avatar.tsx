import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
} as const;

/** Deterministic warm background so each member keeps the same colour. */
const PALETTE = [
  "bg-moss-200 text-moss-800",
  "bg-clay-100 text-clay-700",
  "bg-sand-200 text-ink-700",
  "bg-sky-100 text-sky-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
];

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const tone = PALETTE[hash % PALETTE.length];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold",
        SIZES[size],
        !src && tone,
        className,
      )}
      aria-hidden
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
