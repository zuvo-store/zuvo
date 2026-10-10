import { requireUser } from "@/lib/auth";
import type { ReactNode } from "react";

export default async function AccountLayout({ children }: { children: ReactNode }) {
  await requireUser("/account");
  return <>{children}</>;
}
