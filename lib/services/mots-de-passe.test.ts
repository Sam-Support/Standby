import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createPgliteDb, type Db } from "@/db";
import * as s from "@/db/schema";
import { translateFeedback } from "@/lib/i18n/messages/feedback";
import { changePassword, login, registerAccount, requestPasswordReset, resetPassword } from "./accounts";

// Les mots de passe connus des fuites sont refusés à l'inscription, au changement et à la réinitialisation.
// Le service est simulé (aucun appel réseau) ; les autres tests le désactivent (vitest.config.mts).

const LEAKED = "motdepasse-divulgue";
const FINE = "un-mot-de-passe-sain-9137";
const REFUSED = "Ce mot de passe figure dans des fuites de données connues. Choisissez-en un autre.";
const sha1 = (v: string) => createHash("sha1").update(v).digest("hex").toUpperCase();

let db: Db;
let calls: string[];

beforeAll(async () => {
  db = await createPgliteDb(null, true);
}, 60_000);

/** Active le contrôle avec un faux service qui ne connaît que LEAKED. */
function serviceOn(down = false) {
  calls = [];
  vi.stubEnv("PWNED_PASSWORDS_URL", "https://pwned.test");
  vi.stubGlobal("fetch", async (url: string) => {
    calls.push(String(url));
    if (down) throw new Error("service injoignable");
    const prefix = String(url).split("/range/")[1];
    return new Response(prefix === sha1(LEAKED).slice(0, 5) ? `${sha1(LEAKED).slice(5)}:4242` : "", { status: 200 });
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const profile = async (email: string) => (await db.select().from(s.profiles).where(eq(s.profiles.email, email)))[0];
const resetToken = async (email: string) => {
  await requestPasswordReset(db, email);
  const [mail] = await db.select().from(s.emailOutbox).where(eq(s.emailOutbox.to, email)).orderBy(desc(s.emailOutbox.createdAt)).limit(1);
  return mail.link!.split("/reinitialiser/")[1];
};

describe("mots de passe divulgués", () => {
  it("refuse l'inscription sans créer de compte, accepte un mot de passe sain", async () => {
    serviceOn();
    await expect(registerAccount(db, { email: "fuite@mdp.test", password: LEAKED, role: "commercial", firstName: "Lucas", lastName: "Moreau" })).rejects.toThrow(REFUSED);
    expect(await profile("fuite@mdp.test")).toBeUndefined();
    expect(calls).toHaveLength(1);

    await registerAccount(db, { email: "fuite@mdp.test", password: FINE, role: "commercial", firstName: "Lucas", lastName: "Moreau" });
    expect(await profile("fuite@mdp.test")).toMatchObject({ role: "commercial" });
  });

  it("n'appelle pas le service quand la saisie est déjà refusée pour une autre raison", async () => {
    serviceOn();
    await expect(registerAccount(db, { email: "court@mdp.test", password: "court", role: "commercial", firstName: "A", lastName: "B" })).rejects.toThrow(/10 caractères/);
    expect(calls).toHaveLength(0);
  });

  it("refuse le changement de mot de passe, garde l'ancien", async () => {
    await registerAccount(db, { email: "change@mdp.test", password: FINE, role: "exposant", firstName: "Inès", lastName: "Test" });
    const user = (await profile("change@mdp.test"))!;
    serviceOn();
    await expect(changePassword(db, user, FINE, LEAKED)).rejects.toThrow(REFUSED);
    expect(await login(db, "change@mdp.test", FINE)).not.toBeNull();
    // mauvais mot de passe actuel : pas d'appel au service
    calls.length = 0;
    await expect(changePassword(db, user, "pas-le-bon-mot-de-passe", LEAKED)).rejects.toThrow(/actuel incorrect/);
    expect(calls).toHaveLength(0);
  });

  it("refuse à la réinitialisation sans consommer le lien : le même lien sert ensuite", async () => {
    await registerAccount(db, { email: "reset@mdp.test", password: FINE, role: "exposant", firstName: "Inès", lastName: "Test" });
    const token = await resetToken("reset@mdp.test");
    serviceOn();
    await expect(resetPassword(db, token, LEAKED)).rejects.toThrow(REFUSED);
    await resetPassword(db, token, "nouveau-mot-de-passe-sain-5521");
    expect(await login(db, "reset@mdp.test", "nouveau-mot-de-passe-sain-5521")).not.toBeNull();
    await expect(resetPassword(db, token, "encore-un-autre-mot-de-passe-77")).rejects.toThrow(/expiré ou déjà utilisé/);
  });

  it("laisse passer quand le service est injoignable", async () => {
    serviceOn(true);
    await registerAccount(db, { email: "panne@mdp.test", password: LEAKED, role: "commercial", firstName: "Lucas", lastName: "Moreau" });
    expect(await profile("panne@mdp.test")).toBeDefined();
    expect(calls).toHaveLength(1);
  });

  it("le message est traduit", () => {
    expect(translateFeedback(REFUSED, "en")).toBe("This password appears in known data breaches. Please choose another one.");
    expect(translateFeedback(REFUSED, "es")).toBe("Esta contraseña aparece en filtraciones de datos conocidas. Elija otra.");
    expect(translateFeedback(REFUSED, "fr")).toBe(REFUSED);
  });
});
