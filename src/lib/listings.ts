import "server-only";
import { and, asc, desc, eq, gte, lte, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, listingImages, listings, profiles } from "@/db/schema";
import { getReputationMap } from "@/lib/queries";

export type SortKey = "nearest" | "newest" | "cheapest" | "rated";

export type ListingFilters = {
  q?: string;
  kind?: "PRODUCT" | "SERVICE";
  type?: "OFFER" | "REQUEST";
  category?: string;
  minPoints?: number;
  maxPoints?: number;
  radiusKm?: number;
  sort?: SortKey;
  ownerId?: string;
  excludeOwnerId?: string;
  limit?: number;
};

export type ListingCardData = Awaited<ReturnType<typeof searchListings>>[number];

/** Haversine distance in km from the viewer to each listing, as a SQL expression. */
function distanceExpr(from: { latitude: number | null; longitude: number | null }) {
  if (from.latitude == null || from.longitude == null) return sql<number | null>`NULL::float8`;
  return sql<number | null>`
    6371 * acos(least(1, greatest(-1,
      cos(radians(${from.latitude})) * cos(radians(${listings.latitude}))
      * cos(radians(${listings.longitude}) - radians(${from.longitude}))
      + sin(radians(${from.latitude})) * sin(radians(${listings.latitude}))
    )))`;
}

export async function searchListings(
  filters: ListingFilters,
  viewer: { latitude: number | null; longitude: number | null } | null,
) {
  const distance = distanceExpr(viewer ?? { latitude: null, longitude: null });

  const where: (SQL | undefined)[] = [eq(listings.status, "ACTIVE")];

  if (filters.q) {
    const needle = `%${filters.q.toLowerCase()}%`;
    where.push(
      sql`lower(
        ${listings.title} || ' ' || ${listings.description} || ' ' ||
        ${listings.city} || ' ' || ${listings.postalCode} || ' ' ||
        coalesce(array_to_string(${listings.tags}, ' '), '') || ' ' || ${categories.name}
      ) LIKE ${needle}`,
    );
  }
  if (filters.kind) where.push(eq(listings.kind, filters.kind));
  if (filters.type) where.push(eq(listings.type, filters.type));
  if (filters.category) where.push(eq(categories.slug, filters.category));
  if (filters.minPoints != null) where.push(gte(listings.pricePoints, filters.minPoints));
  if (filters.maxPoints != null) where.push(lte(listings.pricePoints, filters.maxPoints));
  if (filters.ownerId) where.push(eq(listings.ownerId, filters.ownerId));
  if (filters.excludeOwnerId) where.push(ne(listings.ownerId, filters.excludeOwnerId));
  if (filters.radiusKm != null && viewer?.latitude != null) {
    // Listings without coordinates stay visible rather than silently vanishing.
    where.push(or(sql`${distance} <= ${filters.radiusKm}`, sql`${listings.latitude} IS NULL`));
  }

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      type: listings.type,
      kind: listings.kind,
      pricePoints: listings.pricePoints,
      priceUnit: listings.priceUnit,
      city: listings.city,
      postalCode: listings.postalCode,
      createdAt: listings.createdAt,
      categoryName: categories.name,
      categorySlug: categories.slug,
      ownerId: listings.ownerId,
      ownerName: profiles.displayName,
      ownerAvatar: profiles.avatarUrl,
      imageUrl: sql<string | null>`(
        SELECT url FROM ${listingImages}
        WHERE ${listingImages.listingId} = ${listings.id}
        ORDER BY ${listingImages.sortOrder} LIMIT 1
      )`,
      distanceKm: distance,
    })
    .from(listings)
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .innerJoin(profiles, eq(profiles.userId, listings.ownerId))
    .where(and(...where.filter(Boolean)))
    .orderBy(...orderFor(filters.sort ?? "newest", distance))
    .limit(filters.limit ?? 60);

  const reputation = await getReputationMap(rows.map((r) => r.ownerId));

  const withReputation = rows.map((row) => ({
    ...row,
    distanceKm: row.distanceKm == null ? null : Number(row.distanceKm),
    ownerRating: reputation.get(row.ownerId)?.rating ?? null,
    ownerSwaps: reputation.get(row.ownerId)?.completedSwaps ?? 0,
  }));

  // "Highest rated" depends on reputation, which is not part of the SQL query.
  if (filters.sort === "rated") {
    withReputation.sort((a, b) => (b.ownerRating ?? 0) - (a.ownerRating ?? 0));
  }
  return withReputation;
}

function orderFor(sort: SortKey, distance: SQL<number | null>) {
  switch (sort) {
    case "nearest":
      return [sql`${distance} ASC NULLS LAST`, desc(listings.createdAt)];
    case "cheapest":
      return [asc(listings.pricePoints), desc(listings.createdAt)];
    case "rated":
    case "newest":
    default:
      return [desc(listings.createdAt)];
  }
}

export async function getListing(id: string) {
  const [row] = await db
    .select({
      listing: listings,
      category: categories,
      owner: profiles,
    })
    .from(listings)
    .innerJoin(categories, eq(categories.id, listings.categoryId))
    .innerJoin(profiles, eq(profiles.userId, listings.ownerId))
    .where(eq(listings.id, id));

  if (!row) return null;

  const images = await db
    .select()
    .from(listingImages)
    .where(eq(listingImages.listingId, id))
    .orderBy(asc(listingImages.sortOrder));

  return { ...row, images };
}

export async function getCategories() {
  return db.select().from(categories).orderBy(asc(categories.kind), asc(categories.sortOrder));
}
