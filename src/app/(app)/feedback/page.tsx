import { getCurrentUser } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui/card";
import { FeedbackForm } from "@/components/feedback-form";

export const metadata = { title: "Give feedback" };

export default async function FeedbackPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">
          Help us build Swop-it
        </h1>
        <p className="mt-1.5 leading-relaxed text-ink-600">
          You are one of the first members, which means what you say actually
          changes what gets built next. Tell us what is missing, what is broken,
          or what you would do differently.
        </p>
      </div>

      <Card>
        <CardBody className="p-5 sm:p-6">
          <FeedbackForm />
          {!user ? (
            <p className="mt-4 text-sm text-ink-400">
              You are not logged in — that is fine, feedback can be anonymous.
            </p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
