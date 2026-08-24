import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { countUnreadMessages, countUnreadNotifications } from "@/lib/queries";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  const [unreadMessages, unreadNotifications] = user
    ? await Promise.all([
        countUnreadMessages(user.id),
        countUnreadNotifications(user.id),
      ])
    : [0, 0];

  return (
    <AppShell
      user={user}
      unreadMessages={unreadMessages}
      unreadNotifications={unreadNotifications}
    >
      {children}
    </AppShell>
  );
}
