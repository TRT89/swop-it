import Link from "next/link";
import { notFound } from "next/navigation";
import { MailCheck, MapPin } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { searchListings } from "@/lib/listings";
import { getReputation } from "@/lib/queries";
import { getUserBadges } from "@/lib/badge-service";
import {
  getPublicProfile,
  getReviewsFor,
  getSwoppies,
  hasSwoppedWith,
  isSwoppy,
} from "@/lib/profile-queries";
import { timeAgo } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pill } from "@/components/ui/pill";
import { Stars } from "@/components/ui/stars";
import { ListingGrid } from "@/components/listing-card";
import { SwoppyButton } from "@/components/swoppy-button";
import { ReportButton } from "@/components/report-button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getPublicProfile(id);
  return { title: profile?.profile.displayName ?? "Member" };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [data, viewer] = await Promise.all([getPublicProfile(id), getCurrentUser()]);
  if (!data || !data.isActive) notFound();

  const { profile, memberSince, emailVerified } = data;
  const isMe = viewer?.id === profile.userId;

  const [reputation, offers, requests, reviewList, swoppies, badges] = await Promise.all([
    getReputation(profile.userId),
    searchListings({ ownerId: profile.userId, type: "OFFER", limit: 12 }, viewer),
    searchListings({ ownerId: profile.userId, type: "REQUEST", limit: 12 }, viewer),
    getReviewsFor(profile.userId),
    getSwoppies(profile.userId),
    getUserBadges(profile.userId),
  ]);

  const [alreadySwoppy, swoppedTogether] = viewer && !isMe
    ? await Promise.all([
        isSwoppy(viewer.id, profile.userId),
        hasSwoppedWith(viewer.id, profile.userId),
      ])
    : [false, false];

  return (
    <div className="space-y-8">
      <Card>
        <CardBody className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <Avatar name={profile.displayName} src={profile.avatarUrl} size="xl" />

            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-ink-900">{profile.displayName}</h1>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                <Stars rating={reputation.rating} count={reputation.reviewCount} />
                <span className="text-sm font-medium text-ink-700">
                  {reputation.completedSwaps} Swop
                  {reputation.completedSwaps === 1 ? "" : "s"}
                </span>
                <span className="flex items-center gap-1 text-sm text-ink-500">
                  <MapPin size={14} /> {profile.city}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {emailVerified ? (
                  <Pill tone="moss">
                    <MailCheck size={12} /> Email verified
                  </Pill>
                ) : null}
                <Pill tone="neutral">
                  Member since{" "}
                  {new Date(memberSince).toLocaleDateString("en-GB", {
                    month: "long",
                    year: "numeric",
                  })}
                </Pill>
                {badges.map(({ badge }) => (
                  <Pill key={badge.id} tone="sand" title={badge.description}>
                    {badge.emoji} {badge.name}
                  </Pill>
                ))}
              </div>

              {profile.bio ? (
                <p className="mt-4 leading-relaxed text-ink-700">{profile.bio}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              {isMe ? (
                <ButtonLink href="/settings" variant="secondary" size="sm">
                  Edit profile
                </ButtonLink>
              ) : viewer ? (
                <SwoppyButton
                  userId={profile.userId}
                  isSwoppy={alreadySwoppy}
                  canAdd={swoppedTogether}
                />
              ) : null}
            </div>
          </div>
        </CardBody>
      </Card>

      <Section title={`Offers (${offers.length})`}>
        {offers.length === 0 ? (
          <EmptyState
            emoji="📦"
            title={isMe ? "You have no offers yet" : "No offers yet"}
            description={
              isMe
                ? "Share something you own or a skill you have — that is how you earn Social Points."
                : undefined
            }
            action={isMe ? <ButtonLink href="/create">Create a listing</ButtonLink> : undefined}
          />
        ) : (
          <ListingGrid listings={offers} />
        )}
      </Section>

      {requests.length ? (
        <Section title={`Requests (${requests.length})`}>
          <ListingGrid listings={requests} />
        </Section>
      ) : null}

      <Section title={`Reviews (${reviewList.length})`}>
        {reviewList.length === 0 ? (
          <EmptyState
            emoji="⭐"
            title="No reviews yet"
            description="Members can rate each other once a Swop is complete."
          />
        ) : (
          <ul className="space-y-3">
            {reviewList.map(({ review, authorId, authorName, authorAvatar, listingTitle }) => (
              <li
                key={review.id}
                className="rounded-2xl border border-sand-200 bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={authorName} src={authorAvatar} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/profile/${authorId}`}
                      className="font-medium text-ink-900 hover:underline"
                    >
                      {authorName}
                    </Link>
                    <p className="truncate text-xs text-ink-400">
                      {listingTitle} · {timeAgo(review.createdAt)}
                    </p>
                  </div>
                  <Stars rating={review.rating} size={13} />
                </div>
                {review.comment ? (
                  <p className="mt-2.5 leading-relaxed text-ink-700">
                    “{review.comment}”
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Swoppies (${swoppies.length})`}>
        {swoppies.length === 0 ? (
          <EmptyState
            emoji="🤝"
            title="No Swoppies yet"
            description="Swoppies are the members you have successfully swopped with."
          />
        ) : (
          <ul className="flex flex-wrap gap-2">
            {swoppies.map((swoppy) => (
              <li key={swoppy.userId}>
                <Link
                  href={`/profile/${swoppy.userId}`}
                  className="flex items-center gap-2 rounded-full border border-sand-200 bg-white py-1.5 pl-1.5 pr-4 transition-colors hover:border-sand-300"
                >
                  <Avatar name={swoppy.displayName} src={swoppy.avatarUrl} size="sm" />
                  <div className="leading-tight">
                    <p className="text-sm font-medium text-ink-900">
                      {swoppy.displayName}
                    </p>
                    <p className="text-xs text-ink-400">{swoppy.city}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {viewer && !isMe ? (
        <ReportButton
          targetType="USER"
          targetId={profile.userId}
          label={`Report ${profile.displayName}`}
        />
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold text-ink-900">{title}</h2>
      {children}
    </section>
  );
}
