import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listConversations } from "@/lib/message-queries";
import { timeAgo } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireUser();
  const conversations = await listConversations(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">Messages</h1>
        <p className="mt-1 text-ink-600">
          Agree the details before you request a Swop.
        </p>
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          emoji="💬"
          title="No conversations yet"
          description="Find something you need and message the member who offers it — most Swops start with a quick question."
          action={<ButtonLink href="/marketplace">Browse the marketplace</ButtonLink>}
        />
      ) : (
        <ul className="space-y-2.5">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={`/messages/${conversation.id}`}
                className="flex items-center gap-3 rounded-2xl border border-sand-200 bg-white p-3.5 transition-colors hover:border-sand-300"
              >
                <Avatar
                  name={conversation.otherName}
                  src={conversation.otherAvatar}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-medium text-ink-900">
                      {conversation.otherName}
                    </p>
                    <span className="shrink-0 text-xs text-ink-400">
                      {timeAgo(conversation.lastMessageAt)}
                    </span>
                  </div>
                  {conversation.listingTitle ? (
                    <p className="truncate text-xs font-medium text-moss-700">
                      {conversation.listingTitle}
                    </p>
                  ) : null}
                  <p
                    className={`truncate text-sm ${
                      conversation.unread > 0
                        ? "font-medium text-ink-800"
                        : "text-ink-500"
                    }`}
                  >
                    {conversation.lastMessage ?? "No messages yet"}
                  </p>
                </div>
                {conversation.unread > 0 ? (
                  <span
                    className="grid size-5 shrink-0 place-items-center rounded-full bg-clay-500 text-[11px] font-bold text-white"
                    aria-label={`${conversation.unread} unread`}
                  >
                    {conversation.unread > 9 ? "9+" : conversation.unread}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
