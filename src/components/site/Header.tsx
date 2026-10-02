import Link from "next/link";
import { ArrowRight, LogOut } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/auth";
import { HeaderClient } from "@/components/site/HeaderClient";

const NAV = [
  { href: "/how-it-works", label: "How It Works" },
  { href: "/for-agents", label: "For Agents" },
  { href: "/lead-program", label: "Lead Program" },
  { href: "/faq", label: "FAQ" },
];

export async function Header() {
  const user = await getSessionUser();
  const homeHref = user?.role === "agent" ? "/dashboard" : "/admin";
  const homeLabel = user?.role === "agent" ? "Dashboard" : "Admin";

  const authDesktop = user ? (
    <>
      <Link
        href={homeHref}
        className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-900 transition-colors hover:border-brand-400 hover:bg-brand-50"
      >
        {homeLabel}
      </Link>
      <form action={logoutAction}>
        <button
          type="submit"
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-brand-600 transition-colors hover:text-brand-950"
        >
          <LogOut size={16} /> Log out
        </button>
      </form>
    </>
  ) : (
    <>
      <Link
        href="/login"
        className="rounded-full px-4 py-2 text-sm font-semibold text-brand-900 transition-colors hover:bg-brand-50"
      >
        Agent Log in
      </Link>
      <Link
        href="/join"
        className="btn-sheen group inline-flex items-center gap-1.5 rounded-full bg-brand-950 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-950/20 transition-all duration-500 hover:shadow-xl hover:shadow-accent-500/25"
      >
        Activate for $1
        <ArrowRight size={15} className="transition-transform duration-500 group-hover:translate-x-1" />
      </Link>
    </>
  );

  const authMobile = user ? (
    <>
      <Link
        href={homeHref}
        className="rounded-full border border-brand-200 px-5 py-3 text-center text-sm font-semibold text-brand-900"
      >
        {homeLabel}
      </Link>
      <form action={logoutAction}>
        <button
          type="submit"
          className="w-full cursor-pointer rounded-full bg-brand-50 px-5 py-3 text-sm font-semibold text-brand-700"
        >
          Log out
        </button>
      </form>
    </>
  ) : (
    <>
      <Link
        href="/login"
        className="rounded-full border border-brand-200 px-5 py-3 text-center text-sm font-semibold text-brand-900"
      >
        Agent Log in
      </Link>
      <Link
        href="/join"
        className="rounded-full bg-brand-950 px-5 py-3 text-center text-sm font-semibold text-white"
      >
        Activate for $1
      </Link>
    </>
  );

  return <HeaderClient nav={NAV} authDesktop={authDesktop} authMobile={authMobile} />;
}
