import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-moss-600 text-white hover:bg-moss-700 active:bg-moss-800 shadow-sm disabled:bg-moss-300",
  secondary:
    "bg-sand-100 text-ink-800 hover:bg-sand-200 border border-sand-200 disabled:text-ink-400",
  outline:
    "bg-white text-ink-800 border border-sand-300 hover:bg-sand-100 disabled:text-ink-400",
  ghost: "text-ink-600 hover:bg-sand-100 hover:text-ink-900",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:bg-red-300",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-11 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export const buttonClasses = (
  variant: Variant = "primary",
  size: Size = "md",
  className?: string,
) =>
  cn(
    "inline-flex items-center justify-center rounded-xl font-medium transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-70",
    VARIANTS[variant],
    SIZES[size],
    className,
  );

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
