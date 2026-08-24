"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/action-state";

function Inner({
  label,
  variant,
}: {
  label: string;
  variant: React.ComponentProps<typeof Button>["variant"];
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}

export function AdminActionButton({
  action,
  fields,
  label,
  variant = "secondary",
  confirm,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  label: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form
      action={formAction}
      className="inline-flex flex-col items-end gap-1"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Inner label={label} variant={variant} />
      {state?.error ? (
        <span className="text-xs text-red-600">{state.error}</span>
      ) : null}
    </form>
  );
}
