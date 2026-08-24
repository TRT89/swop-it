import { requireUser } from "@/lib/auth";
import { getCategories } from "@/lib/listings";
import { CreateListingForm } from "./create-form";

export const metadata = { title: "Create a listing" };

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, categories, params] = await Promise.all([
    requireUser(),
    getCategories(),
    searchParams,
  ]);

  const typeParam = params.type;
  const initialType =
    typeParam === "OFFER" || typeParam === "REQUEST" ? typeParam : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">Create a listing</h1>
        <p className="mt-1 text-ink-600">
          Share something you own, or ask the community for a hand.
        </p>
      </div>

      <CreateListingForm
        categories={categories}
        defaultCity={user.city}
        defaultPostalCode={user.postalCode}
        initialType={initialType}
      />
    </div>
  );
}
