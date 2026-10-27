import Link from "next/link";
import { ASSIGNMENT_STATUS_LABELS, BOOKING_STATUS_LABELS } from "@/lib/domain";
import { initials } from "@/lib/format";

export function Status({ tone = "", children }: { tone?: "" | "ok" | "warn" | "info"; children: React.ReactNode }) {
  return <span className={`st ${tone}`}>{children}</span>;
}

export function BookingStatus({ status }: { status: string }) {
  const s = BOOKING_STATUS_LABELS[status] ?? { label: status, tone: "" as const };
  return <Status tone={s.tone}>{s.label}</Status>;
}

export function AssignmentStatus({ status }: { status: string }) {
  const s = ASSIGNMENT_STATUS_LABELS[status] ?? { label: status, tone: "" as const };
  return <Status tone={s.tone}>{s.label}</Status>;
}

export function Avatar({ first, last, color, size = 34, light = false }: { first: string; last: string; color: string; size?: number; light?: boolean }) {
  return (
    <span
      className="clay s avatar"
      aria-hidden="true"
      style={{ ["--c" as string]: color, width: size, height: size, fontSize: size < 40 ? 12 : size > 80 ? 30 : 18, color: light ? "#fff" : undefined }}
    >
      {initials(first, last)}
    </span>
  );
}

export function PageHead({ label, title, children, actions }: { label: string; title: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="head">
      <div>
        <span className="lab">{label}</span>
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {actions && <div className="inline">{actions}</div>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="muted small">{children}</p>;
}

export function Chip({ name, value, checked, children, type = "checkbox" }: { name: string; value: string; checked?: boolean; children: React.ReactNode; type?: "checkbox" | "radio" }) {
  return (
    <label className="clay s chip">
      <input type={type} name={name} value={value} defaultChecked={checked} />
      {children}
    </label>
  );
}

export function SegOption({ name, value, checked, children }: { name: string; value: string; checked?: boolean; children: React.ReactNode }) {
  return (
    <label>
      <input type="radio" name={name} value={value} defaultChecked={checked} />
      {children}
    </label>
  );
}

export function RCard({ name, value, checked, title, children }: { name: string; value: string; checked?: boolean; title: string; children?: React.ReactNode }) {
  return (
    <label className="clay rcard">
      <input type="radio" name={name} value={value} defaultChecked={checked} />
      <b>{title}</b>
      {children && <span>{children}</span>}
    </label>
  );
}

export function FileLink({ href, name, hint }: { href: string | null; name: string; hint?: string }) {
  if (!href) return null;
  return (
    <a className="clay s fchip" href={href} target="_blank" rel="noopener">
      <span>{name}</span>
      {hint && <span className="lang">{hint}</span>}
    </a>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="small" style={{ fontWeight: 700 }}>
      ← {children}
    </Link>
  );
}
