import type { ReactNode } from "react";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`container-app ${className}`}>{children}</div>;
}

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
}) {
  const styles: Record<string, string> = {
    primary: "bg-brand-950 text-white hover:bg-brand-800 shadow-lg shadow-brand-950/15",
    secondary: "bg-accent-500 text-brand-950 hover:bg-accent-400 shadow-lg shadow-accent-500/20",
    outline: "border border-brand-300 text-brand-900 hover:border-brand-500 hover:bg-brand-50",
    ghost: "text-brand-700 hover:bg-brand-50",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };
  return (
    <button
      {...props}
      className={`btn-sheen inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition-all duration-500 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-950/5 ${className}`}
    >
      {children}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-sm font-medium text-brand-900">{children}</label>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-sm text-brand-950 outline-none placeholder:text-brand-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 ${props.className ?? ""}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-sm text-brand-950 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 ${props.className ?? ""}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-brand-200 bg-white px-3 py-2.5 text-sm text-brand-950 outline-none placeholder:text-brand-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 ${props.className ?? ""}`}
    />
  );
}

export function Badge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${className}`}>
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Card className="flex items-start justify-between">
      <div>
        <p className="text-sm text-brand-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-brand-950">{value}</p>
        {sub ? <p className="mt-1 text-xs text-brand-400">{sub}</p> : null}
      </div>
      {icon ? <div className="rounded-xl bg-brand-50 p-2.5 text-brand-700">{icon}</div> : null}
    </Card>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{message}</p>;
}

export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>;
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  center = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
}) {
  return (
    <div className={`mb-12 max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow ? (
        <p
          className={`mb-4 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.24em] text-accent-600 ${
            center ? "justify-center" : ""
          }`}
        >
          <span className="h-px w-8 bg-accent-400" />
          {eyebrow}
          {center ? <span className="h-px w-8 bg-accent-400" /> : null}
        </p>
      ) : null}
      <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-brand-950 sm:text-[2.75rem]">
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-5 text-lg leading-relaxed text-brand-600">{subtitle}</p>
      ) : null}
    </div>
  );
}
