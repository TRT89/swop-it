"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, Settings, Shield, User } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { logoutAction } from "@/app/(auth)/actions";

export function AccountMenu({
  userId,
  displayName,
  avatarUrl,
  isAdmin,
}: {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Your account"
        className="ml-1 rounded-full transition-opacity hover:opacity-80"
      >
        <Avatar name={displayName} src={avatarUrl} size="sm" />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-xl border border-sand-200 bg-white py-1 shadow-lg"
        >
          <p className="truncate px-4 py-2 text-sm font-medium text-ink-900">
            {displayName}
          </p>
          <div className="my-1 h-px bg-sand-200" />
          <MenuLink href={`/profile/${userId}`} onClick={() => setOpen(false)}>
            <User size={16} /> My profile
          </MenuLink>
          <MenuLink href="/settings" onClick={() => setOpen(false)}>
            <Settings size={16} /> Settings
          </MenuLink>
          {isAdmin ? (
            <MenuLink href="/admin" onClick={() => setOpen(false)}>
              <Shield size={16} /> Admin
            </MenuLink>
          ) : null}
          <div className="my-1 h-px bg-sand-200" />
          <form action={logoutAction}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-sand-100"
            >
              <LogOut size={16} /> Log out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-sand-100"
    >
      {children}
    </Link>
  );
}
