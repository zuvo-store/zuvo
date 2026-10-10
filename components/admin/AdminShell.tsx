import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Forbidden from "@/components/Forbidden";
import Logo from "@/components/Logo";
import type { ReactNode } from "react";

const NAV: { href: string; label: string }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/rewards", label: "Rewards" },
  { href: "/admin/referrals", label: "Referrals" },
  { href: "/admin/promotions", label: "Promotions" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
  { href: "/admin/settings", label: "Settings" },
];

function SidebarNav() {
  return (
    <nav aria-label="Admin">
      <ul className="space-y-1 p-3">
        {NAV.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default async function AdminShell({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?next=/admin");
  if (user.role !== "ADMIN") return <Forbidden />;

  return (
    <div className="min-h-[60vh] bg-zinc-50">
      {/* Mobile nav (no JS needed) */}
      <details className="border-b border-zinc-200 bg-white md:hidden">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-zinc-900">
          Admin menu
        </summary>
        <SidebarNav />
      </details>

      <div className="mx-auto flex max-w-7xl">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 md:block">
          <div className="sticky top-[104px] max-h-[calc(100vh-104px)] overflow-y-auto border-r border-zinc-200 bg-white">
            <div className="border-b border-zinc-100 p-4">
              <Logo compact />
            </div>
            <SidebarNav />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Topbar */}
          <div className="flex items-center justify-between gap-4 border-b border-zinc-200 bg-white px-4 py-3 sm:px-6">
            <p className="text-sm font-semibold text-zinc-900">
              Admin <span className="hidden text-zinc-400 sm:inline">— {user.name}</span>
            </p>
            <Link
              href="/"
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              View store
            </Link>
          </div>
          <div className="p-4 sm:p-6">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
