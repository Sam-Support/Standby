import Link from "@/components/link";
import { getCurrentUser } from "@/lib/auth/session";
import { account } from "@/lib/i18n/messages/account";
import { getMessages } from "@/lib/i18n/server";
import { logoutAction } from "../connexion/actions";

export async function generateMetadata() {
  return { title: (await getMessages(account)).hub.title };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  const user = await getCurrentUser();
  const t = (await getMessages(account)).hub;
  return (
    <>
      <div className="head">
        <div>
          <span className="lab">{t.title}</span>
          <h1>{t.h1}</h1>
          <p>{t.lead}</p>
        </div>
      </div>
      {erreur === "role" && <p className="note">{t.wrongRole}</p>}
      {user && (
        <div className="clay brow" style={{ background: undefined }}>
          <span>
            {t.signedInAs} <b>{user.email}</b>
          </span>
          <form action={logoutAction}>
            <button className="clay s btn sm ghost">{t.logout}</button>
          </form>
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 22 }}>
        <article className="clay hub">
          <span className="clay" aria-hidden="true" style={{ ["--c" as string]: "#4D58EE", position: "absolute", right: -26, top: -26, width: 110, height: 110, borderRadius: "50%" }}></span>
          <span className="lab">{t.company.label}</span>
          <h2>{t.company.title}</h2>
          <ul>
            {t.company.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
          <div className="inline">
            <Link className="clay btn" href="/inscription/entreprise">
              {t.company.cta}
            </Link>
            <Link className="clay s btn sm ghost" href="/connexion?next=/entreprise">
              {t.login}
            </Link>
          </div>
        </article>
        <article className="clay hub" style={{ ["--c" as string]: "#F3EBD4" }}>
          <span className="clay" aria-hidden="true" style={{ ["--c" as string]: "#68D1A4", position: "absolute", right: -30, top: -30, width: 120, height: 120, borderRadius: "50%" }}></span>
          <span className="lab">{t.freelancer.label}</span>
          <h2>{t.freelancer.title}</h2>
          <ul>
            {t.freelancer.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
          <div className="inline">
            <Link className="clay btn butter" href="/inscription/commercial">
              {t.freelancer.cta}
            </Link>
            <Link className="clay s btn sm ghost" href="/connexion?next=/commercial">
              {t.login}
            </Link>
          </div>
        </article>
      </div>
    </>
  );
}
