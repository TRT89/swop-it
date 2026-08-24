import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-5 py-5">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-5 pb-24">
        <div className="text-center">
          <p className="text-5xl" aria-hidden>
            🧭
          </p>
          <h1 className="mt-4 text-2xl font-bold text-ink-900">
            We could not find that
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-ink-600">
            The page may have moved, or the listing may have been taken down by
            its owner.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/marketplace">Browse the marketplace</ButtonLink>
            <ButtonLink href="/" variant="outline">
              Back to the start
            </ButtonLink>
          </div>
        </div>
      </main>
    </div>
  );
}
