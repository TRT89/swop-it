import { requireUser } from "@/lib/auth";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  return (
    <div>
      <h1 className="text-2xl font-bold text-ink-900">
        Hello {user.displayName.split(" ")[0]} 👋
      </h1>
      <p className="mt-2 text-ink-600">{user.balance} SP</p>
    </div>
  );
}
