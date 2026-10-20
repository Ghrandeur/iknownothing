import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getMyApplicationAction } from "@/lib/actions";

export default async function TrackPage() {
  const user = await getCurrentUser();
  let application: Record<string, unknown> | null = null;
  if (user && user.role === "applicant") {
    const res = await getMyApplicationAction();
    if (res.success) application = res.data as Record<string, unknown>;
  }

  return (
    <div className="min-h-[700px] bg-nlqi-cream flex items-center justify-center px-4 pt-20">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg border border-nlqi-gold/10 p-8">
        <h1 className="text-3xl font-semibold text-nlqi-green mb-6 text-center">Track Application</h1>
        {!user ? (
          <div className="text-center space-y-4">
            <p className="text-nlqi-charcoal/70">Login to view your application status.</p>
            <Link href="/login" className="inline-block px-8 py-3 bg-nlqi-green text-white rounded-full font-semibold">
              Login
            </Link>
          </div>
        ) : !application ? (
          <p className="text-center text-nlqi-charcoal/70">No application found.</p>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-sm text-nlqi-charcoal/60 uppercase tracking-wider">Application Number</p>
            <p className="text-2xl font-bold text-nlqi-green">{application.applicationNumber as string}</p>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-4 bg-nlqi-cream rounded-xl">
                <p className="text-xs text-nlqi-charcoal/60 uppercase">Status</p>
                <p className="font-semibold text-nlqi-green capitalize">{application.status as string}</p>
              </div>
              <div className="p-4 bg-nlqi-cream rounded-xl">
                <p className="text-xs text-nlqi-charcoal/60 uppercase">Payment</p>
                <p className="font-semibold text-nlqi-green capitalize">{application.paymentStatus as string}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
