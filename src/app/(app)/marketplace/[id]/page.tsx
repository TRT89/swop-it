import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Clock,
  MapPin,
  Package,
  Truck,
  Video,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getListing, searchListings } from "@/lib/listings";
import { getReputation } from "@/lib/queries";
import { distanceKm, formatDistance } from "@/lib/geo";
import { formatPoints } from "@/lib/format";
import { CATEGORY_EMOJI } from "@/lib/categories";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardBody } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { Stars } from "@/components/ui/stars";
import { ListingCover } from "@/components/listing-cover";
import { ListingGrid } from "@/components/listing-card";
import { ListingActions } from "./listing-actions";
import { ReportButton } from "@/components/report-button";

const CONDITION_LABEL = {
  NEW: "As good as new",
  GOOD: "Good condition",
  USED: "Used but works well",
  WELL_LOVED: "Well loved",
} as const;

const HANDOVER_LABEL = {
  PICKUP: "Pick-up only",
  DELIVERY: "Delivered to you",
  BOTH: "Pick-up or delivery",
} as const;

const PRESENCE_LABEL = {
  IN_PERSON: "In person",
  REMOTE: "Remote",
  EITHER: "Remote or in person",
} as const;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getListing(id);
  return { title: data?.listing.title ?? "Listing" };
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, user] = await Promise.all([getListing(id), getCurrentUser()]);
  if (!data) notFound();

  const { listing, category, owner, images } = data;
  const reputation = await getReputation(owner.userId);
  const isOwner = user?.id === owner.userId;

  const distance = user
    ? formatDistance(
        distanceKm(
          { latitude: user.latitude, longitude: user.longitude },
          { latitude: listing.latitude, longitude: listing.longitude },
        ),
      )
    : null;

  const similar = (
    await searchListings(
      { kind: listing.kind, category: category.slug, limit: 5 },
      user,
    )
  )
    .filter((l) => l.id !== listing.id)
    .slice(0, 4);

  // An OFFER means the owner provides; a REQUEST means the owner is paying
  // someone else to provide. The wording follows from that.
  const ownerProvides = listing.type === "OFFER";

  return (
    <div className="space-y-10">
      <nav className="text-sm text-ink-500">
        <Link href="/marketplace" className="hover:text-moss-700 hover:underline">
          Marketplace
        </Link>
        <span className="mx-1.5">/</span>
        <Link
          href={`/marketplace?kind=${listing.kind}&category=${category.slug}`}
          className="hover:text-moss-700 hover:underline"
        >
          {category.name}
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="space-y-6">
          <div className="aspect-[16/10] overflow-hidden rounded-2xl border border-sand-200 bg-sand-100">
            <ListingCover
              title={listing.title}
              categorySlug={category.slug}
              imageUrl={images[0]?.url}
              size="hero"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={listing.kind === "PRODUCT" ? "sand" : "moss"}>
                {listing.kind === "PRODUCT" ? "Product" : "Service"}
              </Pill>
              <Pill tone={listing.type === "OFFER" ? "neutral" : "clay"}>
                {listing.type === "OFFER" ? "Offer" : "Request"}
              </Pill>
              <Pill tone="neutral">
                {CATEGORY_EMOJI[category.slug]} {category.name}
              </Pill>
            </div>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-900">
              {listing.title}
            </h1>
            <p className="mt-2 text-2xl font-bold text-moss-700">
              {formatPoints(listing.pricePoints, listing.priceUnit)}
            </p>
          </div>

          <section>
            <h2 className="font-semibold text-ink-900">Description</h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-700">
              {listing.description}
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <Detail icon={<MapPin size={16} />} label="Location">
              {listing.city} · {listing.postalCode}
              {distance ? <span className="text-ink-400"> · {distance}</span> : null}
            </Detail>

            {listing.availability ? (
              <Detail icon={<CalendarDays size={16} />} label="Availability">
                {listing.availability}
              </Detail>
            ) : null}

            {listing.kind === "PRODUCT" ? (
              <>
                {listing.loanDurationDays ? (
                  <Detail icon={<Clock size={16} />} label="Loan duration">
                    Up to {listing.loanDurationDays}{" "}
                    {listing.loanDurationDays === 1 ? "day" : "days"}
                  </Detail>
                ) : null}
                {listing.handover ? (
                  <Detail icon={<Truck size={16} />} label="Hand-over">
                    {HANDOVER_LABEL[listing.handover]}
                  </Detail>
                ) : null}
                {listing.condition ? (
                  <Detail icon={<Package size={16} />} label="Condition">
                    {CONDITION_LABEL[listing.condition]}
                  </Detail>
                ) : null}
              </>
            ) : (
              <>
                {listing.estimatedMinutes ? (
                  <Detail icon={<Clock size={16} />} label="Estimated duration">
                    About {formatMinutes(listing.estimatedMinutes)}
                  </Detail>
                ) : null}
                {listing.presence ? (
                  <Detail icon={<Video size={16} />} label="Where">
                    {PRESENCE_LABEL[listing.presence]}
                  </Detail>
                ) : null}
              </>
            )}
          </section>

          {listing.tags.length ? (
            <div className="flex flex-wrap gap-1.5">
              {listing.tags.map((tag) => (
                <Link key={tag} href={`/marketplace?q=${encodeURIComponent(tag)}`}>
                  <Pill tone="neutral" className="hover:bg-sand-200">
                    #{tag}
                  </Pill>
                </Link>
              ))}
            </div>
          ) : null}

          <p className="text-sm text-ink-400">
            Only the city and postal code are shown publicly. Agree the exact
            hand-over in the chat.
          </p>
        </div>

        {/* sidebar */}
        <div className="space-y-4 lg:sticky lg:top-20">
          <Card>
            <CardBody>
              <p className="text-sm text-ink-500">
                {ownerProvides ? "Offered by" : "Requested by"}
              </p>
              <Link
                href={`/profile/${owner.userId}`}
                className="mt-2 flex items-center gap-3 hover:opacity-90"
              >
                <Avatar name={owner.displayName} src={owner.avatarUrl} size="lg" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink-900">
                    {owner.displayName}
                  </p>
                  <Stars
                    rating={reputation.rating}
                    count={reputation.reviewCount}
                    className="mt-0.5"
                  />
                  <p className="mt-0.5 text-sm text-ink-500">
                    {reputation.completedSwaps} completed Swop
                    {reputation.completedSwaps === 1 ? "" : "s"} · {owner.city}
                  </p>
                </div>
              </Link>

              <div className="mt-5 space-y-2">
                <ListingActions
                  listingId={listing.id}
                  ownerName={owner.displayName}
                  points={listing.pricePoints}
                  priceUnit={listing.priceUnit}
                  isOwner={isOwner}
                  isLoggedIn={Boolean(user)}
                  balance={user?.balance ?? 0}
                  ownerProvides={ownerProvides}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="text-sm text-ink-600">
              <p className="font-medium text-ink-900">How paying works</p>
              <p className="mt-1.5 leading-relaxed">
                Social Points move only when{" "}
                <strong className="font-semibold">both of you confirm</strong> the
                Swop is finished. Nothing is deducted when you request.
              </p>
            </CardBody>
          </Card>

          {user && !isOwner ? (
            <ReportButton targetType="LISTING" targetId={listing.id} label="Report this listing" />
          ) : null}
        </div>
      </div>

      {similar.length ? (
        <section>
          <h2 className="mb-4 text-xl font-bold text-ink-900">Similar listings</h2>
          <ListingGrid listings={similar} />
        </section>
      ) : null}
    </div>
  );
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-sand-200 bg-white px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">
        {icon} {label}
      </p>
      <p className="mt-1 text-sm text-ink-800">{children}</p>
    </div>
  );
}

function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = minutes / 60;
  if (hours < 24) return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hours`;
  return `${Math.round(hours / 8)} working days`;
}
