import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session-server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");
  return children;
}
