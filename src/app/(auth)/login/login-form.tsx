"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/field";
import { FormError, SubmitButton } from "../form-parts";
import { loginAction } from "../actions";

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Email" htmlFor="email" error={state?.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue="demo@swop-it.local"
        />
      </Field>
      <Field label="Password" htmlFor="password" error={state?.fieldErrors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          defaultValue="swopit123"
        />
      </Field>
      <FormError message={state?.error} />
      <SubmitButton label="Log in" />
    </form>
  );
}
