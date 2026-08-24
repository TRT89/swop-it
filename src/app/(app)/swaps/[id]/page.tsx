import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, MessageCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getSwapDetail } from "@/lib/swap-queries";
import { formatPoints, timeAgo } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Stars } from "@/components/ui/stars";
import { SwapStatusPill, swapHint, type SwapStatus } from "@/components/swap-status";
import { SwapLifecycleActions } from "@/components/swap-actions";
import { ReviewForm } from "@/components/review-form";

export const metadata = { title: "Swop" };

const TIMELINE: { status: SwapStatus; label: string }[] = [
  { status: "REQUESTED", label: "Requested" },
  { status: "ACCEPTED", label: "Accepted" },
  { status: "ACTIVE", label: "Active" },
  { status: "COMPLETION_PENDING", label: "Confirming" },
  { status: "COMPLETED", label: "Completed" },
];

export default async function SwapDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const detail = await getSwapDetail(id, user.id);
  if (!detail) notFound();

  const { swap, listing, provider, requester, myReview, theirReview } = detail;
  const viewerIsProvider = swap.providerId === user.id;
  const other = viewerIsProvider ? requester : provider;
  const viewerHasConfirmed = Boolean(
    viewerIsProvider ? swap.providerConfirmedAt : swap.requesterConfirmedAt,
  );
  const status = swap.status as SwapStatus;
  const stageIndex = TIMELINE.findIndex((t) => t.status === status);
  const closed = status === "CANCELLED" || status === "DECLINED";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav className="text-sm text-ink-500">
        <Link href="/swaps" className="hover:text-moss-700 hover:underline">
          My Swops
        </Link>
      </nav>

      <Card>
        <CardBody className="space-y-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Link
                href={`/marketplace/${listing.id}`}
                className="text-xl font-bold text-ink-900 hover:text-moss-700 hover:underline"
              >
                {listing.title}
              </Link>
              <p className="mt-1 text-2xl font-bold text-moss-700">
                {formatPoints(swap.points)}
              </p>
            </div>
            <SwapStatusPill status={status} />
          </div>

          {/* who pays whom */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-sand-200 bg-sand-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Avatar name={provider.displayName} src={provider.avatarUrl} size="sm" />
              <div>
                <p className="text-sm font-medium text-ink-900">{provider.displayName}</p>
                <p className="text-xs text-moss-700">earns +{swap.points} SP</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-ink-400" />
            <div className="flex items-center gap-2">
              <Avatar name={requester.displayName} src={requester.avatarUrl} size="sm" />
              <div>
                <p className="text-sm font-medium text-ink-900">{requester.displayName}</p>
                <p className="text-xs text-clay-700">pays −{swap.points} SP</p>
              </div>
            </div>
          </div>

          {/* progress */}
          {closed ? (
            <p className="rounded-xl border border-sand-200 bg-sand-100 px-4 py-3 text-sm text-ink-600">
              {swapHint(status, viewerIsProvider)}
            </p>
          ) : (
            <div>
              <ol className="flex items-center gap-1">
                {TIMELINE.map((stage, i) => (
                  <li key={stage.status} className="flex flex-1 items-center gap-1">
                    <div className="flex-1">
                      <div
                        className={
                          i <= stageIndex
                            ? "h-1.5 rounded-full bg-moss-500"
                            : "h-1.5 rounded-full bg-sand-200"
                        }
                      />
                      <p
                        className={`mt-1.5 hidden text-xs sm:block ${
                          i <= stageIndex ? "font-medium text-ink-800" : "text-ink-400"
                        }`}
                      >
                        {stage.label}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-sm text-ink-600">
                {swapHint(status, viewerIsProvider)}
              </p>
            </div>
          )}

          {swap.scheduledFor ? (
            <p className="flex items-center gap-2 text-sm text-ink-700">
              <CalendarDays size={16} className="text-ink-400" />
              {swap.scheduledFor}
            </p>
          ) : null}

          {swap.note ? (
            <blockquote className="border-l-2 border-sand-300 pl-3 text-sm italic text-ink-600">
              “{swap.note}”
            </blockquote>
          ) : null}

          <p className="text-xs text-ink-400">
            Requested {timeAgo(swap.createdAt)}
            {swap.completedAt ? ` · completed ${timeAgo(swap.completedAt)}` : ""}
          </p>

          <div className="space-y-2 border-t border-sand-200 pt-5">
            <SwapLifecycleActions
              swapId={swap.id}
              status={status}
              viewerIsListingOwner={listing.ownerId === user.id}
              viewerHasConfirmed={viewerHasConfirmed}
              points={swap.points}
            />
            {swap.conversationId ? (
              <ButtonLink
                href={`/messages/${swap.conversationId}`}
                variant="secondary"
                className="w-full"
              >
                <MessageCircle size={16} /> Open chat with {other.displayName.split(" ")[0]}
              </ButtonLink>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {status === "COMPLETED" ? (
        <Card>
          <CardHeader>
            <CardTitle>Ratings</CardTitle>
          </CardHeader>
          <CardBody className="space-y-5">
            {myReview ? (
              <div>
                <p className="text-sm font-medium text-ink-800">
                  You rated {other.displayName}
                </p>
                <Stars rating={myReview.rating} className="mt-1" />
                {myReview.comment ? (
                  <p className="mt-1.5 text-sm text-ink-600">“{myReview.comment}”</p>
                ) : null}
              </div>
            ) : (
              <ReviewForm swapId={swap.id} subjectName={other.displayName} />
            )}

            <div className="border-t border-sand-200 pt-5">
              <p className="text-sm font-medium text-ink-800">
                {other.displayName} rated you
              </p>
              {theirReview ? (
                <>
                  <Stars rating={theirReview.rating} className="mt-1" />
                  {theirReview.comment ? (
                    <p className="mt-1.5 text-sm text-ink-600">“{theirReview.comment}”</p>
                  ) : null}
                </>
              ) : (
                <p className="mt-1 text-sm text-ink-400">Not yet.</p>
              )}
            </div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
