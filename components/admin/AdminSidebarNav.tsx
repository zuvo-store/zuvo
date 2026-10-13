"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import UnreadBadge from "./UnreadBadge";

const NAV: { href: string; label: string }[] = [
  { href: "/admin/inbox", label: "Inbox" },
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/carts", label: "Carts" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/fraud", label: "Fraud Check" },
  { href: "/admin/marketing", label: "Marketing" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/rewards", label: "Rewards" },
  { href: "/admin/referrals", label: "Referrals" },
  { href: "/admin/promotions", label: "Promotions" },
  { href: "/admin/campaigns", label: "Campaigns" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/visitors", label: "Visitors" },
  { href: "/admin/audit-logs", label: "Audit Logs" },
  { href: "/admin/settings", label: "Settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(href + "/");
}

/** Admin sidebar nav with the current section highlighted. */
export default function AdminSidebarNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin">
      <ul className="space-y-1 p-3">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "flex items-center gap-2 rounded-lg bg-orange-100 px-3 py-2 text-sm font-bold text-orange-800"
                    : "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                }
              >
                {active ? (
                  <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                ) : null}
                {item.label}
                {item.href === "/admin/inbox" ? <UnreadBadge /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
