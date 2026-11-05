import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GET as getFichier } from "@/app/api/fichiers/[...key]/route";
import { safeNext } from "@/lib/action";
import { hashToken, signToken, verifyToken } from "@/lib/crypto";
import { localizePath } from "@/lib/i18n/config";
import { toCsv } from "@/lib/services/self-billing";

// Non-régression des corrections de la revue de sécurité du 30 octobre 2026

describe("redirection après connexion", () => {
  it("accepte les chemins internes", () => {
    expect(safeNext("/entreprise/reservations/abc?x=1", "/")).toBe("/entreprise/reservations/abc?x=1");
    expect(safeNext("/en/commercial", "/")).toBe("/en/commercial");
  });

  it("refuse tout ce qui mène hors du site", () => {
    for (const v of ["//evil.example", "/\\evil.example", "/\\/evil.example", "https://evil.example", "evil.example", "/a b", "/x\u0000", "", null, undefined]) {
      expect(safeNext(v, "/accueil")).toBe("/accueil");
    }
  });

  it("ne préfixe pas une adresse protocolaire relative", () => {
    expect(localizePath("/\\evil.example", "en")).toBe("/\\evil.example");
    expect(localizePath("//evil.example", "es")).toBe("//evil.example");
  });
});

describe("jetons signés liés à leur usage", () => {
  it("un lien d'e-mail ne vaut pas session, et inversement", () => {
    const verify = signToken("verify", { uid: "u1", email: "a@b.fr" }, 3600);
    expect(verifyToken(verify, "verify")).toMatchObject({ uid: "u1" });
    expect(verifyToken(verify, "session")).toBeNull();
    const change = signToken("email-change", { uid: "u1", from: "a@b.fr", to: "c@d.fr" }, 3600);
    expect(verifyToken(change, "session")).toBeNull();
    const session = signToken("session", { uid: "u1", role: "admin", v: 0 }, 3600);
    expect(verifyToken(session, "verify")).toBeNull();
    expect(verifyToken(session, "session")).toMatchObject({ role: "admin" });
  });

  it("refuse un jeton modifié ou expiré", () => {
    const t = signToken("session", { uid: "u1", role: "exposant" }, 3600);
    const [body, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "u1", role: "admin", exp: 9_999_999_999 })).toString("base64url");
    expect(verifyToken(`${forged}.${sig}`, "session")).toBeNull();
    expect(verifyToken(`${body}.`, "session")).toBeNull();
    expect(verifyToken(signToken("session", { uid: "u1" }, -1), "session")).toBeNull();
  });

  it("l'empreinte d'un jeton de réinitialisation est stable et ne le révèle pas", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).not.toContain("abc");
  });
});

describe("exports CSV", () => {
  it("neutralise les formules saisies par un utilisateur, garde les montants négatifs", () => {
    const csv = toCsv([["=HYPERLINK(\"http://x\")", "+33 6", "@SUM(A1)", "-cmd", "-12,50", 3]]);
    expect(csv).toBe('﻿"\'=HYPERLINK(""http://x"")";\'+33 6;\'@SUM(A1);\'-cmd;-12,50;3\r\n');
  });
});

describe("fichiers", () => {
  const call = (...key: string[]) => getFichier(new Request("http://localhost/api/fichiers/x"), { params: Promise.resolve({ key }) });

  it("refuse les segments dangereux sans erreur serveur", async () => {
    for (const key of [["public", ".."], ["public", "..", "private", "x.pdf"], ["public", "a\\..\\..\\private"], ["public", "a/b"], ["public", "."], ["public"], ["public", "x\u0001"]]) {
      expect((await call(...key)).status).toBe(404);
    }
  });

  it("ne décode pas deux fois", async () => {
    // « %2e%2e » arrive tel quel (déjà décodé une fois par Next) : c'est un nom de fichier, pas « .. »
    expect((await call("public", "%2e%2e", "private", "x.pdf")).status).toBe(404);
  });
});

describe("pages d'administration", () => {
  // une navigation côté client ne réexécute pas le layout : chaque page vérifie elle-même le rôle
  it("chaque page admin appelle requireAdmin()", () => {
    const pages: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir)) {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) walk(p);
        else if (f === "page.tsx") pages.push(p);
      }
    };
    walk(join(import.meta.dirname, "../app/admin"));
    expect(pages.length).toBeGreaterThan(10);
    expect(pages.filter((p) => !readFileSync(p, "utf8").includes("await requireAdmin()"))).toEqual([]);
  });
});
