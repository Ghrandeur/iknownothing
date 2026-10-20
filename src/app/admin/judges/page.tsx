import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin-shell";
import { db } from "@/db";
import { judges } from "@/db/schema";
import { Gavel } from "lucide-react";

export default async function AdminJudgesPage() {
  await requireAdmin();
  const rows = await db.select().from(judges);

  return (
    <AdminShell>
      <h1 className="text-3xl font-semibold text-nlqi-green mb-8">Judges</h1>
      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-nlqi-gold/10">
          <Gavel className="w-12 h-12 text-nlqi-gold mx-auto mb-4" />
          <p className="text-nlqi-charcoal/70">No judges added yet. This module is ready for scoring integration.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {rows.map((j) => (
            <div key={j.id} className="bg-white rounded-2xl p-6 border border-nlqi-gold/10">
              <h3 className="text-lg font-semibold text-nlqi-green">{j.name}</h3>
              <p className="text-sm text-nlqi-charcoal/70">{j.bio}</p>
              <span className={`inline-block mt-3 px-3 py-1 rounded-full text-xs ${j.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                {j.active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
