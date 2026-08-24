"use client";

import { useActionState } from "react";
import { Field, Select, Textarea } from "@/components/ui/field";
import { FormError, FormSuccess, SubmitButton } from "@/components/form-parts";
import { feedbackAction } from "@/server/moderation-actions";

export function FeedbackForm() {
  const [state, formAction] = useActionState(feedbackAction, null);

  if (state?.success) return <FormSuccess message={state.success} />;

  return (
    <form action={formAction} className="space-y-4">
      <Field label="What kind of feedback?" htmlFor="feedback-type">
        <Select id="feedback-type" name="type" defaultValue="IDEA">
          <option value="IDEA">An idea</option>
          <option value="BUG">Something is broken</option>
          <option value="FEEDBACK">General feedback</option>
        </Select>
      </Field>
      <Field
        label="Tell us more"
        htmlFor="feedback-message"
        error={state?.fieldErrors?.message}
      >
        <Textarea id="feedback-message" name="message" rows={4} required maxLength={2000} />
      </Field>
      <FormError message={state?.error} />
      <SubmitButton label="Send feedback" pendingLabel="Sending…" className="w-full sm:w-auto sm:px-8" />
    </form>
  );
}
