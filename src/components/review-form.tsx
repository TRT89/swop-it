"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { Textarea } from "@/components/ui/field";
import { FormError, FormSuccess, SubmitButton } from "@/components/form-parts";
import { reviewAction } from "@/server/review-actions";
import { cn } from "@/lib/utils";

export function ReviewForm({
  swapId,
  subjectName,
}: {
  swapId: string;
  subjectName: string;
}) {
  const [state, formAction] = useActionState(reviewAction, null);
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState<number | null>(null);

  if (state?.success) {
    return <FormSuccess message={state.success} />;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="swapId" value={swapId} />
      <input type="hidden" name="rating" value={rating} />

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink-800">
          How was your Swop with {subjectName}?
        </legend>
        <div className="flex gap-1" onMouseLeave={() => setHovered(null)}>
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHovered(value)}
              aria-label={`${value} out of 5 stars`}
              aria-pressed={rating === value}
              className="rounded p-0.5"
            >
              <Star
                size={28}
                className={cn(
                  "transition-colors",
                  value <= (hovered ?? rating)
                    ? "fill-amber-400 text-amber-400"
                    : "fill-sand-200 text-sand-300",
                )}
              />
            </button>
          ))}
        </div>
      </fieldset>

      <Textarea
        name="comment"
        rows={3}
        maxLength={600}
        placeholder="Anything you would tell another member about this Swop? (optional)"
        aria-label="Comment"
      />

      <FormError message={state?.error} />
      <SubmitButton label="Submit rating" pendingLabel="Sending…" />
    </form>
  );
}
