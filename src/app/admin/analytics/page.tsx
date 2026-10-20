import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { count, eq } from "drizzle-orm";

export default async function AdminAnalyticsPage() {
  await requireAdmin();

  const byState = await db
    .select({ state: applications.stateOfOrigin, count: count() })
    .from(applications)
    .groupBy(applications.stateOfOrigin)
    .orderBy(applications.stateOfOrigin);

  const byStatus = await db
    .select({ status: applications.status, count: count() })
    .from(applications)
    .groupBy(applications.status);

  const paidCount = await db
    .select({ count: count() })
    .from(applications)
    .where(eq(applications.paymentStatus, "paid"));

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold text-nlqi-green mb-8">Analytics</h1>
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl p-8 border border-nlqi-gold/10">
          <h2 className="text-xl font-semibold text-nlqi-green mb-6">Applications by State</h2>
          <div className="space-y-3">
            {byState.map((s) => (
              <div key={s.state} className="flex justify-between items-center p-3 bg-nlqi-cream rounded-xl">
                <span className="text-nlqi-charcoal font-medium">{s.state || "Unknown"}</span>
                <span className="px-3 py-1 bg-nlqi-green text-white text-xs rounded-full">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-8 border border-nlqi-gold/10">
          <h2 className="text-xl font-semibold text-nlqi-green mb-6">Applications by Status</h2>
          <div className="space-y-3">
            {byStatus.map((s) => (
              <div key={s.status} className="flex justify-between items-center p-3 bg-nlqi-cream rounded-xl">
                <span className="text-nlqi-charcoal font-medium capitalize">{s.status}</span>
                <span className="px-3 py-1 bg-nlqi-gold text-nlqi-green text-xs rounded-full">{s.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 p-4 bg-nlqi-green rounded-xl text-white">
            <p className="text-sm text-white/80">Paid Applications</p>
            <p className="text-3xl font-bold text-nlqi-gold">{paidCount[0]?.count || 0}</p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
