"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Crown, ArrowUpRight } from "lucide-react";
import { logoutAction } from "@/lib/actions";
import { useRouter } from "next/navigation";

export function Navbar({
  user,
}: {
  user: { role: string; email: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await logoutAction();
    router.refresh();
    router.push("/");
  };

  const links = [
    { href: "/", label: "Home" },
    { href: "/#about", label: "About" },
    { href: "/#impact", label: "Impact" },
    { href: "/gallery", label: "Gallery" },
    { href: "/blog", label: "Blog" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-nlqi-green/95 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 xl:px-10">
        <div className="flex items-center justify-between h-[76px]">
          <Link href="/" className="flex items-center gap-3 text-white" onClick={() => setOpen(false)}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-nlqi-gold/60 text-nlqi-gold">
              <Crown className="w-5 h-5" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-[0.18em] uppercase">NLQI</div>
              <div className="text-[9px] opacity-75 tracking-[0.12em] uppercase">Nigeria Legacy Queen International</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-white/90 hover:text-white transition-colors tracking-wide"
              >
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  href={user.role === "admin" ? "/admin" : "/apply"}
                  className="text-sm font-medium text-white hover:text-white transition-colors"
                >
                  {user.role === "admin" ? "Dashboard" : "My Application"}
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-sm text-white/90 hover:text-white transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link
                href="/apply"
                className="inline-flex items-center gap-2 px-5 py-3 text-[11px] font-bold tracking-[0.12em] uppercase text-nlqi-green bg-nlqi-gold hover:bg-nlqi-gold-light transition-colors rounded-full"
              >
                Apply Now <ArrowUpRight className="h-4 w-4" />
              </Link>
            )}
          </nav>

          <button
            type="button"
            className="md:hidden text-white p-2"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            aria-expanded={open}
            aria-controls="mobile-navigation"
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            id="mobile-navigation"
            className="md:hidden bg-nlqi-green border-t border-white/10 overflow-hidden"
          >
            <div className="px-5 py-6 space-y-5">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block text-white/90 hover:text-white"
                >
                  {l.label}
                </Link>
              ))}
              {user ? (
                <>
                <Link
                  href={user.role === "admin" ? "/admin" : "/apply"}
                  onClick={() => setOpen(false)}
                  className="block text-white font-medium"
                >
                  {user.role === "admin" ? "Dashboard" : "My Application"}
                </Link>
                  <button onClick={handleLogout} className="block text-white/90">
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  href="/apply"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-2 px-5 py-3 text-nlqi-green bg-nlqi-gold rounded-full font-semibold"
                >
                  Apply Now <ArrowUpRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
