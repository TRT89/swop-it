"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, MessageCircle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { FormError, SubmitButton } from "@/components/form-parts";
import { contactOwnerAction } from "@/server/message-actions";
import { requestSwapAction } from "@/server/swap-actions";
import { formatPoints } from "@/lib/format";

type PriceUnit = "TOTAL" | "PER_HOUR" | "PER_DAY" | "PER_WEEKEND" | "PER_WEEK";

export function ListingActions({
  listingId,
  ownerName,
  points,
  priceUnit,
  isOwner,
  isLoggedIn,
  balance,
  ownerProvides,
}: {
  listingId: string;
  ownerName: string;
  points: number;
  priceUnit: PriceUnit;
  isOwner: boolean;
  isLoggedIn: boolean;
  balance: number;
  ownerProvides: boolean;
}) {
  const [contactOpen, setContactOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [contactState, contactFormAction] = useActionState(contactOwnerAction, null);
  const [swapState, swapFormAction] = useActionState(requestSwapAction, null);

  if (isOwner) {
    return (
      <div className="space-y-2">
        <p className="rounded-xl border border-sand-200 bg-sand-100 px-4 py-3 text-sm text-ink-600">
          This is your listing.
        </p>
        <ButtonLink href="/swaps" variant="secondary" className="w-full">
          See requests for it
        </ButtonLink>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="space-y-2">
        <ButtonLink href="/signup" className="w-full">
          Join to Swop this
        </ButtonLink>
        <p className="text-center text-sm text-ink-500">
          Already a member?{" "}
          <Link href="/login" className="font-medium text-moss-700 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    );
  }

  // On an OFFER the viewer pays; on a REQUEST the viewer earns.
  const viewerPays = ownerProvides;
  const shortOfPoints = viewerPays && balance < points;

  return (
    <>
      <Button variant="secondary" className="w-full" onClick={() => setContactOpen(true)}>
        <MessageCircle size={16} /> Message {ownerName.split(" ")[0]}
      </Button>

      <Button
        className="w-full"
        onClick={() => setSwapOpen(true)}
        disabled={shortOfPoints}
      >
        <ArrowLeftRight size={16} />
        {viewerPays ? "Request Swop" : "Offer to help"}
      </Button>

      {shortOfPoints ? (
        <p className="text-center text-sm text-clay-700">
          You have {balance} SP — this Swop needs {points} SP.{" "}
          <Link href="/create" className="font-medium underline">
            Offer something
          </Link>{" "}
          to earn more.
        </p>
      ) : (
        <p className="text-center text-xs text-ink-400">
          Points move only when you both confirm the Swop is done.
        </p>
      )}

      <Modal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        title={`Message ${ownerName}`}
        description="Ask about availability, condition, or where to meet."
      >
        <form action={contactFormAction} className="space-y-4">
          <input type="hidden" name="listingId" value={listingId} />
          <Field label="Your message" htmlFor="body" error={contactState?.fieldErrors?.body}>
            <Textarea
              id="body"
              name="body"
              rows={4}
              required
              maxLength={2000}
              placeholder="Hi! Is this available next weekend?"
            />
          </Field>
          <FormError message={contactState?.error} />
          <SubmitButton label="Send message" pendingLabel="Sending…" />
        </form>
      </Modal>

      <Modal
        open={swapOpen}
        onClose={() => setSwapOpen(false)}
        title={viewerPays ? "Request this Swop" : "Offer your help"}
        description={
          viewerPays
            ? `${formatPoints(points, priceUnit)} — deducted only once you both confirm it is done.`
            : `You will earn ${formatPoints(points, priceUnit)} once you both confirm it is done.`
        }
      >
        <form action={swapFormAction} className="space-y-4">
          <input type="hidden" name="listingId" value={listingId} />
          <Field
            label="When would suit you?"
            hint="optional"
            htmlFor="scheduledFor"
            error={swapState?.fieldErrors?.scheduledFor}
          >
            <Input
              id="scheduledFor"
              name="scheduledFor"
              maxLength={120}
              placeholder="Saturday, 10:00 – 18:00"
            />
          </Field>
          <Field
            label="Add a note"
            hint="optional"
            htmlFor="note"
            error={swapState?.fieldErrors?.note}
          >
            <Textarea
              id="note"
              name="note"
              rows={3}
              maxLength={500}
              placeholder="I can collect it from you and bring it back Sunday evening."
            />
          </Field>
          <FormError message={swapState?.error} />
          <SubmitButton
            label={viewerPays ? "Send Swop request" : "Send my offer"}
            pendingLabel="Sending…"
          />
          <p className="text-center text-xs text-ink-400">
            {ownerName.split(" ")[0]} has to accept before anything happens.
          </p>
        </form>
      </Modal>
    </>
  );
}
