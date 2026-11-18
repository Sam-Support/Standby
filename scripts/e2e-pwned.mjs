// Faux service « Pwned Passwords » pour les tests de bout en bout : un seul mot de passe y est « divulgué ».
// Même format de réponse que le vrai : GET /range/<5 premiers caractères du SHA-1> → lignes « SUFFIXE:NOMBRE ».
import { createHash } from "node:crypto";
import { createServer } from "node:http";

const PORT = Number(process.env.PWNED_E2E_PORT ?? 3199);
const LEAKED = "motdepasse-divulgue";
const sha1 = createHash("sha1").update(LEAKED).digest("hex").toUpperCase();

createServer((req, res) => {
  const prefix = (req.url ?? "").match(/^\/range\/([0-9A-Fa-f]{5})$/)?.[1]?.toUpperCase();
  if (!prefix) {
    res.writeHead(404).end();
    return;
  }
  // une ligne de remplissage (nombre 0) dans chaque réponse, comme avec « Add-Padding »
  const lines = ["0000000000000000000000000000000000A:0"];
  if (prefix === sha1.slice(0, 5)) lines.push(`${sha1.slice(5)}:4242`);
  res.writeHead(200, { "content-type": "text/plain" }).end(lines.join("\r\n"));
}).listen(PORT, "127.0.0.1", () => console.info(`[e2e] faux Pwned Passwords sur ${PORT}`));
