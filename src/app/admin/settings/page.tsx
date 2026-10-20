import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { Shield, Lock, Mail, CreditCard } from "lucide-react";

export default async function AdminSettingsPage() {
  await requireAdmin();

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold text-nlqi-green mb-8">Settings</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-nlqi-gold/10 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center text-nlqi-green">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-nlqi-green">Application Fee</h3>
            <p className="text-nlqi-charcoal/70 text-sm">₦{process.env.APPLICATION_FEE || 5000}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-nlqi-gold/10 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center text-nlqi-green">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-nlqi-green">SMTP Status</h3>
            <p className="text-nlqi-charcoal/70 text-sm">{process.env.SMTP_HOST ? "Configured" : "Not configured"}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-nlqi-gold/10 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center text-nlqi-green">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-nlqi-green">Paystack</h3>
            <p className="text-nlqi-charcoal/70 text-sm">{process.env.PAYSTACK_SECRET_KEY ? "Connected" : "Mock mode"}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-nlqi-gold/10 flex items-start gap-4">
          <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center text-nlqi-green">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-nlqi-green">Security</h3>
            <p className="text-nlqi-charcoal/70 text-sm">JWT sessions, bcrypt passwords, role-based access enabled.</p>
          </div>
        </div>
      </div>
      <div className="mt-8 bg-nlqi-cream rounded-2xl p-6 border border-nlqi-gold/10">
        <h3 className="font-semibold text-nlqi-green mb-2 flex items-center gap-2"><Lock className="w-4 h-4" /> Security Controls</h3>
        <ul className="list-disc list-inside text-sm text-nlqi-charcoal/70 space-y-1">
          <li>HttpOnly session cookies</li>
          <li>Password hashing with bcrypt</li>
          <li>Role-based route protection</li>
          <li>Audit logging enabled</li>
          <li>File upload validation</li>
        </ul>
      </div>
    </AdminShell>
  );
}
