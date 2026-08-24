"use client";

import { useActionState, useState } from "react";
import { ArrowLeft, HandHeart, Package, Search, Wrench } from "lucide-react";

import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormError, SubmitButton } from "@/components/form-parts";
import { createListingAction } from "@/server/listing-actions";
import { cn } from "@/lib/utils";

type Category = { id: string; slug: string; name: string; kind: "PRODUCT" | "SERVICE" };
type ListingType = "OFFER" | "REQUEST";
type ListingKind = "PRODUCT" | "SERVICE";

export function CreateListingForm({
  categories,
  defaultCity,
  defaultPostalCode,
  initialType,
}: {
  categories: Category[];
  defaultCity: string;
  defaultPostalCode: string;
  initialType?: ListingType;
}) {
  const [type, setType] = useState<ListingType | null>(initialType ?? null);
  const [kind, setKind] = useState<ListingKind | null>(null);
  const [state, formAction] = useActionState(createListingAction, null);

  const step = type === null ? 1 : kind === null ? 2 : 3;

  return (
    <div className="mx-auto max-w-2xl">
      <Steps current={step} />

      {step === 1 ? (
        <Choice
          heading="What would you like to post?"
          options={[
            {
              value: "OFFER",
              icon: <HandHeart size={24} />,
              title: "An offer",
              body: "Something you can lend or a skill you can share. You earn Social Points.",
              onPick: () => setType("OFFER"),
            },
            {
              value: "REQUEST",
              icon: <Search size={24} />,
              title: "A request",
              body: "Something you need. You spend Social Points when someone helps.",
              onPick: () => setType("REQUEST"),
            },
          ]}
        />
      ) : null}

      {step === 2 ? (
        <>
          <BackButton onClick={() => setType(null)} label="Offer or request" />
          <Choice
            heading={type === "OFFER" ? "What are you offering?" : "What are you looking for?"}
            options={[
              {
                value: "PRODUCT",
                icon: <Package size={24} />,
                title: "A product",
                body: "A physical thing that gets handed over and returned.",
                onPick: () => setKind("PRODUCT"),
              },
              {
                value: "SERVICE",
                icon: <Wrench size={24} />,
                title: "A service",
                body: "Your time and skills — anything from tutoring to a hand with the garden.",
                onPick: () => setKind("SERVICE"),
              },
            ]}
          />
        </>
      ) : null}

      {step === 3 && type && kind ? (
        <>
          <BackButton onClick={() => setKind(null)} label="Product or service" />
          <form action={formAction} className="space-y-5">
            <input type="hidden" name="type" value={type} />
            <input type="hidden" name="kind" value={kind} />

            <div className="rounded-xl border border-moss-100 bg-moss-50 px-4 py-3 text-sm text-moss-800">
              {type === "OFFER" ? "Offering" : "Looking for"} a{" "}
              {kind === "PRODUCT" ? "product" : "service"}
              {type === "OFFER"
                ? " — you will earn the Social Points."
                : " — you will spend the Social Points."}
            </div>

            <Field label="Title" htmlFor="title" error={state?.fieldErrors?.title}>
              <Input
                id="title"
                name="title"
                required
                maxLength={90}
                placeholder={
                  kind === "PRODUCT" ? "Bosch pressure washer" : "Help assembling furniture"
                }
              />
            </Field>

            <Field
              label="Description"
              hint="what it is, what condition, anything useful"
              htmlFor="description"
              error={state?.fieldErrors?.description}
            >
              <Textarea id="description" name="description" rows={5} required maxLength={2000} />
            </Field>

            <Field label="Category" htmlFor="categoryId" error={state?.fieldErrors?.categoryId}>
              <Select id="categoryId" name="categoryId" required defaultValue="">
                <option value="" disabled>
                  Choose a category…
                </option>
                {categories
                  .filter((c) => c.kind === kind)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-[1fr_1.2fr]">
              <Field
                label="Social Points"
                htmlFor="pricePoints"
                error={state?.fieldErrors?.pricePoints}
              >
                <Input
                  id="pricePoints"
                  name="pricePoints"
                  type="number"
                  min={0}
                  max={500}
                  required
                  defaultValue={15}
                />
              </Field>
              <Field label="Per" htmlFor="priceUnit" error={state?.fieldErrors?.priceUnit}>
                <Select
                  id="priceUnit"
                  name="priceUnit"
                  defaultValue={kind === "PRODUCT" ? "PER_DAY" : "TOTAL"}
                >
                  <option value="TOTAL">In total</option>
                  <option value="PER_HOUR">Per hour</option>
                  <option value="PER_DAY">Per day</option>
                  <option value="PER_WEEKEND">Per weekend</option>
                  <option value="PER_WEEK">Per week</option>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
              <Field label="City" htmlFor="city" error={state?.fieldErrors?.city}>
                <Input id="city" name="city" required defaultValue={defaultCity} />
              </Field>
              <Field
                label="Postal code"
                htmlFor="postalCode"
                error={state?.fieldErrors?.postalCode}
              >
                <Input id="postalCode" name="postalCode" required defaultValue={defaultPostalCode} />
              </Field>
            </div>

            <Field
              label="Availability"
              hint="optional"
              htmlFor="availability"
              error={state?.fieldErrors?.availability}
            >
              <Input
                id="availability"
                name="availability"
                maxLength={120}
                placeholder="Weekends, or weekday evenings after 18:00"
              />
            </Field>

            {kind === "PRODUCT" ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  label="Max loan"
                  hint="days"
                  htmlFor="loanDurationDays"
                  error={state?.fieldErrors?.loanDurationDays}
                >
                  <Input
                    id="loanDurationDays"
                    name="loanDurationDays"
                    type="number"
                    min={1}
                    max={365}
                    placeholder="3"
                  />
                </Field>
                <Field label="Hand-over" htmlFor="handover">
                  <Select id="handover" name="handover" defaultValue="PICKUP">
                    <option value="PICKUP">Pick-up</option>
                    <option value="DELIVERY">Delivery</option>
                    <option value="BOTH">Either</option>
                  </Select>
                </Field>
                <Field label="Condition" htmlFor="condition">
                  <Select id="condition" name="condition" defaultValue="GOOD">
                    <option value="NEW">As good as new</option>
                    <option value="GOOD">Good</option>
                    <option value="USED">Used</option>
                    <option value="WELL_LOVED">Well loved</option>
                  </Select>
                </Field>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Estimated duration"
                  hint="minutes"
                  htmlFor="estimatedMinutes"
                  error={state?.fieldErrors?.estimatedMinutes}
                >
                  <Input
                    id="estimatedMinutes"
                    name="estimatedMinutes"
                    type="number"
                    min={1}
                    max={10080}
                    placeholder="120"
                  />
                </Field>
                <Field label="Where" htmlFor="presence">
                  <Select id="presence" name="presence" defaultValue="IN_PERSON">
                    <option value="IN_PERSON">In person</option>
                    <option value="REMOTE">Remote</option>
                    <option value="EITHER">Either</option>
                  </Select>
                </Field>
              </div>
            )}

            <Field
              label="Tags"
              hint="comma separated, helps people find it"
              htmlFor="tags"
              error={state?.fieldErrors?.tags}
            >
              <Input id="tags" name="tags" maxLength={200} placeholder="drill, diy, tools" />
            </Field>

            <Field
              label="Photo URL"
              hint="optional — image uploads come later"
              htmlFor="imageUrl"
              error={state?.fieldErrors?.imageUrl}
            >
              <Input
                id="imageUrl"
                name="imageUrl"
                type="url"
                placeholder="https://…"
              />
              <p className="mt-1.5 text-xs text-ink-400">
                Leave this empty and we will generate a cover for you.
              </p>
            </Field>

            <FormError message={state?.error} />
            <SubmitButton label="Publish listing" pendingLabel="Publishing…" size="lg" />
          </form>
        </>
      ) : null}
    </div>
  );
}

