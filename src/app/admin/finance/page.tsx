import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { db } from "@/db";
import { payments, applications } from "@/db/schema";
import { eq, sum } from "drizzle-orm";

export default async function AdminFinancePage() {
  await requireAdmin();
  const paidRows = await db
    .select({ total: sum(payments.amount), count: sum(payments.id) })
    .from(payments)
    .where(eq(payments.status, "paid"));
  const paidApplications = await db
    .select({ count: sum(applications.id) })
    .from(applications)
    .where(eq(applications.paymentStatus, "paid"));

  const total = Number(paidRows[0]?.total || 0);
  const count = Number(paidRows[0]?.count || 0);

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold text-nlqi-green mb-8">Finance</h1>
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-2xl p-6 border border-nlqi-gold/10">
          <p className="text-sm text-nlqi-charcoal/60">Total Revenue</p>
          <p className="text-3xl font-bold text-nlqi-green">₦{total.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-nlqi-gold/10">
          <p className="text-sm text-nlqi-charcoal/60">Payments</p>
          <p className="text-3xl font-bold text-nlqi-green">{count}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-nlqi-gold/10">
          <p className="text-sm text-nlqi-charcoal/60">Paid Applications</p>
          <p className="text-3xl font-bold text-nlqi-green">{Number(paidApplications[0]?.count || 0)}</p>
        </div>
      </div>
    </AdminShell>
  );
}
