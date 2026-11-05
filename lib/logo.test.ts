import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createPgliteDb } from "@/db";
import * as s from "@/db/schema";
import { saveEvent } from "@/lib/services/admin";
import { imageSize, logoFits, logoProblem, textOn } from "./logo";
import { upcomingEvents } from "./queries";

// Logos des salons : dimensions lues à l'envoi, règle d'affichage, texte du repli

const png = (w: number, h: number) => {
  const b = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write("IHDR", 12, "ascii");
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b;
};

const jpeg = (w: number, h: number) => {
  const app0 = [0xff, 0xe0, 0x00, 0x10, ...new Array(14).fill(0)];
  const sof = [0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 0xff, w >> 8, w & 0xff, 0x03, ...new Array(9).fill(0)];
  return Buffer.from([0xff, 0xd8, ...app0, ...sof]);
};

const webp = (w: number, h: number) => {
  const b = Buffer.alloc(30);
  b.write("RIFF", 0, "ascii");
  b.writeUInt32LE(22, 4);
  b.write("WEBPVP8X", 8, "ascii");
  b.writeUInt32LE(10, 16);
  b.writeUIntLE(w - 1, 24, 3);
  b.writeUIntLE(h - 1, 27, 3);
  return b;
};

describe("dimensions des images", () => {
  it("lit PNG, JPEG, WebP et SVG", () => {
    expect(imageSize(png(640, 160), "png")).toEqual({ width: 640, height: 160, vector: false });
    expect(imageSize(jpeg(800, 200), "jpg")).toEqual({ width: 800, height: 200, vector: false });
    expect(imageSize(webp(500, 250), "webp")).toEqual({ width: 500, height: 250, vector: false });
    expect(imageSize(Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100"></svg>'), "svg")).toEqual({
      width: 400,
      height: 100,
      vector: true,
    });
    expect(imageSize(Buffer.from('<svg width="120" height="40"></svg>'), "svg")).toEqual({ width: 120, height: 40, vector: true });
  });

  it("renvoie null pour un fichier illisible", () => {
    expect(imageSize(Buffer.from("pas une image"), "png")).toBeNull();
    expect(imageSize(Buffer.from("<html></html>"), "svg")).toBeNull();
    expect(imageSize(Buffer.alloc(4), "jpg")).toBeNull();
  });
});

describe("règle d'affichage", () => {
  it("accepte du carré au bandeau, à partir de 240 × 60 px", () => {
    expect(logoFits({ width: 600, height: 150 })).toBe(true);
    expect(logoFits({ width: 300, height: 300 })).toBe(true);
    expect(logoFits({ width: 50, height: 20, vector: true })).toBe(true); // SVG : seule la proportion compte
  });

  it("refuse trop petit, trop haut, trop étiré ou inconnu", () => {
    expect(logoFits({ width: 200, height: 200 })).toBe(false);
    expect(logoFits({ width: 300, height: 600 })).toBe(false);
    expect(logoFits({ width: 1200, height: 150 })).toBe(false);
    expect(logoFits({ width: null, height: null })).toBe(false);
    expect(logoFits(null)).toBe(false);
  });

  it("explique le refus à l'administration", () => {
    expect(logoProblem({ width: 300, height: 600, vector: false })).toMatch(/trop haut/);
    expect(logoProblem({ width: 1200, height: 150, vector: false })).toMatch(/trop étiré/);
    expect(logoProblem({ width: 200, height: 50, vector: false })).toMatch(/trop petit/);
    expect(logoProblem({ width: 600, height: 150, vector: false })).toBeNull();
  });
});

describe("logos des salons enregistrés", () => {
  it("n'affiche que les logos autorisés et aux bonnes dimensions", async () => {
    const db = await createPgliteDb(null, true);
    const [admin] = await db.select().from(s.profiles).where(eq(s.profiles.role, "admin"));
    const base = { kind: "salon" as const, city: "Lyon", startsOn: "2099-03-02", endsOn: "2099-03-04", sector: "Industrie", published: true, verified: false };
    const ok = await saveEvent(db, admin.id, null, { ...base, name: "Salon Logo OK", logoAuthorized: true, siteUrl: "salon.example" }, { data: png(640, 160), name: "logo.png" });
    const small = await saveEvent(db, admin.id, null, { ...base, name: "Salon Petit Logo", logoAuthorized: true }, { data: png(120, 120), name: "logo.png" });
    const refused = await saveEvent(db, admin.id, null, { ...base, name: "Salon Sans Accord", logoAuthorized: false }, { data: png(640, 160), name: "logo.png" });
    const events = await upcomingEvents(db, { from: "2099-01-01" });
    const logo = (id: string) => events.find((e) => e.id === id)?.logoUrl;
    expect(logo(ok)).toMatch(/^\/api\/fichiers\/public\/events\//);
    expect(logo(small)).toBeNull();
    expect(logo(refused)).toBeNull();
    const [row] = await db.select().from(s.events).where(eq(s.events.id, small));
    expect([row.logoWidth, row.logoHeight]).toEqual([120, 120]);
    expect(events.find((e) => e.id === ok)?.siteUrl).toBe("https://salon.example/");
    await expect(saveEvent(db, admin.id, null, { ...base, name: "Salon Lien Piégé", logoAuthorized: false, siteUrl: "javascript:alert(1)" })).rejects.toThrow(/Adresse web invalide/);
    await expect(saveEvent(db, admin.id, null, { ...base, name: "Salon Fichier Faux", logoAuthorized: true }, { data: Buffer.from("faux"), name: "logo.png" })).rejects.toThrow(/illisible/);
  });
});

describe("texte du repli", () => {
  it("encre sur les couleurs claires, blanc sur les foncées", () => {
    expect(textOn("#FFCD4A")).toBe("#1B2150");
    expect(textOn("#82C9FF")).toBe("#1B2150");
    expect(textOn("#4D58EE")).toBe("#FFFFFF");
    expect(textOn("#1B2150")).toBe("#FFFFFF");
    expect(textOn("pas une couleur")).toBe("#1B2150");
  });
});
