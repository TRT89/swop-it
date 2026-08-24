import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowDownLeft, ArrowUpRight, Gift, Settings2 } from "lucide-react";
import { db } from "@/db/client";
import { walletTransactions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getWalletSummary } from "@/lib/points";
import { formatSigned, timeAgo } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Wallet" };

const TYPE_META = {
  WELCOME_BONUS: { label: "Welcome bonus", icon: Gift },
  SWAP_EARNED: { label: "Swop earned", icon: ArrowDownLeft },
  SWAP_SPENT: { label: "Swop spent", icon: ArrowUpRight },
  BONUS: { label: "Bonus", icon: Gift },
  ADMIN_ADJUSTMENT: { label: "Adjustment", icon: Settings2 },
} as const;

export default async function WalletPage() {
  const user = await requireUser();
  const [summary, history] = await Promise.all([
    getWalletSummary(user.id),
    db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, user.id))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(50),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">Social Points</h1>

      <Card className="overflow-hidden">
        <div className="bg-moss-700 px-6 py-8 text-white">
          <p className="text-sm text-moss-100">Balance</p>
          <p className="mt-1 text-5xl font-bold tracking-tight">{summary.balance} SP</p>
        </div>
        <CardBody className="grid grid-cols-2 divide-x divide-sand-200">
          <div className="pr-4">
            <p className="text-sm text-ink-500">Earned</p>
            <p className="mt-0.5 text-xl font-semibold text-moss-700">
              +{summary.earned} SP
            </p>
          </div>
          <div className="pl-4">
            <p className="text-sm text-ink-500">Spent</p>
            <p className="mt-0.5 text-xl font-semibold text-clay-700">
              {summary.spent} SP
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="rounded-2xl border border-sand-200 bg-white px-5 py-4 text-sm text-ink-600">
        Social Points only exist inside Swop-it. They cannot be bought, sold or
        converted into money — they are a way of keeping track of who has helped
        whom.
      </div>

      <section>
        <h2 className="mb-3 font-semibold text-ink-900">Recent activity</h2>
        {history.length === 0 ? (
          <EmptyState
            emoji="🪙"
            title="Nothing here yet"
            description="Your Social Point history appears once you complete your first Swop."
            action={<ButtonLink href="/marketplace">Find a Swop</ButtonLink>}
          />
        ) : (
          <ul className="divide-y divide-sand-200 overflow-hidden rounded-2xl border border-sand-200 bg-white">
            {history.map((entry) => {
              const meta = TYPE_META[entry.type];
              const Icon = meta.icon;
              const positive = entry.amount > 0;
              return (
                <li key={entry.id} className="flex items-center gap-3 px-4 py-3.5">
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-full ${
                      positive ? "bg-moss-50 text-moss-600" : "bg-clay-100 text-clay-700"
                    }`}
                  >
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink-900">
                      {entry.description}
                    </p>
                    <p className="text-xs text-ink-400">
                      {meta.label} · {timeAgo(entry.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 font-semibold ${
                      positive ? "text-moss-700" : "text-clay-700"
                    }`}
                  >
                    {formatSigned(entry.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-center text-sm text-ink-400">
        Every entry above is permanent.{" "}
        <Link href="/swaps" className="font-medium text-moss-700 hover:underline">
          See the Swops behind them
        </Link>
        .
      </p>
    </div>
  );
}
