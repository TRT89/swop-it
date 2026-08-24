"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-5">
      <div className="text-center">
        <p className="text-5xl" aria-hidden>
          🛠️
        </p>
        <h1 className="mt-4 text-2xl font-bold text-ink-900">
          Something went wrong on our side
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-ink-600">
          Nothing was lost — Social Points only move when a Swop completes, and
          that never happens halfway.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/dashboard" variant="outline">
            Back to your dashboard
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
