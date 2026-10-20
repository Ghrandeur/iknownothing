import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMyApplicationAction } from "@/lib/actions";
import { ApplyForm } from "@/components/apply-form";

export default async function ApplyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin");

  const res = await getMyApplicationAction();
  if (!res.success) redirect("/login");

  return <ApplyForm application={res.data as Record<string, unknown>} />;
}
