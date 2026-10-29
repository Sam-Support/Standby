import Link from "next/link";
import { and, count, eq, isNull } from "drizzle-orm";
import { getDb, schema as s } from "@/db";
import { logoutAction } from "@/app/connexion/actions";
import { getCurrentCompany, getCurrentUser } from "@/lib/auth/session";
import { NavTabs } from "./nav-tabs";

export async function SiteNav() {
  const user = await getCurrentUser();
  let label = "Créer un compte";
  let href = "/comptes";
  let unread = 0;
  if (user) {
    const db = await getDb();
    const [{ n }] = await db
      .select({ n: count() })
      .from(s.notifications)
      .where(and(eq(s.notifications.userId, user.id), isNull(s.notifications.readAt)));
    unread = n;
    if (user.role === "exposant") {
      const company = await getCurrentCompany();
      label = company?.name ?? "Mon entreprise";
      href = "/entreprise";
    } else if (user.role === "commercial") {
      label = `${user.firstName} ${user.lastName}`.trim();
      href = "/commercial";
    } else {
      label = "Administration";
      href = "/admin";
    }
  }
  return (
    <nav className="clay nav" aria-label="Navigation principale">
      <Link className="logo disp" href="/">
        <i className="clay s" aria-hidden="true"></i>standby
      </Link>
      <NavTabs admin={user?.role === "admin"} />
      <div className="navright">
        {user && (
          <Link className="clay s bell" href="/notifications" aria-label={`Notifications${unread ? `, ${unread} non lues` : ""}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            {unread > 0 && <b>{unread > 9 ? "9+" : unread}</b>}
          </Link>
        )}
        <Link className="clay s btn sm butter" href={href}>
          {label}
        </Link>
        {user && (
          <form action={logoutAction}>
            <button className="clay s bell" type="submit" aria-label="Se déconnecter" title="Se déconnecter">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="m16 17 5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </button>
          </form>
        )}
      </div>
    </nav>
  );
}
