import Link from "next/link";
import { Bell, Home, MessageCircle, Plus, Search, User } from "lucide-react";
import type { CurrentUser } from "@/lib/auth";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { NavLink, MobileNavLink } from "@/components/nav-link";

export function AppShell({
  user,
  unreadMessages,
  unreadNotifications,
  children,
}: {
  user: CurrentUser | null;
  unreadMessages: number;
  unreadNotifications: number;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-sand-200 bg-sand-50/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-5">
          <Logo href={user ? "/dashboard" : "/"} />

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            <NavLink href="/marketplace">Marketplace</NavLink>
            {user ? (
              <>
                <NavLink href="/swaps">My Swops</NavLink>
                <NavLink href="/wallet">Wallet</NavLink>
              </>
            ) : null}
          </nav>

          <div className="ml-auto flex items-center gap-1.5">
            {user ? (
              <>
                <Link
                  href="/wallet"
                  className="hidden rounded-full bg-moss-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-moss-700 sm:inline-flex"
                >
                  {user.balance} SP
                </Link>
                <ButtonLink href="/create" size="sm" className="hidden sm:inline-flex">
                  <Plus size={16} /> Create
                </ButtonLink>
                <IconLink href="/messages" label="Messages" badge={unreadMessages}>
                  <MessageCircle size={20} />
                </IconLink>
                <IconLink href="/notifications" label="Notifications" badge={unreadNotifications}>
                  <Bell size={20} />
                </IconLink>
                <Link
                  href={`/profile/${user.id}`}
                  className="ml-1 rounded-full transition-opacity hover:opacity-80"
                  aria-label="Your profile"
                >
                  <Avatar name={user.displayName} src={user.avatarUrl} size="sm" />
                </Link>
              </>
            ) : (
              <>
                <ButtonLink href="/login" variant="ghost" size="sm">
                  Log in
                </ButtonLink>
                <ButtonLink href="/signup" size="sm">
                  Join
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-5 sm:pb-16">
        {children}
      </main>

      {user ? (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-sand-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          <div className="grid grid-cols-5">
            <MobileNavLink href="/dashboard" label="Home" icon={<Home size={20} />} />
            <MobileNavLink href="/marketplace" label="Search" icon={<Search size={20} />} />
            <MobileNavLink href="/create" label="Swop" icon={<Plus size={22} />} highlight />
            <MobileNavLink
              href="/messages"
              label="Messages"
              icon={<MessageCircle size={20} />}
              badge={unreadMessages}
            />
            <MobileNavLink
              href={`/profile/${user.id}`}
              label="Profile"
              icon={<User size={20} />}
            />
          </div>
        </nav>
      ) : null}
    </>
  );
}

function IconLink({
  href,
  label,
  badge,
  children,
}: {
  href: string;
  label: string;
  badge: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={badge > 0 ? `${label} (${badge} new)` : label}
      className="relative grid size-10 place-items-center rounded-full text-ink-600 transition-colors hover:bg-sand-100 hover:text-ink-900"
    >
      {children}
      {badge > 0 ? (
        <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-clay-500 px-1 text-[10px] font-bold leading-4 text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      ) : null}
    </Link>
  );
}
