"use client";

import { useActionState } from "react";
import { UserMinus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/form-parts";
import { toggleSwoppyAction } from "@/server/review-actions";
import { useFormStatus } from "react-dom";

function Inner({ isSwoppy }: { isSwoppy: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={isSwoppy ? "secondary" : "primary"}
      size="sm"
      disabled={pending}
    >
      {isSwoppy ? <UserMinus size={15} /> : <UserPlus size={15} />}
      {pending ? "One moment…" : isSwoppy ? "Remove Swoppy" : "Add as Swoppy"}
    </Button>
  );
}

export function SwoppyButton({
  userId,
  isSwoppy,
  canAdd,
}: {
  userId: string;
  isSwoppy: boolean;
  canAdd: boolean;
}) {
  const [state, formAction] = useActionState(toggleSwoppyAction, null);

  if (!isSwoppy && !canAdd) {
    return (
      <p className="text-sm text-ink-400">
        Complete a Swop together to add each other as Swoppies.
      </p>
    );
  }

  return (
    <div>
      <form action={formAction}>
        <input type="hidden" name="userId" value={userId} />
        <Inner isSwoppy={isSwoppy} />
      </form>
      <FormError message={state?.error} />
    </div>
  );
}
