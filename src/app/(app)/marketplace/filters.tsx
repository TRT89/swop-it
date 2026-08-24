"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import { RADIUS_OPTIONS } from "@/lib/geo";
import { cn } from "@/lib/utils";

type Category = { id: string; slug: string; name: string; kind: "PRODUCT" | "SERVICE" };

export function MarketplaceFilters({
  categories,
  hasLocation,
}: {
  categories: Category[];
  hasLocation: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(params.get("q") ?? "");

  const update = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      startTransition(() => router.push(`/marketplace?${next.toString()}`));
    },
    [params, router],
  );

  const kind = params.get("kind");
  const type = params.get("type");
  const activeCount = ["category", "type", "radius", "maxPoints", "sort"].filter((k) =>
    params.get(k),
  ).length;

  const relevantCategories = kind
    ? categories.filter((c) => c.kind === kind)
    : categories;

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: query });
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products or services…"
            aria-label="Search listings"
            className="pl-10"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                update({ q: null });
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
        <Button type="submit" disabled={pending}>
          Search
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <Chip active={!kind} onClick={() => update({ kind: null, category: null })}>
          Everything
        </Chip>
        <Chip
          active={kind === "PRODUCT"}
          onClick={() => update({ kind: "PRODUCT", category: null })}
        >
          Products
        </Chip>
        <Chip
          active={kind === "SERVICE"}
          onClick={() => update({ kind: "SERVICE", category: null })}
        >
          Services
        </Chip>

        <span className="mx-1 hidden h-5 w-px bg-sand-300 sm:block" />

        <Chip active={type === "OFFER"} onClick={() => update({ type: type === "OFFER" ? null : "OFFER" })}>
          Offers
        </Chip>
        <Chip active={type === "REQUEST"} onClick={() => update({ type: type === "REQUEST" ? null : "REQUEST" })}>
          Requests
        </Chip>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            open || activeCount
              ? "border-moss-200 bg-moss-50 text-moss-700"
              : "border-sand-300 bg-white text-ink-600 hover:bg-sand-100",
          )}
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeCount ? (
            <span className="grid size-4.5 place-items-center rounded-full bg-moss-600 px-1 text-[10px] text-white">
              {activeCount}
            </span>
          ) : null}
        </button>
      </div>

      {open ? (
        <div className="grid gap-4 rounded-2xl border border-sand-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="f-category" className="mb-1.5">
              Category
            </Label>
            <Select
              id="f-category"
              value={params.get("category") ?? ""}
              onChange={(e) => update({ category: e.target.value })}
            >
              <option value="">All categories</option>
              {relevantCategories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                  {!kind ? ` (${c.kind === "PRODUCT" ? "Product" : "Service"})` : ""}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="f-radius" className="mb-1.5">
              Distance
            </Label>
            <Select
              id="f-radius"
              value={params.get("radius") ?? ""}
              onChange={(e) => update({ radius: e.target.value })}
              disabled={!hasLocation}
            >
              <option value="">Anywhere</option>
              {RADIUS_OPTIONS.map((km) => (
                <option key={km} value={km}>
                  Within {km} km
                </option>
              ))}
            </Select>
            {!hasLocation ? (
              <p className="mt-1 text-xs text-ink-400">
                Add your city in settings to filter by distance.
              </p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="f-max" className="mb-1.5">
              Maximum Social Points
            </Label>
            <Select
              id="f-max"
              value={params.get("maxPoints") ?? ""}
              onChange={(e) => update({ maxPoints: e.target.value })}
            >
              <option value="">Any price</option>
              {[10, 20, 30, 50, 100].map((p) => (
                <option key={p} value={p}>
                  Up to {p} SP
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="f-sort" className="mb-1.5">
              Sort by
            </Label>
            <Select
              id="f-sort"
              value={params.get("sort") ?? "newest"}
              onChange={(e) => update({ sort: e.target.value })}
            >
              <option value="newest">Newest</option>
              <option value="nearest" disabled={!hasLocation}>
                Nearest
              </option>
              <option value="cheapest">Lowest SP</option>
              <option value="rated">Highest rated</option>
            </Select>
          </div>

          {activeCount ? (
            <div className="sm:col-span-2 lg:col-span-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  update({ category: null, type: null, radius: null, maxPoints: null, sort: null })
                }
              >
                Clear all filters
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-moss-600 bg-moss-600 text-white"
          : "border-sand-300 bg-white text-ink-600 hover:bg-sand-100",
      )}
    >
      {children}
    </button>
  );
}
