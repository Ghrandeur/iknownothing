"use client";

import { useState } from "react";
import { forgotPasswordAction } from "@/lib/actions";
import { Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const res = await forgotPasswordAction(new FormData(e.currentTarget));
    setLoading(false);
    setMsg(res.success ? res.message || "Check your email" : (res as { error?: string }).error || "Failed");
  };

  return (
    <div className="min-h-[700px] flex items-center justify-center bg-nlqi-cream px-4 pt-20">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-nlqi-gold/10 p-8">
        <h1 className="text-3xl font-semibold text-nlqi-green mb-6 text-center">Reset password</h1>
        {msg && <p className="mb-4 text-sm text-center text-nlqi-charcoal/80 bg-nlqi-cream p-3 rounded-lg">{msg}</p>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <input name="email" type="email" required placeholder="Email address" className="w-full rounded-xl border border-nlqi-green/20 px-4 py-3 focus:ring-2 focus:ring-nlqi-gold/50 focus:outline-none" />
          <button type="submit" disabled={loading} className="w-full py-3.5 bg-nlqi-green text-white font-semibold rounded-full hover:bg-nlqi-green-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Send reset link
          </button>
        </form>
      </div>
    </div>
  );
}
