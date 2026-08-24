import type { ZodError } from "zod";

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
} | null;

export function fieldErrorsFrom(error: ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { fieldErrors, error: "Please check the highlighted fields." };
}
