import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { supabaseAdmin, supabaseEnabled } from "@/lib/integrations/supabase";

/**
 * Stockage des fichiers : Supabase Storage (buckets « private » et « public ») si configuré,
 * sinon le disque local (.data/uploads). Les clés sont de la forme « private/… » ou « public/… ».
 */

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv",
};

export function mimeFor(filename: string) {
  return MIME[filename.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
}

export class UploadError extends Error {}

/** Vérifie taille et extension, renvoie le contenu. */
export async function readUpload(file: File | null, allowed: string[]): Promise<{ data: Buffer; name: string } | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Fichier trop volumineux (20 Mo maximum).");
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowed.includes(ext)) throw new UploadError(`Format non accepté. Formats acceptés : ${allowed.join(", ")}.`);
  return { data: Buffer.from(await file.arrayBuffer()), name: file.name.replace(/[^\w.\- ()À-ÿ]/g, "_").slice(0, 120) };
}

function split(key: string) {
  const [bucket, ...rest] = key.split("/");
  if ((bucket !== "private" && bucket !== "public") || rest.some((p) => p === ".." || p === "")) {
    throw new Error(`Clé de stockage invalide : ${key}`);
  }
  return { bucket, objectPath: rest.join("/") };
}

export async function putFile(key: string, data: Buffer, filename: string): Promise<string> {
  const { bucket, objectPath } = split(key);
  if (supabaseEnabled()) {
    const { error } = await supabaseAdmin().storage.from(bucket).upload(objectPath, data, {
      contentType: mimeFor(filename),
      upsert: true,
    });
    if (error) throw new Error(`Envoi du fichier impossible : ${error.message}`);
    return key;
  }
  const target = path.join(LOCAL_ROOT, bucket, objectPath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
  return key;
}

export async function getFile(key: string): Promise<Buffer | null> {
  const { bucket, objectPath } = split(key);
  if (supabaseEnabled()) {
    const { data, error } = await supabaseAdmin().storage.from(bucket).download(objectPath);
    return error || !data ? null : Buffer.from(await data.arrayBuffer());
  }
  try {
    return await readFile(path.join(LOCAL_ROOT, bucket, objectPath));
  } catch {
    return null;
  }
}

export async function deleteFile(key: string | null | undefined) {
  if (!key) return;
  const { bucket, objectPath } = split(key);
  if (supabaseEnabled()) {
    await supabaseAdmin().storage.from(bucket).remove([objectPath]);
    return;
  }
  await rm(path.join(LOCAL_ROOT, bucket, objectPath), { force: true });
}

/** URL servie par l'application (contrôle d'accès dans /api/fichiers). */
export function fileUrl(key: string | null | undefined) {
  return key ? `/api/fichiers/${key}` : null;
}
