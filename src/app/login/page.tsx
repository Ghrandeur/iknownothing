"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginAction } from "@/lib/actions";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const res = await loginAction(formData);
    setLoading(false);
    if (res.success) {
      const data = res.data as { role: string } | undefined;
      router.push(data?.role === "admin" ? "/admin" : "/apply");
    } else {
      setError((res as { error?: string }).error || "Login failed");
    }
  };

  return (
    <div className="min-h-[700px] flex items-center justify-center bg-nlqi-cream px-4 pt-20">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-nlqi-gold/10 p-8">
        <h1 className="text-3xl font-semibold text-nlqi-green mb-2 text-center">Welcome back</h1>
        <p className="text-center text-nlqi-charcoal/60 mb-8">Login to continue your legacy journey</p>
        {error && <p className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-nlqi-charcoal mb-1">Email</label>
            <input name="email" type="email" required className="w-full rounded-xl border border-nlqi-green/20 px-4 py-3 focus:ring-2 focus:ring-nlqi-gold/50 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-nlqi-charcoal mb-1">Password</label>
            <div className="relative">
              <input name="password" type={show ? "text" : "password"} required className="w-full rounded-xl border border-nlqi-green/20 px-4 py-3 focus:ring-2 focus:ring-nlqi-gold/50 focus:outline-none" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-3 text-nlqi-charcoal/50">
                {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3.5 bg-nlqi-green text-white font-semibold rounded-full hover:bg-nlqi-green-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Login
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-nlqi-charcoal/70 space-y-2">
          <p><Link href="/forgot-password" className="text-nlqi-gold hover:underline">Forgot password?</Link></p>
          <p>Don&apos;t have an account? <Link href="/register" className="text-nlqi-gold hover:underline">Register</Link></p>
        </div>
      </div>
    </div>
  );
}
