import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getCategories, searchListings, type SortKey } from "@/lib/listings";
import { ListingGrid } from "@/components/listing-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { MarketplaceFilters } from "./filters";

export const metadata = { title: "Marketplace" };

const SORTS: SortKey[] = ["nearest", "newest", "cheapest", "rated"];

function toInt(value: string | undefined) {
  const n = Number(value);
  return value && Number.isFinite(n) ? n : undefined;
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const one = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const user = await getCurrentUser();
  const sortParam = one("sort");
  const sort = SORTS.includes(sortParam as SortKey) ? (sortParam as SortKey) : "newest";

  const [categories, results] = await Promise.all([
    getCategories(),
    searchListings(
      {
        q: one("q"),
        kind: one("kind") === "PRODUCT" || one("kind") === "SERVICE" ? (one("kind") as "PRODUCT" | "SERVICE") : undefined,
        type: one("type") === "OFFER" || one("type") === "REQUEST" ? (one("type") as "OFFER" | "REQUEST") : undefined,
        category: one("category"),
        maxPoints: toInt(one("maxPoints")),
        radiusKm: toInt(one("radius")),
        sort,
      },
      user,
    ),
  ]);

  const query = one("q");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">Marketplace</h1>
        <p className="mt-1 text-ink-600">
          What are you looking for? Everything here is paid in Social Points.
        </p>
      </div>

      <Suspense fallback={<div className="h-32" />}>
        <MarketplaceFilters
          categories={categories}
          hasLocation={user?.latitude != null}
        />
      </Suspense>

      <div>
        <p className="mb-3 text-sm text-ink-500">
          {results.length === 0
            ? "No listings"
            : `${results.length} listing${results.length === 1 ? "" : "s"}`}
          {query ? ` for “${query}”` : ""}
        </p>

        {results.length === 0 ? (
          <EmptyState
            emoji="🔍"
            title="Nothing matches that yet"
            description="Try a wider distance, a different category, or post a request — someone nearby may have exactly what you need."
            action={<ButtonLink href="/create?type=REQUEST">Post a request</ButtonLink>}
          />
        ) : (
          <ListingGrid listings={results} />
        )}
      </div>
    </div>
  );
}
