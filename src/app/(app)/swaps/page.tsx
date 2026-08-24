import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listSwaps, type SwapWithContext } from "@/lib/swap-queries";
import { formatPoints, timeAgo } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SwapStatusPill, type SwapStatus } from "@/components/swap-status";

export const metadata = { title: "My Swops" };

const OPEN: SwapStatus[] = ["REQUESTED", "ACCEPTED", "ACTIVE", "COMPLETION_PENDING"];

export default async function SwapsPage() {
  const user = await requireUser();
  const all = await listSwaps(user.id);

  const open = all.filter((s) => OPEN.includes(s.swap.status as SwapStatus));
  const closed = all.filter((s) => !OPEN.includes(s.swap.status as SwapStatus));

  const needsYou = open.filter((s) => requiresAction(s, user.id));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">My Swops</h1>
          <p className="mt-1 text-ink-600">
            Everything you are borrowing, lending, and helping with.
          </p>
        </div>
        <ButtonLink href="/marketplace" variant="secondary" size="sm">
          Find something to Swop
        </ButtonLink>
      </div>

      {needsYou.length ? (
        <section>
          <h2 className="mb-3 font-semibold text-ink-900">
            Needs your attention ({needsYou.length})
          </h2>
          <div className="space-y-2.5">
            {needsYou.map((row) => (
              <SwapRow key={row.swap.id} row={row} viewerId={user.id} highlight />
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 font-semibold text-ink-900">Open Swops</h2>
        {open.length === 0 ? (
          <EmptyState
            emoji="🤝"
            title="No open Swops yet"
            description="Browse the marketplace and request something, or post an offer so neighbours can come to you."
            action={<ButtonLink href="/marketplace">Browse the marketplace</ButtonLink>}
          />
        ) : (
          <div className="space-y-2.5">
            {open.map((row) => (
              <SwapRow key={row.swap.id} row={row} viewerId={user.id} />
            ))}
          </div>
        )}
      </section>

      {closed.length ? (
        <section>
          <h2 className="mb-3 font-semibold text-ink-900">History</h2>
          <div className="space-y-2.5">
            {closed.map((row) => (
              <SwapRow key={row.swap.id} row={row} viewerId={user.id} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** True when the Swop is waiting on something this member has to do. */
function requiresAction(row: SwapWithContext, viewerId: string) {
  const { swap } = row;
  const isProvider = swap.providerId === viewerId;
  switch (swap.status) {
    case "REQUESTED":
      // The listing owner is the one who answers a request.
      return row.listingType === "OFFER" ? isProvider : !isProvider;
    case "ACCEPTED":
      return true;
    case "ACTIVE":
      return true;
    case "COMPLETION_PENDING":
      return !(isProvider ? swap.providerConfirmedAt : swap.requesterConfirmedAt);
    default:
      return false;
  }
}

function SwapRow({
  row,
  viewerId,
  highlight = false,
}: {
  row: SwapWithContext;
  viewerId: string;
  highlight?: boolean;
}) {
  const { swap } = row;
  const isProvider = swap.providerId === viewerId;
  const otherName = isProvider ? row.requesterName : row.providerName;
  const otherAvatar = isProvider ? row.requesterAvatar : row.providerAvatar;

  return (
    <Link
      href={`/swaps/${swap.id}`}
      className={`flex items-center gap-3 rounded-2xl border bg-white p-3.5 transition-colors hover:border-sand-300 ${
        highlight ? "border-clay-300 bg-clay-100/40" : "border-sand-200"
      }`}
    >
      <Avatar name={otherName} src={otherAvatar} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink-900">{row.listingTitle}</p>
        <p className="truncate text-sm text-ink-500">
          {isProvider ? "You provide for" : "Provided by"} {otherName} ·{" "}
          {timeAgo(swap.createdAt)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={`font-semibold ${isProvider ? "text-moss-700" : "text-clay-700"}`}
        >
          {isProvider ? "+" : "−"}
          {formatPoints(swap.points)}
        </p>
        <div className="mt-1">
          <SwapStatusPill status={swap.status as SwapStatus} />
        </div>
      </div>
    </Link>
  );
}
