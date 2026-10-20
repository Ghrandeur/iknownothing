import Link from "next/link";
import { Crown, Mail, ArrowUpRight } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-nlqi-green text-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 xl:px-10 py-16 lg:py-20">
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-nlqi-gold/60 text-nlqi-gold">
                <Crown className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-lg font-semibold tracking-widest uppercase">NLQI</h3>
                <p className="text-xs opacity-70">Nigeria Legacy Queen International</p>
              </div>
            </div>
            <p className="text-white/90 max-w-md leading-relaxed mb-6">
              Mental Renaissance. More than a crown. It is a platform for purpose. We empower
              Nigerian women to lead with intellect, advocacy and lasting impact.
            </p>
            <Link href="/apply" className="inline-flex items-center gap-2 text-sm font-semibold text-nlqi-gold hover:text-nlqi-gold-light">
              Become part of the story <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 uppercase tracking-wider text-sm">Quick Links</h4>
            <ul className="space-y-3 text-white/90 text-sm">
              <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link href="/apply" className="hover:text-white transition-colors">Apply</Link></li>
              <li><Link href="/track" className="hover:text-white transition-colors">Track Application</Link></li>
              <li><Link href="/gallery" className="hover:text-white transition-colors">Gallery</Link></li>
              <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 uppercase tracking-wider text-sm">Contact</h4>
            <ul className="space-y-4 text-white/90 text-sm">
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-white" />
                <a href="mailto:info@nlqi.ng" className="hover:text-nlqi-gold-light">info@nlqi.ng</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/60">
          <p>&copy; {new Date().getFullYear()} Nigeria Legacy Queen International. All rights reserved.</p>
          <Link href="/contact" className="hover:text-white">Contact the team</Link>
        </div>
      </div>
    </footer>
  );
}
