import Link from "next/link";
import { ArrowRight, Handshake, Leaf, MapPin, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

const STEPS = [
  {
    icon: Handshake,
    title: "Offer something",
    body: "A pressure washer gathering dust, or two hours of your time. Anything you can share.",
  },
  {
    icon: Sparkles,
    title: "Earn Social Points",
    body: "When a neighbour uses your offer, the points land in your wallet. No money involved.",
  },
  {
    icon: Leaf,
    title: "Spend anywhere",
    body: "Use them on anything the community offers — from a projector to help assembling a wardrobe.",
  },
];

const EXAMPLES = [
  { emoji: "🔧", title: "Bosch Pressure Washer", price: "15 SP / day", where: "Frankfurt" },
  { emoji: "🛠️", title: "Furniture Assembly", price: "30 SP", where: "Bornheim" },
  { emoji: "🐕", title: "Dog Sitting", price: "20 SP", where: "Offenbach" },
  { emoji: "🎉", title: "Party Tables & Benches", price: "20 SP / weekend", where: "Frankfurt" },
  { emoji: "🗣️", title: "English Conversation", price: "15 SP / hour", where: "Bad Homburg" },
  { emoji: "🌿", title: "Garden Help & Planting", price: "25 SP", where: "Sachsenhausen" },
];

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <ButtonLink href="/marketplace" variant="ghost" size="sm">
            Browse
          </ButtonLink>
          {user ? (
            <ButtonLink href="/dashboard" size="sm">
              My Swop-it
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                Log in
              </ButtonLink>
              <ButtonLink href="/signup" size="sm">
                Join
              </ButtonLink>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        {/* hero */}
        <section className="mx-auto w-full max-w-6xl px-5 pt-10 pb-16 sm:pt-16 sm:pb-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-moss-100 bg-moss-50 px-3 py-1 text-sm font-medium text-moss-700">
                <MapPin size={14} /> Now in the Rhine-Main area
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-ink-900 sm:text-6xl">
                Share more.
                <br />
                Buy less.
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-600">
                Borrow products. Exchange skills. Help your community. Swop-it
                runs on <strong className="font-semibold text-ink-900">Social Points</strong> —
                earn them by helping someone out, spend them on something else entirely.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/marketplace" size="lg">
                  Explore Swop-it <ArrowRight size={18} />
                </ButtonLink>
                <ButtonLink href="/signup" variant="outline" size="lg">
                  Join Community
                </ButtonLink>
              </div>
              <p className="mt-4 text-sm text-ink-400">
                Free to join · 50 Social Points to start · No payment details
              </p>
            </div>

            {/* example cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {EXAMPLES.map((item, i) => (
                <div
                  key={item.title}
                  className={`rounded-2xl border border-sand-200 bg-white p-4 shadow-[0_1px_2px_rgba(26,25,21,0.04)] ${
                    i % 2 === 1 ? "sm:translate-y-6" : ""
                  }`}
                >
                  <span className="grid size-11 place-items-center rounded-xl bg-sand-100 text-xl" aria-hidden>
                    {item.emoji}
                  </span>
                  <p className="mt-3 text-sm font-semibold leading-snug text-ink-900">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-moss-700">{item.price}</p>
                  <p className="mt-0.5 text-xs text-ink-400">{item.where}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* how it works */}
        <section className="border-y border-sand-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:py-20">
            <h2 className="text-center text-3xl font-bold tracking-tight text-ink-900">
              How Swop-it works
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-ink-600">
              No haggling, no 1:1 barter. You never have to find someone who wants
              exactly what you have.
            </p>

            <ol className="mt-12 grid gap-8 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title}>
                  <span className="grid size-12 place-items-center rounded-2xl bg-moss-50 text-moss-600">
                    <step.icon size={22} />
                  </span>
                  <h3 className="mt-4 font-semibold text-ink-900">
                    <span className="text-ink-400">{i + 1}.</span> {step.title}
                  </h3>
                  <p className="mt-1.5 leading-relaxed text-ink-600">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* worked example */}
        <section className="mx-auto w-full max-w-3xl px-5 py-16 sm:py-24">
          <h2 className="text-center text-2xl font-bold tracking-tight text-ink-900">
            One example, start to finish
          </h2>
          <div className="mt-8 space-y-3">
            {[
              { who: "Tobias", text: "lends his pressure washer to Anna", amount: "+15 SP" },
              { who: "Anna", text: "pays with points she earned dog-sitting", amount: "−15 SP" },
              { who: "Tobias", text: "later spends 10 SP on furniture assembly — with Mark, not Anna", amount: "−10 SP" },
            ].map((row) => (
              <div
                key={row.text}
                className="flex items-center justify-between gap-4 rounded-2xl border border-sand-200 bg-white px-5 py-4"
              >
                <p className="text-sm text-ink-700">
                  <span className="font-semibold text-ink-900">{row.who}</span> {row.text}
                </p>
                <span
                  className={`shrink-0 font-semibold ${
                    row.amount.startsWith("+") ? "text-moss-600" : "text-clay-700"
                  }`}
                >
                  {row.amount}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-ink-600">
            Three people, one currency, no direct swap needed. That is the whole idea.
          </p>
        </section>

        {/* cta */}
        <section className="border-t border-sand-200 bg-moss-700 text-white">
          <div className="mx-auto w-full max-w-3xl px-5 py-16 text-center sm:py-20">
            <h2 className="text-3xl font-bold tracking-tight">
              Your neighbours already own what you need
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-moss-100">
              Join Swop-it, get 50 Social Points, and find out what is available
              within a few streets of you.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink
                href="/signup"
                size="lg"
                className="bg-white text-moss-800 hover:bg-moss-50"
              >
                Join Community
              </ButtonLink>
              <ButtonLink
                href="/marketplace"
                size="lg"
                variant="ghost"
                className="text-white hover:bg-moss-600 hover:text-white"
              >
                Have a look around first
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-sand-200 bg-sand-50">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <Logo />
          <p className="text-sm text-ink-400">
            A prototype. Social Points have no monetary value.
          </p>
          <Link href="/marketplace" className="text-sm font-medium text-moss-700 hover:underline">
            Browse the marketplace
          </Link>
        </div>
      </footer>
    </>
  );
}
