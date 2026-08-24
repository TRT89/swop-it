import { CATEGORY_EMOJI } from "@/lib/categories";
import { cn } from "@/lib/utils";

/**
 * Listings without an uploaded photo get a generated cover: a warm gradient
 * chosen deterministically from the title plus the category emoji. Keeps the
 * marketplace looking consistent before anyone has uploaded a single image.
 */
const GRADIENTS = [
  "from-moss-100 to-moss-200",
  "from-clay-100 to-sand-200",
  "from-sand-100 to-sand-300",
  "from-sky-100 to-sky-200",
  "from-amber-100 to-clay-100",
  "from-emerald-100 to-sand-100",
];

export function ListingCover({
  title,
  categorySlug,
  imageUrl,
  className,
  size = "card",
}: {
  title: string;
  categorySlug: string;
  imageUrl?: string | null;
  className?: string;
  size?: "card" | "hero";
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={title}
        className={cn("size-full object-cover", className)}
        loading="lazy"
      />
    );
  }

  const hash = [...title].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const gradient = GRADIENTS[hash % GRADIENTS.length];

  return (
    <div
      className={cn(
        "grid size-full place-items-center bg-gradient-to-br",
        gradient,
        className,
      )}
      aria-hidden
    >
      <span className={size === "hero" ? "text-7xl" : "text-4xl"}>
        {CATEGORY_EMOJI[categorySlug] ?? "📦"}
      </span>
    </div>
  );
}
