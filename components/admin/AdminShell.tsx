import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import Forbidden from "@/components/Forbidden";
import Logo from "@/components/Logo";
import AdminSidebarNav from "@/components/admin/AdminSidebarNav";
import UnreadBadge from "@/components/admin/UnreadBadge";
import type { ReactNode } from "react";

function SidebarNav() {
  return <AdminSidebarNav />;
}

export default async function AdminShell({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login?next=/admin");
  if (user.role !== "ADMIN") return <Forbidden />;

  return (
    <div className="min-h-[60vh] bg-zinc-50">
      {/* Mobile nav (no JS needed) */}
      <details className="border-b border-zinc-200 bg-white md:hidden">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold text-zinc-900">
          Admin menu
          <UnreadBadge />
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
