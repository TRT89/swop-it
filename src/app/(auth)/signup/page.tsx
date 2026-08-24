import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui/card";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Join" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <Card>
      <CardBody className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-ink-900">Join Swop-it</h1>
        <p className="mt-1 mb-6 text-sm text-ink-500">
          You start with{" "}
          <span className="font-semibold text-moss-700">50 Social Points</span>, so you
          can borrow something before you have lent anything.
        </p>

        <SignupForm />

        <p className="mt-6 text-center text-sm text-ink-500">
          Already a member?{" "}
          <Link href="/login" className="font-medium text-moss-700 hover:underline">
            Log in
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
