import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  feedback,
  listings,
  profiles,
  reports,
  users,
  wallets,
  walletTransactions,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { getMetrics } from "@/lib/metrics";
import { formatSigned, timeAgo } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminActionButton } from "@/components/admin-buttons";
import {
  resolveReportAction,
  setListingActiveAction,
  setUserActiveAction,
} from "@/server/admin-actions";

export const metadata = { title: "Admin" };

export default async function AdminPage() {
  await requireAdmin();

  const [metrics, memberRows, listingRows, reportRows, feedbackRows, ledgerRows] =
    await Promise.all([
      getMetrics(),
      db
        .select({
          id: users.id,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          displayName: profiles.displayName,
          city: profiles.city,
          balance: wallets.balance,
        })
        .from(users)
        .innerJoin(profiles, eq(profiles.userId, users.id))
        .innerJoin(wallets, eq(wallets.userId, users.id))
        .orderBy(desc(users.createdAt)),
      db
        .select({
          id: listings.id,
          title: listings.title,
          status: listings.status,
          points: listings.pricePoints,
          createdAt: listings.createdAt,
          ownerName: profiles.displayName,
        })
        .from(listings)
        .innerJoin(profiles, eq(profiles.userId, listings.ownerId))
        .orderBy(desc(listings.createdAt))
        .limit(25),
      db
        .select({
          report: reports,
          reporterName: profiles.displayName,
        })
        .from(reports)
        .innerJoin(profiles, eq(profiles.userId, reports.reporterId))
        .orderBy(desc(reports.createdAt))
        .limit(25),
      db
        .select({ item: feedback, authorName: profiles.displayName })
        .from(feedback)
        .leftJoin(profiles, eq(profiles.userId, feedback.userId))
        .orderBy(desc(feedback.createdAt))
        .limit(25),
      db
        .select({
          entry: walletTransactions,
          userName: profiles.displayName,
        })
        .from(walletTransactions)
        .innerJoin(profiles, eq(profiles.userId, walletTransactions.userId))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(25),
    ]);

  // The ledger is the source of truth; this flags any wallet that drifted from it.
  const drift = await db.execute<{ display_name: string; balance: number; ledger: number }>(sql`
    SELECT p.display_name, w.balance::int AS balance,
           COALESCE(SUM(t.amount), 0)::int AS ledger
    FROM wallets w
    JOIN profiles p ON p.user_id = w.user_id
    LEFT JOIN wallet_transactions t ON t.user_id = w.user_id
    GROUP BY p.display_name, w.balance
    HAVING w.balance <> COALESCE(SUM(t.amount), 0)::int
  `);

  const openReports = reportRows.filter((r) => r.report.status === "OPEN");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">Admin</h1>
        <p className="mt-1 text-ink-600">
          Community health, moderation and what early members are telling us.
        </p>
      </div>

      {/* ledger integrity */}
      <div
        className={`rounded-2xl border px-5 py-4 ${
          drift.rows.length
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-moss-100 bg-moss-50 text-moss-800"
        }`}
      >
        <p className="font-semibold">
          {drift.rows.length
            ? `⚠ ${drift.rows.length} wallet(s) disagree with the ledger`
            : "✓ Every wallet balance matches its ledger"}
        </p>
        {drift.rows.length ? (
          <ul className="mt-2 text-sm">
            {drift.rows.map((row) => (
              <li key={row.display_name}>
                {row.display_name}: balance {row.balance}, ledger {row.ledger}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* metrics */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-ink-900">Product metrics</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Metric label="Registered members" value={metrics.registered_users} />
          <Metric label="Active in 30 days" value={metrics.recently_active_users} />
          <Metric label="Listings" value={metrics.listings} />
          <Metric label="Active listings" value={metrics.active_listings} />
          <Metric label="Products" value={metrics.product_listings} />
          <Metric label="Services" value={metrics.service_listings} />
          <Metric label="Offers" value={metrics.offers} />
          <Metric label="Requests" value={metrics.requests} />
          <Metric label="Swop requests" value={metrics.swap_requests} />
          <Metric label="Accepted" value={metrics.accepted_swaps} />
          <Metric label="Completed" value={metrics.completed_swaps} highlight />
          <Metric label="Cancelled" value={metrics.cancelled_swaps} />
          <Metric label="Declined" value={metrics.declined_swaps} />
          <Metric label="Completion rate" value={`${metrics.completion_rate}%`} highlight />
          <Metric label="SP circulated" value={`${metrics.points_circulated} SP`} />
          <Metric label="Average SP / Swop" value={`${metrics.average_points_per_swap} SP`} />
          <Metric label="SP outstanding" value={`${metrics.points_outstanding} SP`} />
          <Metric label="Listings per member" value={metrics.listings_per_user} />
          <Metric label="Swops per member" value={metrics.swaps_per_user} />
          <Metric label="Messages" value={metrics.messages} />
          <Metric label="Reviews" value={metrics.reviews} />
          <Metric label="Open reports" value={metrics.open_reports} />
        </div>
      </section>

      {/* reports */}
      <Panel title={`Reports (${openReports.length} open)`}>
        {reportRows.length === 0 ? (
          <EmptyState emoji="🛡️" title="No reports" description="Nothing has been flagged." />
        ) : (
          <Table head={["Reported", "Reason", "By", "When", "Status", ""]}>
            {reportRows.map(({ report, reporterName }) => (
              <tr key={report.id} className="border-t border-sand-200">
                <Td>
                  {report.targetType === "LISTING" ? (
                    <Link
                      href={`/marketplace/${report.targetId}`}
                      className="text-moss-700 hover:underline"
                    >
                      Listing
                    </Link>
                  ) : report.targetType === "USER" ? (
                    <Link
                      href={`/profile/${report.targetId}`}
                      className="text-moss-700 hover:underline"
                    >
                      Member
                    </Link>
                  ) : (
                    "Message"
                  )}
                </Td>
                <Td>
                  <span className="capitalize">
                    {report.reason.toLowerCase().replaceAll("_", " ")}
                  </span>
                  {report.details ? (
                    <p className="mt-0.5 max-w-xs text-xs text-ink-500">{report.details}</p>
                  ) : null}
                </Td>
                <Td>{reporterName}</Td>
                <Td className="whitespace-nowrap">{timeAgo(report.createdAt)}</Td>
                <Td>
                  <Pill tone={report.status === "OPEN" ? "clay" : "neutral"}>
                    {report.status.toLowerCase()}
                  </Pill>
                </Td>
                <Td>
                  {report.status === "OPEN" ? (
                    <div className="flex gap-1.5">
                      <AdminActionButton
                        action={resolveReportAction}
                        fields={{ reportId: report.id, status: "REVIEWED" }}
                        label="Actioned"
                      />
                      <AdminActionButton
                        action={resolveReportAction}
                        fields={{ reportId: report.id, status: "DISMISSED" }}
                        label="Dismiss"
                        variant="ghost"
                      />
                    </div>
                  ) : null}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>

      {/* members */}
      <Panel title={`Members (${memberRows.length})`}>
        <Table head={["Member", "Email", "City", "Balance", "Joined", ""]}>
          {memberRows.map((member) => (
            <tr key={member.id} className="border-t border-sand-200">
              <Td>
                <Link
                  href={`/profile/${member.id}`}
                  className="font-medium text-ink-900 hover:underline"
                >
                  {member.displayName}
                </Link>
                {member.role === "ADMIN" ? (
                  <Pill tone="moss" className="ml-2">
                    admin
                  </Pill>
                ) : null}
                {!member.isActive ? (
                  <Pill tone="red" className="ml-2">
                    deactivated
                  </Pill>
                ) : null}
              </Td>
              <Td className="text-ink-500">{member.email}</Td>
              <Td>{member.city}</Td>
              <Td className="font-medium">{member.balance} SP</Td>
              <Td className="whitespace-nowrap">{timeAgo(member.createdAt)}</Td>
              <Td>
                <AdminActionButton
                  action={setUserActiveAction}
                  fields={{ userId: member.id, isActive: String(!member.isActive) }}
                  label={member.isActive ? "Deactivate" : "Reactivate"}
                  variant={member.isActive ? "ghost" : "secondary"}
                  confirm={
                    member.isActive
                      ? "Deactivate this member? They will not be able to log in."
                      : undefined
                  }
                />
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>

      {/* listings */}
      <Panel title="Latest listings">
        <Table head={["Listing", "Owner", "SP", "Status", "When", ""]}>
          {listingRows.map((listing) => (
            <tr key={listing.id} className="border-t border-sand-200">
              <Td>
                <Link
                  href={`/marketplace/${listing.id}`}
                  className="font-medium text-ink-900 hover:underline"
                >
                  {listing.title}
                </Link>
              </Td>
              <Td>{listing.ownerName}</Td>
              <Td>{listing.points} SP</Td>
              <Td>
                <Pill tone={listing.status === "ACTIVE" ? "moss" : "neutral"}>
                  {listing.status.toLowerCase()}
                </Pill>
              </Td>
              <Td className="whitespace-nowrap">{timeAgo(listing.createdAt)}</Td>
              <Td>
                <AdminActionButton
                  action={setListingActiveAction}
                  fields={{
                    listingId: listing.id,
                    activate: String(listing.status !== "ACTIVE"),
                  }}
                  label={listing.status === "ACTIVE" ? "Deactivate" : "Restore"}
                  variant={listing.status === "ACTIVE" ? "ghost" : "secondary"}
                />
              </Td>
            </tr>
          ))}
        </Table>
      </Panel>

      {/* ledger */}
      <Panel title="Latest Social Point transactions">
        <Table head={["Member", "Description", "Type", "Amount", "When"]}>
          {ledgerRows.map(({ entry, userName }) => (
            <tr key={entry.id} className="border-t border-sand-200">
              <Td>{userName}</Td>
              <Td>{entry.description}</Td>
              <Td className="text-ink-500">
                {entry.type.toLowerCase().replaceAll("_", " ")}
              </Td>
              <Td
                className={`font-medium ${
                  entry.amount > 0 ? "text-moss-700" : "text-clay-700"
                }`}
              >
                {formatSigned(entry.amount)}
              </Td>
              <Td className="whitespace-nowrap">{timeAgo(entry.createdAt)}</Td>
            </tr>
          ))}
        </Table>
      </Panel>

      {/* feedback */}
      <Panel title={`FirstMover feedback (${feedbackRows.length})`}>
        {feedbackRows.length === 0 ? (
          <EmptyState emoji="💡" title="No feedback yet" />
        ) : (
          <ul className="divide-y divide-sand-200">
            {feedbackRows.map(({ item, authorName }) => (
              <li key={item.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill
                    tone={item.type === "BUG" ? "red" : item.type === "IDEA" ? "moss" : "sand"}
                  >
                    {item.type.toLowerCase()}
                  </Pill>
                  <span className="text-sm text-ink-500">
                    {authorName ?? "Anonymous"} · {timeAgo(item.createdAt)}
                  </span>
                </div>
                <p className="mt-2 leading-relaxed text-ink-700">{item.message}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        highlight ? "border-moss-200 bg-moss-50" : "border-sand-200 bg-white"
      }`}
    >
      <p className="text-xs text-ink-500">{label}</p>
      <p
        className={`mt-0.5 text-xl font-bold ${
          highlight ? "text-moss-700" : "text-ink-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {children}
    </Card>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-sand-50 text-left text-xs uppercase tracking-wide text-ink-400">
            {head.map((cell, i) => (
              <th key={i} className="whitespace-nowrap px-5 py-2.5 font-medium">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-5 py-3 align-top ${className}`}>{children}</td>;
}
