"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPasswordAction } from "@/lib/actions";
import { Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const token = useSearchParams().get("token") || "";
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.append("token", token);
    const res = await resetPasswordAction(formData);
    setLoading(false);
    if (res.success) {
      setMsg(res.message || "Password reset");
      setTimeout(() => router.push("/login"), 2000);
    } else {
      setMsg((res as { error?: string }).error || "Failed");
    }
  };

  if (!token) {
    return (
      <div className="min-h-[700px] flex items-center justify-center bg-nlqi-cream px-4 pt-20">
        <p className="text-red-600">Invalid reset link</p>
      </div>
    );
  }

  return (
    <div className="min-h-[700px] flex items-center justify-center bg-nlqi-cream px-4 pt-20">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-nlqi-gold/10 p-8">
        <h1 className="text-3xl font-semibold text-nlqi-green mb-6 text-center">New password</h1>
        {msg && <p className="mb-4 text-sm text-center text-nlqi-charcoal/80 bg-nlqi-cream p-3 rounded-lg">{msg}</p>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <input name="password" type="password" required minLength={8} placeholder="New password" className="w-full rounded-xl border border-nlqi-green/20 px-4 py-3 focus:ring-2 focus:ring-nlqi-gold/50 focus:outline-none" />
          <button type="submit" disabled={loading} className="w-full py-3.5 bg-nlqi-green text-white font-semibold rounded-full hover:bg-nlqi-green-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Reset password
          </button>
        </form>
      </div>
    </div>
  );
}
