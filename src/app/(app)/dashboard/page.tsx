import Link from "next/link";
import { ArrowRight, MessageCircle, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { searchListings } from "@/lib/listings";
import { listSwaps } from "@/lib/swap-queries";
import { countUnreadMessages } from "@/lib/queries";
import { formatPoints, timeAgo } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ListingGrid } from "@/components/listing-card";
import { SwapStatusPill, type SwapStatus } from "@/components/swap-status";

export const metadata = { title: "Dashboard" };

const OPEN: SwapStatus[] = ["REQUESTED", "ACCEPTED", "ACTIVE", "COMPLETION_PENDING"];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Good morning";
  if (hour < 18) return "Hello";
  return "Good evening";
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const justJoined = params.welcome === "1";

  const [nearby, recent, mySwaps, unreadMessages] = await Promise.all([
    searchListings(
      { sort: user.latitude != null ? "nearest" : "newest", excludeOwnerId: user.id, limit: 8 },
      user,
    ),
    searchListings({ sort: "newest", excludeOwnerId: user.id, limit: 16 }, user),
    listSwaps(user.id),
    countUnreadMessages(user.id),
  ]);

  const openSwaps = mySwaps.filter((s) => OPEN.includes(s.swap.status as SwapStatus));

  // Don't show the same listing twice in two sections directly above each other.
  const nearbyIds = new Set(nearby.map((l) => l.id));
  const recentlyAdded = recent.filter((l) => !nearbyIds.has(l.id)).slice(0, 8);

  return (
    <div className="space-y-10">
      {justJoined ? (
        <div className="rounded-2xl border border-moss-200 bg-moss-50 px-5 py-4">
          <p className="font-semibold text-moss-800">
            Welcome to Swop-it — 50 SP are in your wallet 🎉
          </p>
          <p className="mt-1 text-sm text-moss-700">
            That is enough to borrow a drill, book an hour of tutoring, or get a
            hand in the garden. Have a look around.
          </p>
        </div>
      ) : null}

      {/* header */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">
            {greeting()} {user.displayName.split(" ")[0]} 👋
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-600">
            <Link href="/wallet" className="font-semibold text-moss-700 hover:underline">
              {user.balance} SP
            </Link>
            <span className="text-ink-300">·</span>
            <Link href="/swaps" className="hover:underline">
              {openSwaps.length} open Swop{openSwaps.length === 1 ? "" : "s"}
            </Link>
            {unreadMessages > 0 ? (
              <>
                <span className="text-ink-300">·</span>
                <Link
                  href="/messages"
                  className="flex items-center gap-1 font-medium text-clay-700 hover:underline"
                >
                  <MessageCircle size={14} /> {unreadMessages} new message
                  {unreadMessages === 1 ? "" : "s"}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <ButtonLink href="/create">
          <Plus size={16} /> Create listing
        </ButtonLink>
      </section>

      {/* your swaps */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">Your Swops</h2>
          {openSwaps.length ? (
            <Link
              href="/swaps"
              className="flex items-center gap-1 text-sm font-medium text-moss-700 hover:underline"
            >
              See all <ArrowRight size={14} />
            </Link>
          ) : null}
        </div>

        {openSwaps.length === 0 ? (
          <EmptyState
            emoji="🤝"
            title="Nothing on the go"
            description="Borrow something you need, or offer something you own — both earn you a place in the community."
            action={<ButtonLink href="/marketplace">Browse the marketplace</ButtonLink>}
          />
        ) : (
          <ul className="space-y-2.5">
            {openSwaps.slice(0, 4).map((row) => {
              const isProvider = row.swap.providerId === user.id;
              const otherName = isProvider ? row.requesterName : row.providerName;
              const otherAvatar = isProvider ? row.requesterAvatar : row.providerAvatar;
              return (
                <li key={row.swap.id}>
                  <Link
                    href={`/swaps/${row.swap.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-sand-200 bg-white p-3.5 transition-colors hover:border-sand-300"
                  >
                    <Avatar name={otherName} src={otherAvatar} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink-900">
                        {row.listingTitle}
                      </p>
                      <p className="truncate text-sm text-ink-500">
                        with {otherName} · {timeAgo(row.swap.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-sm font-semibold ${
                          isProvider ? "text-moss-700" : "text-clay-700"
                        }`}
                      >
                        {isProvider ? "+" : "−"}
                        {formatPoints(row.swap.points)}
                      </p>
                      <div className="mt-1">
                        <SwapStatusPill status={row.swap.status as SwapStatus} />
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* nearby */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink-900">
            {user.latitude != null ? `Near ${user.city}` : "Available now"}
          </h2>
          <Link
            href="/marketplace?sort=nearest"
            className="flex items-center gap-1 text-sm font-medium text-moss-700 hover:underline"
          >
            See all <ArrowRight size={14} />
          </Link>
        </div>
        {nearby.length === 0 ? (
          <EmptyState
            emoji="🌱"
            title="Nothing nearby yet"
            description="Be the first to offer something in your area."
            action={<ButtonLink href="/create">Create a listing</ButtonLink>}
          />
        ) : (
          <ListingGrid listings={nearby} />
        )}
      </section>

      {/* recently added */}
      {recentlyAdded.length ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink-900">Recently added</h2>
            <Link
              href="/marketplace?sort=newest"
              className="flex items-center gap-1 text-sm font-medium text-moss-700 hover:underline"
            >
              See all <ArrowRight size={14} />
            </Link>
          </div>
          <ListingGrid listings={recentlyAdded} />
        </section>
      ) : null}
    </div>
  );
}
