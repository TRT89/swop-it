import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "moss" | "clay" | "sand" | "red" | "blue";

const TONES: Record<Tone, string> = {
  neutral: "bg-sand-100 text-ink-600 border-sand-200",
  moss: "bg-moss-50 text-moss-700 border-moss-100",
  clay: "bg-clay-100 text-clay-700 border-clay-300/60",
  sand: "bg-sand-200 text-ink-700 border-sand-300",
  red: "bg-red-50 text-red-700 border-red-100",
  blue: "bg-sky-50 text-sky-700 border-sky-100",
};

export function Pill({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

export function PointsPill({
  points,
  suffix,
  className,
}: {
  points: number;
  suffix?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-0.5 rounded-full bg-moss-600 px-2.5 py-1 text-sm font-semibold text-white",
        className,
      )}
    >
      {points} SP
      {suffix ? <span className="text-xs font-normal opacity-80">{suffix}</span> : null}
    </span>
  );
}
