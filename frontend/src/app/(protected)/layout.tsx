import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session-server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSession();
  if (!user) redirect("/login");
  return children;
}
