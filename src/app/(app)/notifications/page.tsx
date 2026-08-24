import Link from "next/link";
import {
  ArrowLeftRight,
  BadgeCheck,
  Ban,
  Check,
  CircleCheck,
  Coins,
  MessageCircle,
  Star,
  UserPlus,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getRecentNotifications } from "@/lib/queries";
import { markAllNotificationsReadAction } from "@/server/notification-actions";
import { timeAgo } from "@/lib/format";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Notifications" };

const ICONS = {
  MESSAGE: MessageCircle,
  SWAP_REQUESTED: ArrowLeftRight,
  SWAP_ACCEPTED: Check,
  SWAP_DECLINED: Ban,
  SWAP_COMPLETION_REQUESTED: CircleCheck,
  SWAP_COMPLETED: CircleCheck,
  SWAP_CANCELLED: Ban,
  POINTS_RECEIVED: Coins,
  REVIEW_RECEIVED: Star,
  BADGE_EARNED: BadgeCheck,
  SWOPPY_ADDED: UserPlus,
} as const;

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = await getRecentNotifications(user.id, 40);
  const unread = items.filter((item) => !item.readAt).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">Notifications</h1>
          <p className="mt-1 text-ink-600">
            {unread > 0 ? `${unread} new` : "You are all caught up."}
          </p>
        </div>
        {unread > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="secondary" size="sm">
              Mark all as read
            </Button>
          </form>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          emoji="🔔"
          title="Nothing yet"
          description="We will let you know when someone messages you, requests a Swop, or sends you Social Points."
          action={<ButtonLink href="/marketplace">Browse the marketplace</ButtonLink>}
        />
      ) : (
        <ul className="divide-y divide-sand-200 overflow-hidden rounded-2xl border border-sand-200 bg-white">
          {items.map((item) => {
            const Icon = ICONS[item.type];
            const body = (
              <div className="flex items-start gap-3 px-4 py-3.5">
                <span
                  className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ${
                    item.readAt ? "bg-sand-100 text-ink-500" : "bg-moss-50 text-moss-600"
                  }`}
                >
                  <Icon size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={
                      item.readAt ? "text-ink-700" : "font-medium text-ink-900"
                    }
                  >
                    {item.title}
                  </p>
                  {item.body ? (
                    <p className="mt-0.5 text-sm text-ink-500">{item.body}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-ink-400">{timeAgo(item.createdAt)}</p>
                </div>
                {!item.readAt ? (
                  <span
                    className="mt-2 size-2 shrink-0 rounded-full bg-clay-500"
                    aria-label="Unread"
                  />
                ) : null}
              </div>
            );

            return (
              <li key={item.id}>
                {item.link ? (
                  <Link href={item.link} className="block hover:bg-sand-50">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
