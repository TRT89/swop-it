import Link from "next/link";
import { MapPin } from "lucide-react";
import type { ListingCardData } from "@/lib/listings";
import { formatDistance } from "@/lib/geo";
import { formatPoints } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { Pill } from "@/components/ui/pill";
import { Stars } from "@/components/ui/stars";
import { ListingCover } from "@/components/listing-cover";

export function ListingCard({ listing }: { listing: ListingCardData }) {
  const distance = formatDistance(listing.distanceKm);

  return (
    <Link
      href={`/marketplace/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white transition-all hover:-translate-y-0.5 hover:border-sand-300 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-sand-100">
        <ListingCover
          title={listing.title}
          categorySlug={listing.categorySlug}
          imageUrl={listing.imageUrl}
        />
        {listing.type === "REQUEST" ? (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-clay-500 px-2 py-0.5 text-xs font-semibold text-white">
            Looking for
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <h3 className="line-clamp-2 font-semibold leading-snug text-ink-900 group-hover:text-moss-700">
          {listing.title}
        </h3>

        <p className="mt-1.5 font-semibold text-moss-700">
          {formatPoints(listing.pricePoints, listing.priceUnit)}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Pill tone={listing.kind === "PRODUCT" ? "sand" : "moss"}>
            {listing.kind === "PRODUCT" ? "Product" : "Service"}
          </Pill>
          <Pill tone={listing.type === "OFFER" ? "neutral" : "clay"}>
            {listing.type === "OFFER" ? "Offer" : "Request"}
          </Pill>
        </div>

        <p className="mt-2 flex items-center gap-1 text-xs text-ink-400">
          <MapPin size={12} />
          {distance ? distance : listing.city}
        </p>

        <div className="mt-auto flex items-center gap-2 pt-3">
          <Avatar name={listing.ownerName} src={listing.ownerAvatar} size="xs" />
          <span className="truncate text-xs font-medium text-ink-700">
            {listing.ownerName}
          </span>
          {listing.ownerRating != null ? (
            <Stars rating={listing.ownerRating} size={11} className="ml-auto text-xs" />
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function ListingGrid({ listings }: { listings: ListingCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
