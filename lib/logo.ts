/**
 * Logos des salons : dimensions lues à l'envoi (sans dépendance), règle d'affichage, couleur du texte de repli.
 * Un logo trop petit, trop haut ou trop étiré s'affiche mal dans les cartes : on écrit alors le nom du salon
 * sur un fond de la couleur de l'événement.
 */

export const LOGO_RULES = {
  minWidth: 240, // px, logos matriciels (PNG, JPG, WebP)
  minHeight: 60,
  minRatio: 1, // largeur / hauteur : du carré…
  maxRatio: 5, // …au bandeau horizontal
};

export type LogoSize = { width: number; height: number; vector: boolean };

/** Dimensions d'une image PNG, JPEG, WebP ou SVG ; null si illisible. */
export function imageSize(data: Buffer, ext: string): LogoSize | null {
  const e = ext.toLowerCase();
  try {
    if (e === "png") {
      if (data.toString("ascii", 1, 4) !== "PNG") return null;
      return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), vector: false };
    }
    if (e === "jpg" || e === "jpeg") return jpegSize(data);
    if (e === "webp") return webpSize(data);
    if (e === "svg") return svgSize(data.toString("utf8", 0, Math.min(data.length, 4096)));
  } catch {
    return null;
  }
  return null;
}

function jpegSize(d: Buffer): LogoSize | null {
  if (d[0] !== 0xff || d[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < d.length) {
    if (d[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = d[i + 1];
    // SOF0 à SOF15, sauf DHT (C4), JPG (C8) et DAC (CC) : la taille de l'image est dans cet en-tête
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: d.readUInt16BE(i + 5), width: d.readUInt16BE(i + 7), vector: false };
    }
    i += 2 + d.readUInt16BE(i + 2);
  }
  return null;
}

function webpSize(d: Buffer): LogoSize | null {
  if (d.toString("ascii", 0, 4) !== "RIFF" || d.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = d.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { width: 1 + d.readUIntLE(24, 3), height: 1 + d.readUIntLE(27, 3), vector: false };
  if (chunk === "VP8L") {
    const b = d.readUInt32LE(21);
    return { width: 1 + (b & 0x3fff), height: 1 + ((b >> 14) & 0x3fff), vector: false };
  }
  if (chunk === "VP8 ") return { width: d.readUInt16LE(26) & 0x3fff, height: d.readUInt16LE(28) & 0x3fff, vector: false };
  return null;
}

function svgSize(head: string): LogoSize | null {
  const tag = head.match(/<svg\b[^>]*>/i)?.[0];
  if (!tag) return null;
  const attr = (n: string) => tag.match(new RegExp(`\\s${n}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
  const vb = attr("viewBox")?.trim().split(/[\s,]+/).map(Number);
  if (vb && vb.length === 4 && vb[2] > 0 && vb[3] > 0) return { width: vb[2], height: vb[3], vector: true };
  const w = parseFloat(attr("width") ?? "");
  const h = parseFloat(attr("height") ?? "");
  return w > 0 && h > 0 ? { width: w, height: h, vector: true } : null;
}

/** Le logo peut-il s'afficher tel quel ? (SVG : seule la proportion compte.) */
export function logoFits(size: { width: number | null; height: number | null; vector?: boolean } | null): boolean {
  if (!size?.width || !size.height) return false;
  const ratio = size.width / size.height;
  if (ratio < LOGO_RULES.minRatio || ratio > LOGO_RULES.maxRatio) return false;
  return Boolean(size.vector) || (size.width >= LOGO_RULES.minWidth && size.height >= LOGO_RULES.minHeight);
}

/** Motif de refus, pour l'administration. */
export function logoProblem(size: LogoSize | null): string | null {
  if (!size) return "image illisible";
  const ratio = size.width / size.height;
  if (ratio < LOGO_RULES.minRatio) return `trop haut (${size.width} × ${size.height}) : il faut un logo au moins aussi large que haut`;
  if (ratio > LOGO_RULES.maxRatio) return `trop étiré (${size.width} × ${size.height}) : 5 fois plus large que haut au maximum`;
  if (!size.vector && (size.width < LOGO_RULES.minWidth || size.height < LOGO_RULES.minHeight)) {
    return `trop petit (${size.width} × ${size.height}) : ${LOGO_RULES.minWidth} × ${LOGO_RULES.minHeight} px au minimum`;
  }
  return null;
}

/** Texte lisible (encre ou blanc) sur une couleur de fond « #RRGGBB ». */
export function textOn(hex: string): "#1B2150" | "#FFFFFF" {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return "#1B2150";
  const lin = (c: string) => {
    const v = parseInt(c, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * lin(m[1]) + 0.7152 * lin(m[2]) + 0.0722 * lin(m[3]);
  // contraste de l'encre (#1B2150, luminance ≈ 0,018) contre celui du blanc
  return (l + 0.05) / 0.068 >= 1.05 / (l + 0.05) ? "#1B2150" : "#FFFFFF";
}
