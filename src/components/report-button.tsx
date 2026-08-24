"use client";

import { useActionState, useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { FormError, SubmitButton } from "@/components/form-parts";
import { reportAction } from "@/server/moderation-actions";

const REASONS = [
  ["SPAM", "Spam"],
  ["FRAUD", "Fraud"],
  ["UNSAFE", "Unsafe"],
  ["INAPPROPRIATE", "Inappropriate"],
  ["INCORRECT_INFORMATION", "Incorrect information"],
  ["OTHER", "Something else"],
] as const;

export function ReportButton({
  targetType,
  targetId,
  label,
}: {
  targetType: "LISTING" | "USER" | "MESSAGE";
  targetId: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(reportAction, null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-400 transition-colors hover:text-ink-700"
      >
        <Flag size={14} /> {label}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Report to the Swop-it team"
        description="Reports are private. We look at every one."
      >
        {state?.success ? (
          <div className="space-y-4">
            <p className="rounded-xl border border-moss-100 bg-moss-50 px-4 py-3 text-sm text-moss-800">
              Thank you — a moderator will review this.
            </p>
            <Button variant="secondary" className="w-full" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="targetType" value={targetType} />
            <input type="hidden" name="targetId" value={targetId} />
            <Field label="What is wrong?" htmlFor="reason" error={state?.fieldErrors?.reason}>
              <Select id="reason" name="reason" defaultValue="SPAM" required>
                {REASONS.map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Anything else we should know?"
              hint="optional"
              htmlFor="details"
              error={state?.fieldErrors?.details}
            >
              <Textarea id="details" name="details" rows={3} maxLength={600} />
            </Field>
            <FormError message={state?.error} />
            <SubmitButton label="Send report" />
          </form>
        )}
      </Modal>
    </>
  );
}
