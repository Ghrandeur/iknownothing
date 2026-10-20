"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  Users,
  Gavel,
  Wallet,
  Settings,
  BarChart3,
  LogOut,
  Crown,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { logoutAction } from "@/lib/actions";
import { useRouter } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/applications", label: "Applications", icon: FileText },
  { href: "/admin/applicants", label: "Applicants", icon: Users },
  { href: "/admin/judges", label: "Judges", icon: Gavel },
  { href: "/admin/finance", label: "Finance", icon: Wallet },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-nlqi-cream flex">
      <aside className="hidden lg:flex w-72 flex-col bg-nlqi-green text-white fixed inset-y-0 left-0 z-40">
        <div className="p-8 flex items-center gap-3">
          <Crown className="w-8 h-8 text-white" />
          <div>
            <div className="font-bold tracking-widest uppercase">NLQI Admin</div>
            <div className="text-[10px] opacity-70">Mental Renaissance</div>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                pathname === l.href
                  ? "bg-white text-nlqi-green"
                  : "text-white/90 hover:bg-white/10"
              }`}
            >
              <l.icon className="w-4 h-4" />
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="p-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-white/90 hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-nlqi-green text-white flex items-center justify-between px-4 h-16">
        <div className="font-bold tracking-widest uppercase">NLQI Admin</div>
        <button onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </div>

      {open && (
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: 0 }}
          className="lg:hidden fixed inset-0 z-40 bg-nlqi-green text-white pt-20 px-4"
        >
          <nav className="space-y-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                  pathname === l.href ? "bg-white text-nlqi-green" : "text-white/90"
                }`}
              >
                <l.icon className="w-4 h-4" /> {l.label}
              </Link>
            ))}
          </nav>
          <button
            onClick={handleLogout}
            className="mt-6 flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-white/90"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </motion.div>
      )}

      <div className="flex-1 lg:ml-72 pt-16 lg:pt-0">
        <main className="p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
