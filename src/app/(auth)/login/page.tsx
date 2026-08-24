import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardBody } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = { title: "Log in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <Card>
      <CardBody className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-ink-900">Welcome back</h1>
        <p className="mt-1 mb-6 text-sm text-ink-500">
          Log in to see what your neighbourhood is sharing.
        </p>

        <LoginForm />

        <div className="mt-6 rounded-xl border border-moss-100 bg-moss-50 px-4 py-3 text-sm text-moss-800">
          <p className="font-medium">Demo account</p>
          <p className="mt-0.5 text-moss-700">
            <code className="font-mono">demo@swop-it.local</code> ·{" "}
            <code className="font-mono">swopit123</code> — already filled in above.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-ink-500">
          New here?{" "}
          <Link href="/signup" className="font-medium text-moss-700 hover:underline">
            Join the community
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
