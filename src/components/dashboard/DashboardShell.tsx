"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Bell,
  CalendarDays,
  FileText,
  CreditCard,
  Gavel,
  Handshake,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  ShieldCheck,
  User,
  Users,
  X,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import type { Role } from "@/lib/types";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ size?: number }> };

const AGENT_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/leads", label: "Leads", icon: Users },
  { href: "/dashboard/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/dashboard/transactions", label: "Transactions", icon: Gavel },
  { href: "/dashboard/referral-fees", label: "Referral Fees", icon: Receipt },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/documents", label: "Documents", icon: FileText },
  { href: "/dashboard/profile", label: "Profile", icon: User },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/agents", label: "Agents", icon: Users },
  { href: "/admin/leads", label: "Leads", icon: Handshake },
  { href: "/admin/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/admin/zipcodes", label: "ZIP Codes", icon: Home },
  { href: "/admin/transactions", label: "Transactions", icon: Gavel },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/agreements", label: "Agreements", icon: FileText },
  { href: "/admin/reports", label: "Reports", icon: Receipt },
  { href: "/admin/notifications", label: "Notifications", icon: Bell },
  { href: "/admin/audit", label: "Audit Log", icon: ShieldCheck },
];

export function DashboardShell({
  children,
  role,
  name,
  email,
  unread,
  activationQueue = 0,
}: {
  children: React.ReactNode;
  role: Role;
  name: string;
  email: string;
  unread: number;
  activationQueue?: number;
}) {
  const pathname = usePathname();
  const nav = role === "agent" ? AGENT_NAV : ADMIN_NAV;
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="flex min-h-screen bg-brand-50/50">
      {/* Dim backdrop behind the mobile drawer */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={close}
        className={`fixed inset-0 z-40 bg-brand-950/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col border-r border-brand-100 bg-white transition-transform duration-300 ease-out will-change-transform lg:w-60 lg:translate-x-0 ${
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-brand-100 px-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-950 text-accent-400">
            <Home size={16} />
          </span>
          <span className="font-serif text-base font-bold text-brand-950">
            Dewilio<span className="text-accent-500"> Homes</span>
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="ml-auto rounded-lg p-1.5 text-brand-500 transition-colors hover:bg-brand-50 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-brand-950 text-white" : "text-brand-700 hover:bg-brand-50 active:bg-brand-100"
                }`}
              >
                <item.icon size={18} />
                {item.label}
                {item.label === "Notifications" && unread > 0 ? (
                  <span className="ml-auto rounded-full bg-accent-500 px-1.5 py-0.5 text-[10px] font-bold text-brand-950">
                    {unread}
                  </span>
                ) : null}
                {item.label === "Payments" && activationQueue > 0 ? (
                  <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? "bg-white/20 text-white" : "bg-accent-500 text-brand-950"}`}>
                    {activationQueue}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-brand-100 p-3">
          <div className="rounded-lg bg-brand-50 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-brand-950">{name}</p>
            <p className="truncate text-xs text-brand-500">{email}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-accent-600">{role}</p>
          </div>
          <div className="mt-2 flex items-center justify-between px-1">
            <Link href="/" className="text-xs font-medium text-brand-500 hover:text-brand-950">
              View site
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="inline-flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-rose-600">
                <LogOut size={14} /> Log out
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex-1 lg:ml-60">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-brand-100 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="-ml-1 rounded-lg p-2 text-brand-700 transition-colors hover:bg-brand-50 lg:hidden"
            >
              <Menu size={20} />
            </button>
            <p className="truncate font-serif text-base font-bold text-brand-950 sm:text-lg">
              {role === "agent" ? "Agent Dashboard" : "Admin Backend"}
            </p>
          </div>
          <Link
            href={role === "agent" ? "/dashboard/notifications" : "/admin/notifications"}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-950 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-800"
          >
            <Bell size={14} />
            <span className="hidden sm:inline">Notifications {unread > 0 ? `(${unread})` : ""}</span>
            {unread > 0 ? (
              <span className="min-w-4 rounded-full bg-accent-500 px-1 text-center text-[10px] font-bold text-brand-950 sm:hidden">
                {unread}
              </span>
            ) : null}
          </Link>
        </header>
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
