import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getApplicationStatsAction } from "@/lib/actions";
import { AdminShell } from "@/components/admin-shell";
import { FileText, UserCheck, CreditCard, Users } from "lucide-react";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const res = await getApplicationStatsAction();
  const stats = res.success ? (res.data as Record<string, number>) : {};

  const cards = [
    { label: "Total Applications", value: stats.total || 0, icon: FileText },
    { label: "Pending Review", value: stats.pending || 0, icon: UserCheck },
    { label: "Approved", value: stats.approved || 0, icon: Users },
    { label: "Paid", value: stats.paid || 0, icon: CreditCard },
  ];

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold text-nlqi-green mb-8">Executive Overview</h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl p-6 shadow-sm border border-nlqi-gold/10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center text-nlqi-green">
              <c.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-nlqi-charcoal/60">{c.label}</p>
              <p className="text-3xl font-bold text-nlqi-green">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-nlqi-gold/10">
          <h2 className="text-xl font-semibold text-nlqi-green mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <a href="/admin/applications" className="block p-4 rounded-xl bg-nlqi-cream hover:bg-nlqi-gold/10 text-nlqi-green font-medium transition-colors">
              Review Applications
            </a>
            <a href="/admin/analytics" className="block p-4 rounded-xl bg-nlqi-cream hover:bg-nlqi-gold/10 text-nlqi-green font-medium transition-colors">
              View Analytics
            </a>
            <a href="/admin/finance" className="block p-4 rounded-xl bg-nlqi-cream hover:bg-nlqi-gold/10 text-nlqi-green font-medium transition-colors">
              Finance Overview
            </a>
          </div>
        </div>
        <div className="bg-nlqi-green rounded-2xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-xl font-semibold mb-2">Mental Renaissance</h2>
            <p className="text-white/80 leading-relaxed">
              Use this dashboard to manage applications, track payments, and discover the next
              generation of purpose-driven Nigerian leaders.
            </p>
          </div>
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-nlqi-gold/20 rounded-full blur-2xl" />
        </div>
      </div>
    </AdminShell>
  );
}
