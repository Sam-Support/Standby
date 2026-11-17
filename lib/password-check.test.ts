import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isPwnedPassword, pwnedCount } from "./password-check";

// Le contrôle ne parle qu'à un service simulé ici : aucun appel réseau réel.

const sha1 = (v: string) => createHash("sha1").update(v).digest("hex").toUpperCase();

/** Service simulé : renvoie les empreintes connues dont le préfixe correspond, plus une ligne de remplissage. */
function service(known: Record<string, number>, seen: string[] = []): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    const prefix = String(url).split("/range/")[1];
    seen.push(`${prefix}|${(init?.headers as Record<string, string>)["Add-Padding"]}`);
    const lines = ["00000000000000000000000000000000000:0"];
    for (const [pw, n] of Object.entries(known)) if (sha1(pw).startsWith(prefix)) lines.push(`${sha1(pw).slice(5)}:${n}`);
    return new Response(lines.join("\r\n"), { status: 200 });
  }) as typeof fetch;
}

// vitest.config.mts coupe le contrôle (PWNED_PASSWORDS_URL=off) : on le rallume, vers une adresse fictive
beforeEach(() => vi.stubEnv("PWNED_PASSWORDS_URL", "https://pwned.example.test"));
afterEach(() => vi.unstubAllEnvs());

describe("contrôle des mots de passe divulgués", () => {
  it("n'envoie que le préfixe de l'empreinte, jamais le mot de passe", async () => {
    const seen: string[] = [];
    await pwnedCount("password", service({}, seen));
    expect(sha1("password")).toBe("5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8"); // valeur publiée par Have I Been Pwned
    expect(seen).toEqual(["5BAA6|true"]);
  });

  it("reconnaît un mot de passe divulgué et ignore le remplissage", async () => {
    const fetcher = service({ password: 10_000_000, "motdepasse-ok-12345": 0 });
    expect(await pwnedCount("password", fetcher)).toBe(10_000_000);
    expect(await isPwnedPassword("password", fetcher)).toBe(true);
    expect(await pwnedCount("un-mot-de-passe-tres-improbable-7731", fetcher)).toBe(0);
    expect(await isPwnedPassword("un-mot-de-passe-tres-improbable-7731", fetcher)).toBe(false);
  });

  it("laisse passer quand le service ne répond pas, répond mal ou est désactivé", async () => {
    const down = (async () => {
      throw new Error("réseau coupé");
    }) as typeof fetch;
    const failing = (async () => new Response("erreur", { status: 503 })) as typeof fetch;
    expect(await pwnedCount("password", down)).toBeNull();
    expect(await isPwnedPassword("password", down)).toBe(false);
    expect(await isPwnedPassword("password", failing)).toBe(false);
    vi.stubEnv("PWNED_PASSWORDS_URL", "off");
    expect(await pwnedCount("password", service({ password: 5 }))).toBeNull();
  });

  it("interroge l'adresse configurée", async () => {
    vi.stubEnv("PWNED_PASSWORDS_URL", "https://pwned.example.test/");
    const urls: string[] = [];
    await pwnedCount("password", (async (url: string | URL | Request) => {
      urls.push(String(url));
      return new Response("", { status: 200 });
    }) as typeof fetch);
    expect(urls).toEqual(["https://pwned.example.test/range/5BAA6"]);
  });
});
