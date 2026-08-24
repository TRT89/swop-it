import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

type MetricsRow = {
  registered_users: number;
  active_users: number;
  recently_active_users: number;
  listings: number;
  active_listings: number;
  product_listings: number;
  service_listings: number;
  offers: number;
  requests: number;
  swap_requests: number;
  accepted_swaps: number;
  completed_swaps: number;
  cancelled_swaps: number;
  declined_swaps: number;
  points_circulated: number;
  average_points_per_swap: number;
  points_outstanding: number;
  open_reports: number;
  feedback_items: number;
  messages: number;
  reviews: number;
};

export type Metrics = Awaited<ReturnType<typeof getMetrics>>;

/**
 * Product metrics for the admin dashboard. One round trip, computed in SQL so
 * the numbers stay correct as the data grows.
 */
export async function getMetrics() {
  const result = await db.execute<MetricsRow>(sql`
    SELECT
      (SELECT count(*) FROM users)::int AS registered_users,
      (SELECT count(*) FROM users WHERE is_active)::int AS active_users,
      (SELECT count(DISTINCT user_id) FROM (
         SELECT provider_id AS user_id FROM swaps WHERE created_at > now() - interval '30 days'
         UNION SELECT requester_id FROM swaps WHERE created_at > now() - interval '30 days'
         UNION SELECT sender_id FROM messages WHERE created_at > now() - interval '30 days'
         UNION SELECT owner_id FROM listings WHERE created_at > now() - interval '30 days'
       ) recent)::int AS recently_active_users,

      (SELECT count(*) FROM listings)::int AS listings,
      (SELECT count(*) FROM listings WHERE status = 'ACTIVE')::int AS active_listings,
      (SELECT count(*) FROM listings WHERE kind = 'PRODUCT')::int AS product_listings,
      (SELECT count(*) FROM listings WHERE kind = 'SERVICE')::int AS service_listings,
      (SELECT count(*) FROM listings WHERE type = 'OFFER')::int AS offers,
      (SELECT count(*) FROM listings WHERE type = 'REQUEST')::int AS requests,

      (SELECT count(*) FROM swaps)::int AS swap_requests,
      (SELECT count(*) FROM swaps WHERE status IN ('ACCEPTED','ACTIVE','COMPLETION_PENDING','COMPLETED'))::int AS accepted_swaps,
      (SELECT count(*) FROM swaps WHERE status = 'COMPLETED')::int AS completed_swaps,
      (SELECT count(*) FROM swaps WHERE status = 'CANCELLED')::int AS cancelled_swaps,
      (SELECT count(*) FROM swaps WHERE status = 'DECLINED')::int AS declined_swaps,

      (SELECT COALESCE(sum(amount), 0) FROM wallet_transactions WHERE amount > 0 AND type = 'SWAP_EARNED')::int AS points_circulated,
      (SELECT COALESCE(round(avg(points)), 0) FROM swaps WHERE status = 'COMPLETED')::int AS average_points_per_swap,
      (SELECT COALESCE(sum(balance), 0) FROM wallets)::int AS points_outstanding,

      (SELECT count(*) FROM reports WHERE status = 'OPEN')::int AS open_reports,
      (SELECT count(*) FROM feedback)::int AS feedback_items,
      (SELECT count(*) FROM messages)::int AS messages,
      (SELECT count(*) FROM reviews)::int AS reviews
  `);

  const row = result.rows[0]!;
  const users = row.registered_users || 1;

  return {
    ...row,
    listings_per_user: Number((row.listings / users).toFixed(2)),
    swaps_per_user: Number((row.completed_swaps / users).toFixed(2)),
    // The share of requests that turned into a finished Swop — the number that
    // says whether the core hypothesis is working.
    completion_rate: row.swap_requests
      ? Math.round((row.completed_swaps / row.swap_requests) * 100)
      : 0,
  };
}
