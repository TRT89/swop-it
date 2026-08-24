"use client";

import { useActionState } from "react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormError, FormSuccess, SubmitButton } from "@/components/form-parts";
import { updateProfileAction } from "@/server/profile-actions";

export function SettingsForm({
  defaults,
}: {
  defaults: {
    displayName: string;
    bio: string;
    city: string;
    postalCode: string;
    avatarUrl: string;
  };
}) {
  const [state, formAction] = useActionState(updateProfileAction, null);

  return (
    <form action={formAction} className="space-y-5">
      <Field label="Your name" htmlFor="displayName" error={state?.fieldErrors?.displayName}>
        <Input id="displayName" name="displayName" required defaultValue={defaults.displayName} />
      </Field>

      <Field
        label="About you"
        hint="optional"
        htmlFor="bio"
        error={state?.fieldErrors?.bio}
      >
        <Textarea
          id="bio"
          name="bio"
          rows={4}
          maxLength={400}
          defaultValue={defaults.bio}
          placeholder="What do you like sharing? What are you good at?"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <Field label="City" htmlFor="city" error={state?.fieldErrors?.city}>
          <Input id="city" name="city" required defaultValue={defaults.city} />
        </Field>
        <Field label="Postal code" htmlFor="postalCode" error={state?.fieldErrors?.postalCode}>
          <Input id="postalCode" name="postalCode" required defaultValue={defaults.postalCode} />
        </Field>
      </div>

      <Field
        label="Profile picture URL"
        hint="optional — uploads come later"
        htmlFor="avatarUrl"
        error={state?.fieldErrors?.avatarUrl}
      >
        <Input id="avatarUrl" name="avatarUrl" type="url" defaultValue={defaults.avatarUrl} />
      </Field>

      <FormError message={state?.error} />
      <FormSuccess message={state?.success} />
      <SubmitButton label="Save changes" pendingLabel="Saving…" className="w-full sm:w-auto sm:px-8" />
    </form>
  );
}
