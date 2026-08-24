import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getConversation } from "@/lib/message-queries";
import { markConversationReadAction } from "@/server/message-actions";
import { formatPoints, timeAgo } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { ReportButton } from "@/components/report-button";
import { MessageComposer } from "./message-composer";

export const metadata = { title: "Conversation" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const conversation = await getConversation(id, user.id);
  if (!conversation) notFound();

  // Opening the thread is what marks it read.
  await markConversationReadAction(id);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link
        href="/messages"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft size={16} /> All messages
      </Link>

      <Card>
        <CardBody className="flex items-center gap-3 py-3.5">
          <Avatar
            name={conversation.other.displayName}
            src={conversation.other.avatarUrl}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <Link
              href={`/profile/${conversation.other.userId}`}
              className="font-semibold text-ink-900 hover:underline"
            >
              {conversation.other.displayName}
            </Link>
            <p className="truncate text-sm text-ink-500">{conversation.other.city}</p>
          </div>
        </CardBody>
      </Card>

      {conversation.listingId && conversation.listingTitle ? (
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3 py-3.5">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-ink-400">About</p>
              <Link
                href={`/marketplace/${conversation.listingId}`}
                className="truncate font-medium text-ink-900 hover:text-moss-700 hover:underline"
              >
                {conversation.listingTitle}
              </Link>
              <p className="text-sm font-semibold text-moss-700">
                {formatPoints(conversation.listingPoints ?? 0, conversation.listingUnit ?? "TOTAL")}
              </p>
            </div>
            {conversation.listingOwnerId !== user.id ? (
              <ButtonLink
                href={`/marketplace/${conversation.listingId}`}
                size="sm"
                variant="secondary"
              >
                Request Swop
              </ButtonLink>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <ul className="space-y-2.5" aria-label="Messages">
        {conversation.messages.map((message) => {
          const mine = message.senderId === user.id;
          return (
            <li
              key={message.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                  mine
                    ? "rounded-br-md bg-moss-600 text-white"
                    : "rounded-bl-md border border-sand-200 bg-white text-ink-800"
                }`}
              >
                <p className="whitespace-pre-line leading-relaxed">{message.body}</p>
                <p
                  className={`mt-1 text-[11px] ${mine ? "text-moss-100" : "text-ink-400"}`}
                >
                  {timeAgo(message.createdAt)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <MessageComposer conversationId={conversation.id} />

      <div className="pt-2">
        <ReportButton
          targetType="USER"
          targetId={conversation.other.userId}
          label={`Report ${conversation.other.displayName}`}
        />
      </div>
    </div>
  );
}
