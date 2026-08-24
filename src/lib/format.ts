import type { priceUnit } from "@/db/schema";

type PriceUnit = (typeof priceUnit.enumValues)[number];

const UNIT_SUFFIX: Record<PriceUnit, string> = {
  TOTAL: "",
  PER_HOUR: " / hour",
  PER_DAY: " / day",
  PER_WEEKEND: " / weekend",
  PER_WEEK: " / week",
};

export function formatPoints(points: number, unit: PriceUnit = "TOTAL") {
  return `${points} SP${UNIT_SUFFIX[unit]}`;
}

export function formatSigned(amount: number) {
  return `${amount > 0 ? "+" : ""}${amount} SP`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function timeAgo(date: Date | string) {
  const then = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.round((Date.now() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return then.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