function Steps({ current }: { current: number }) {
  const labels = ["Offer or request", "Product or service", "Details"];
  return (
    <ol className="mb-8 flex items-center gap-2 text-sm">
      {labels.map((label, i) => {
        const n = i + 1;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
                n < current
                  ? "bg-moss-600 text-white"
                  : n === current
                    ? "bg-moss-100 text-moss-800 ring-2 ring-moss-500"
                    : "bg-sand-200 text-ink-400",
              )}
            >
              {n}
            </span>
            <span
              className={cn(
                "hidden truncate sm:block",
                n === current ? "font-medium text-ink-900" : "text-ink-400",
              )}
            >
              {label}
            </span>
            {n < labels.length ? <span className="h-px flex-1 bg-sand-300" /> : null}
          </li>
        );
      })}
    </ol>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
    >
      <ArrowLeft size={16} /> {label}
    </button>
  );
}

function Choice({
  heading,
  options,
}: {
  heading: string;
  options: {
    value: string;
    icon: React.ReactNode;
    title: string;
    body: string;
    onPick: () => void;
  }[];
}) {
  return (
    <div>
      <h2 className="mb-5 text-xl font-bold text-ink-900">{heading}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={option.onPick}
            className="rounded-2xl border border-sand-200 bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-moss-300 hover:shadow-md"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-moss-50 text-moss-600">
              {option.icon}
            </span>
            <h3 className="mt-3 font-semibold text-ink-900">{option.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-ink-600">{option.body}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

