"use client";

import { useState } from "react";
import { sendContactAction } from "@/lib/actions";
import { Mail, MapPin, Loader2 } from "lucide-react";

export default function ContactPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const res = await sendContactAction(new FormData(e.currentTarget));
    setLoading(false);
    setMsg(res.success ? res.message || "Message sent" : (res as { error?: string }).error || "Failed");
  };

  return (
    <div className="min-h-[700px] bg-nlqi-cream pt-32 pb-20 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-nlqi-gold uppercase tracking-[0.2em] text-xs font-bold">Contact</span>
          <h1 className="text-4xl md:text-5xl font-semibold text-nlqi-green mt-4">Get in touch</h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          <div className="bg-white rounded-2xl shadow-sm border border-nlqi-gold/10 p-8">
            {msg && <p className="mb-4 text-sm text-center text-nlqi-charcoal/80 bg-nlqi-cream p-3 rounded-lg">{msg}</p>}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-nlqi-charcoal mb-1">Name</label>
                <input name="name" required className="w-full rounded-xl border border-nlqi-green/20 px-4 py-3 focus:ring-2 focus:ring-nlqi-gold/50 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-nlqi-charcoal mb-1">Email</label>
                <input name="email" type="email" required className="w-full rounded-xl border border-nlqi-green/20 px-4 py-3 focus:ring-2 focus:ring-nlqi-gold/50 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-nlqi-charcoal mb-1">Message</label>
                <textarea name="message" required rows={5} className="w-full rounded-xl border border-nlqi-green/20 px-4 py-3 focus:ring-2 focus:ring-nlqi-gold/50 focus:outline-none" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3.5 bg-nlqi-green text-white font-semibold rounded-full hover:bg-nlqi-green-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />} Send Message
              </button>
            </form>
          </div>

          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center text-nlqi-green">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-nlqi-green">Email</h3>
                <p className="text-nlqi-charcoal/70">info@nlqi.ng</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center text-nlqi-green">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-nlqi-green">Location</h3>
                <p className="text-nlqi-charcoal/70">Lagos, Nigeria</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
