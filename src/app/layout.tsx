import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Swop-it — Share more. Buy less.",
    template: "%s · Swop-it",
  },
  description:
    "Borrow products, exchange skills and help your neighbourhood. Swop-it is a local sharing marketplace that runs on Social Points instead of money.",
};

export const viewport: Viewport = {
  themeColor: "#fbf9f5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
