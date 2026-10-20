import { redirect } from "next/navigation";
import { verifyEmailAction } from "@/lib/actions";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/login");
  const res = await verifyEmailAction(token);
  return (
    <div className="min-h-[700px] flex items-center justify-center bg-nlqi-cream px-4 pt-20">
      <div className="max-w-md bg-white rounded-2xl shadow-lg border border-nlqi-gold/10 p-8 text-center">
        <h1 className="text-3xl font-semibold text-nlqi-green mb-4">
          {res.success ? "Email Verified" : "Verification Failed"}
        </h1>
        <p className="text-nlqi-charcoal/70">
          {res.success
            ? "Your email has been verified. You can now log in."
            : (res as { error?: string }).error || "Invalid link"}
        </p>
      </div>
    </div>
  );
}
