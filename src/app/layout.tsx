import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "NLQI 2027 | Roots of Greatness — Mental Renaissance",
  description:
    "Official contestant registration for Nigeria Legacy Queen International 2027. A leadership and empowerment platform built on Roots of Greatness and Mental Renaissance.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="page-wrapper bg-white min-h-screen">
          <Navbar user={user ? { role: user.role, email: user.email } : null} />
          <main>{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
