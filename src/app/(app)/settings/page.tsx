import { eq } from "drizzle-orm";
import { LogOut } from "lucide-react";
import { db } from "@/db/client";
import { profiles } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logoutAction } from "@/app/(auth)/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, user.id));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
        </CardHeader>
        <CardBody>
          <SettingsForm
            defaults={{
              displayName: profile?.displayName ?? "",
              bio: profile?.bio ?? "",
              city: profile?.city ?? "",
              postalCode: profile?.postalCode ?? "",
              avatarUrl: profile?.avatarUrl ?? "",
            }}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <p className="text-sm text-ink-500">Email</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-ink-900">
              {user.email}
              {user.emailVerified ? <Pill tone="moss">Verified</Pill> : null}
            </p>
          </div>
          <p className="text-sm text-ink-500">
            Phone, identity and address verification are planned but not part of
            this prototype.
          </p>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">
              <LogOut size={15} /> Log out
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Help us build Swop-it</CardTitle>
        </CardHeader>
        <CardBody>
          <p className="mb-4 text-sm text-ink-600">
            You are one of the first members. Tell us what is missing, what is
            broken, or what you would change.
          </p>
          <ButtonLink href="/feedback" variant="secondary" size="sm">
            Give feedback
          </ButtonLink>
        </CardBody>
      </Card>
    </div>
  );
}
