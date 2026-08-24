"use client";

import { useActionState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/form-parts";
import { sendMessageAction } from "@/server/message-actions";
import { useFormStatus } from "react-dom";

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="md" disabled={pending} aria-label="Send message">
      <Send size={16} />
      <span className="hidden sm:inline">{pending ? "Sending…" : "Send"}</span>
    </Button>
  );
}

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [state, formAction] = useActionState(sendMessageAction, null);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the box once the server confirms the message landed.
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="conversationId" value={conversationId} />
      <div className="flex items-end gap-2">
        <Textarea
          name="body"
          rows={2}
          required
          maxLength={2000}
          placeholder="Write a message…"
          aria-label="Message"
          className="flex-1 resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <SendButton />
      </div>
      <FormError message={state?.error ?? state?.fieldErrors?.body} />
    </form>
  );
}
