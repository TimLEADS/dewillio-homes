"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Home, Menu, X } from "lucide-react";
import { Container } from "@/components/ui";
import { ScrollProgress } from "@/components/motion";

export function HeaderClient({
  nav,
  authDesktop,
  authMobile,
}: {
  nav: { href: string; label: string }[];
  authDesktop: ReactNode;
  authMobile: ReactNode;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the drawer on navigation. Deriving this during render avoids the
  // extra commit (and cascading render) that a setState-in-effect would cause.
  const [menuPathname, setMenuPathname] = useState(pathname);
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    if (menuOpen) setMenuOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50">
      <div
        className={`border-b transition-all duration-500 ${
          scrolled
            ? "border-brand-100 bg-white/90 shadow-[0_10px_40px_-24px_rgba(11,31,58,0.55)] backdrop-blur-xl"
            : "border-transparent bg-white/60 backdrop-blur-md"
        }`}
      >
        <Container
          className={`flex items-center justify-between gap-4 transition-all duration-500 ${
            scrolled ? "h-16" : "h-20"
          }`}
        >
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-brand-950 text-accent-400 shadow-lg shadow-brand-950/20 transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105">
              <span className="absolute inset-0 bg-gradient-to-br from-accent-500/40 via-transparent to-brand-400/30 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <Home size={19} strokeWidth={2.2} className="relative" />
            </span>
            <span className="font-display text-xl font-bold tracking-tight text-brand-950">
              Dewilio<span className="text-accent-500"> Homes</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-active={pathname === item.href}
                className="link-underline text-sm font-medium text-brand-700 transition-colors hover:text-brand-950 data-[active=true]:text-brand-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 md:flex">{authDesktop}</div>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-brand-200 text-brand-900 transition-colors hover:bg-brand-50 md:hidden"
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </Container>

        <div className="h-0.5 w-full bg-brand-100/60">
          <ScrollProgress />
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 md:hidden ${
          menuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          onClick={() => setMenuOpen(false)}
          className={`absolute inset-0 bg-brand-950/40 backdrop-blur-sm transition-opacity duration-400 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <nav
          className={`absolute inset-x-3 top-24 origin-top rounded-3xl border border-brand-100 bg-white p-5 shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            menuOpen ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0"
          }`}
        >
          <div className="flex flex-col">
            {nav.map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className="border-b border-brand-50 py-3.5 text-base font-semibold text-brand-900 transition-all duration-500 hover:translate-x-1 hover:text-accent-600"
                style={{ transitionDelay: menuOpen ? `${i * 45}ms` : "0ms" }}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-3">{authMobile}</div>
        </nav>
      </div>
    </header>
  );
}
