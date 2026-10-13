import type { Metadata } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import AIAssistant from "@/components/AIAssistant";
import ViewTracker from "@/components/ViewTracker";

export const metadata: Metadata = {
  title: "ZUVO — Discover More. Shop Smarter.",
  description:
    "ZUVO is a demo marketplace. Discover more, shop smarter — browse deals, track orders, and earn rewards.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white font-sans text-zinc-900 antialiased">
        <SiteHeader />
        <main className="min-h-[60vh]">{children}</main>
        <SiteFooter />
        <AIAssistant />
        <ViewTracker />
      </body>
    </html>
  );
}
