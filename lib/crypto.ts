import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (s) return s;
  // secret connu de tous : seulement en développement, ou sur demande explicite (tests de bout en bout sur le build)
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEV_SECRET !== "1") {
    throw new Error("AUTH_SECRET manquant en production.");
  }
  return "standby-dev-secret-ne-pas-utiliser-en-production";
}

const b64url = (b: Buffer) => b.toString("base64url");

/** Usage d'un jeton : un jeton émis pour un usage n'est jamais accepté pour un autre (ex. lien d'e-mail → session). */
export type TokenPurpose = "session" | "verify" | "email-change" | "crm";

const mac = (purpose: TokenPurpose, body: string) => createHmac("sha256", secret()).update(`${purpose}.${body}`).digest();

/** Jeton signé (HMAC-SHA256, lié à son usage) contenant un objet JSON et une date d'expiration. */
export function signToken(purpose: TokenPurpose, payload: Record<string, unknown>, ttlSeconds: number): string {
  const body = b64url(Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds })));
  return `${body}.${b64url(mac(purpose, body))}`;
}

export function verifyToken<T extends Record<string, unknown>>(token: string | undefined | null, purpose: TokenPurpose): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = mac(purpose, body);
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & { exp: number };
    if (typeof data.exp !== "number" || data.exp < Date.now() / 1000) return null;
    return data;
  } catch {
    return null;
  }
}

export function randomToken(bytes = 32): string {
  return b64url(randomBytes(bytes));
}

/** Empreinte SHA-256 d'un jeton aléatoire, conservée en base à la place du jeton. */
export function hashToken(token: string): string {
  return b64url(createHash("sha256").update(token).digest());
}

function encryptionKey(): Buffer {
  const k = process.env.ENCRYPTION_KEY;
  if (k) {
    const key = Buffer.from(k, "base64");
    if (key.length !== 32) throw new Error("ENCRYPTION_KEY doit faire 32 octets encodés en base64.");
    return key;
  }
  return createHash("sha256").update(secret()).digest();
}

/** Chiffrement AES-256-GCM (jetons CRM). */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(b64url).join(".");
}

export function decrypt(enc: string): string {
  const [iv, tag, data] = enc.split(".").map((p) => Buffer.from(p, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
