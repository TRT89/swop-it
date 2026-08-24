import { Pill } from "@/components/ui/pill";

export type SwapStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "ACTIVE"
  | "COMPLETION_PENDING"
  | "COMPLETED"
  | "CANCELLED"
  | "DECLINED";

const STATUS = {
  REQUESTED: { label: "Requested", tone: "blue" },
  ACCEPTED: { label: "Accepted", tone: "moss" },
  ACTIVE: { label: "Active", tone: "moss" },
  COMPLETION_PENDING: { label: "Completion pending", tone: "clay" },
  COMPLETED: { label: "Completed", tone: "sand" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  DECLINED: { label: "Declined", tone: "neutral" },
} as const;

export function SwapStatusPill({ status }: { status: SwapStatus }) {
  const config = STATUS[status];
  return <Pill tone={config.tone}>{config.label}</Pill>;
}

export const SWAP_STATUS_LABEL = Object.fromEntries(
  Object.entries(STATUS).map(([key, value]) => [key, value.label]),
) as Record<SwapStatus, string>;

/** Plain-language explanation of what happens next, for the person reading it. */
export function swapHint(status: SwapStatus, viewerIsProvider: boolean) {
  switch (status) {
    case "REQUESTED":
      return viewerIsProvider
        ? "Waiting for a decision. Accept it to lock the Swop in."
        : "Waiting for the other member to accept.";
    case "ACCEPTED":
      return "Agreed. Mark it as started once the hand-over has happened.";
    case "ACTIVE":
      return "In progress. Confirm when it is finished.";
    case "COMPLETION_PENDING":
      return "One of you has confirmed. Social Points move once you both have.";
    case "COMPLETED":
      return "Done and paid. You can rate each other.";
    case "CANCELLED":
      return "This Swop was cancelled. No points changed hands.";
    case "DECLINED":
      return "This request was declined. No points changed hands.";
  }
}
