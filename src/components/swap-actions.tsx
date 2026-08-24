"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormError, SubmitButton } from "@/components/form-parts";
import {
  acceptSwapAction,
  cancelSwapAction,
  confirmCompletionAction,
  declineSwapAction,
  startSwapAction,
} from "@/server/swap-actions";
import type { ActionState } from "@/lib/action-state";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

function ActionForm({
  action,
  swapId,
  label,
  pendingLabel,
  variant = "primary",
  confirm,
  className,
}: {
  action: Action;
  swapId: string;
  label: string;
  pendingLabel: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  confirm?: string;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <input type="hidden" name="swapId" value={swapId} />
      <SubmitButton label={label} pendingLabel={pendingLabel} variant={variant} />
      <FormError message={state?.error} />
    </form>
  );
}

export function SwapLifecycleActions({
  swapId,
  status,
  viewerIsListingOwner,
  viewerHasConfirmed,
  points,
}: {
  swapId: string;
  status: string;
  viewerIsListingOwner: boolean;
  viewerHasConfirmed: boolean;
  points: number;
}) {
  if (status === "REQUESTED") {
    if (!viewerIsListingOwner) {
      return (
        <div className="space-y-2">
          <p className="rounded-xl border border-sand-200 bg-sand-100 px-4 py-3 text-sm text-ink-600">
            Waiting for the other member to accept.
          </p>
          <ActionForm
            action={cancelSwapAction}
            swapId={swapId}
            label="Withdraw request"
            pendingLabel="Withdrawing…"
            variant="ghost"
            confirm="Withdraw this Swop request?"
          />
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <ActionForm
          action={acceptSwapAction}
          swapId={swapId}
          label="Accept Swop"
          pendingLabel="Accepting…"
        />
        <ActionForm
          action={declineSwapAction}
          swapId={swapId}
          label="Decline"
          pendingLabel="Declining…"
          variant="secondary"
          confirm="Decline this request?"
        />
      </div>
    );
  }

  if (status === "ACCEPTED") {
    return (
      <div className="space-y-2">
        <ActionForm
          action={startSwapAction}
          swapId={swapId}
          label="We have handed over — start Swop"
          pendingLabel="Starting…"
        />
        <ActionForm
          action={cancelSwapAction}
          swapId={swapId}
          label="Cancel Swop"
          pendingLabel="Cancelling…"
          variant="ghost"
          confirm="Cancel this Swop?"
        />
      </div>
    );
  }

  if (status === "ACTIVE" || status === "COMPLETION_PENDING") {
    if (viewerHasConfirmed) {
      return (
        <div className="space-y-2">
          <p className="rounded-xl border border-moss-100 bg-moss-50 px-4 py-3 text-sm text-moss-800">
            You have confirmed. {points} SP will move as soon as the other member
            confirms too.
          </p>
          <ActionForm
            action={cancelSwapAction}
            swapId={swapId}
            label="Cancel Swop"
            pendingLabel="Cancelling…"
            variant="ghost"
            confirm="Cancel this Swop? No points will be transferred."
          />
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <ActionForm
          action={confirmCompletionAction}
          swapId={swapId}
          label="Confirm it is finished"
          pendingLabel="Confirming…"
        />
        <ActionForm
          action={cancelSwapAction}
          swapId={swapId}
          label="Cancel Swop"
          pendingLabel="Cancelling…"
          variant="ghost"
          confirm="Cancel this Swop? No points will be transferred."
        />
      </div>
    );
  }

  return null;
}
