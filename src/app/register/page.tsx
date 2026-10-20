"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { registerAction } from "@/lib/actions";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    const formData = new FormData(e.currentTarget);
    const res = await registerAction(formData);
    setLoading(false);
    if (res.success) {
      setSuccess(res.message || "Account created");
      setTimeout(() => router.push("/login"), 2000);
    } else {
      setError((res as { error?: string }).error || "Registration failed");
    }
  };

  return (
    <div className="min-h-[700px] flex items-center justify-center bg-nlqi-cream px-4 pt-20">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-nlqi-gold/10 p-8">
        <h1 className="text-3xl font-semibold text-nlqi-green mb-2 text-center">Create account</h1>
        <p className="text-center text-nlqi-charcoal/60 mb-8">Start your NLQI application</p>
        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
        {success && <p className="mb-4 text-sm text-green-700 bg-green-50 p-3 rounded-lg">{success}</p>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-nlqi-charcoal mb-1">First Name</label>
              <input name="firstName" required className="w-full rounded-xl border border-nlqi-green/20 px-4 py-3 focus:ring-2 focus:ring-nlqi-gold/50 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-nlqi-charcoal mb-1">Last Name</label>
              <input name="lastName" required className="w-full rounded-xl border border-nlqi-green/20 px-4 py-3 focus:ring-2 focus:ring-nlqi-gold/50 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-nlqi-charcoal mb-1">Phone</label>
            <input name="phone" type="tel" required className="w-full rounded-xl border border-nlqi-green/20 px-4 py-3 focus:ring-2 focus:ring-nlqi-gold/50 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-nlqi-charcoal mb-1">Email</label>
            <input name="email" type="email" required className="w-full rounded-xl border border-nlqi-green/20 px-4 py-3 focus:ring-2 focus:ring-nlqi-gold/50 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-nlqi-charcoal mb-1">Password</label>
            <input name="password" type="password" required minLength={8} className="w-full rounded-xl border border-nlqi-green/20 px-4 py-3 focus:ring-2 focus:ring-nlqi-gold/50 focus:outline-none" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-3.5 bg-nlqi-green text-white font-semibold rounded-full hover:bg-nlqi-green-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Register
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-nlqi-charcoal/70">
          Already have an account? <Link href="/login" className="text-nlqi-gold hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
