import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-sand-50">
      <header className="px-5 py-5">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-5 pb-16 sm:items-center sm:pb-24">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
