import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Nigeria Legacy Queen International | Mental Renaissance",
  description:
    "NLQI is a non-profit pageant foundation empowering Nigerian women through leadership, intellect, advocacy and legacy. More than a crown. It's a platform for purpose.",
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
