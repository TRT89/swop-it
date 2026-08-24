"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/field";
import { FormError, SubmitButton } from "../form-parts";
import { signupAction } from "../actions";

export function SignupForm() {
  const [state, formAction] = useActionState(signupAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <Field
        label="Your name"
        htmlFor="displayName"
        hint="shown publicly"
        error={state?.fieldErrors?.displayName}
      >
        <Input id="displayName" name="displayName" autoComplete="name" required />
      </Field>
      <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        hint="at least 8 characters"
        error={state?.fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <Field label="City" htmlFor="city" error={state?.fieldErrors?.city}>
          <Input id="city" name="city" placeholder="Frankfurt am Main" required />
        </Field>
        <Field label="Postal code" htmlFor="postalCode" error={state?.fieldErrors?.postalCode}>
          <Input id="postalCode" name="postalCode" placeholder="60311" required />
        </Field>
      </div>
      <p className="text-xs text-ink-400">
        Only your city is shown to other members — never your exact address.
      </p>
      <FormError message={state?.error} />
      <SubmitButton label="Create my account" />
    </form>
  );
}
