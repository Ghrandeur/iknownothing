import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { AdminApplicationsClient } from "@/components/admin-applications";

export default async function AdminApplicationsPage() {
  await requireAdmin();
  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold text-nlqi-green mb-8">Applications</h1>
      <AdminApplicationsClient />
    </AdminShell>
  );
}
