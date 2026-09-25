import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ENV } from "./env";

const root = () => path.resolve(ENV.uploadDir);

function cleanKey(key: string) {
  return key
    .replace(/\\/g, "/")
    .split("/")
    .filter(part => part && part !== "." && part !== "..")
    .join("/");
}

/** Chemin absolu garanti à l'intérieur du dossier de stockage (anti « path traversal »). */
export function storagePath(key: string) {
  const full = path.resolve(root(), cleanKey(key));
  if (full !== root() && !full.startsWith(root() + path.sep)) throw new Error("Clé de stockage invalide.");
  return full;
}

export async function storagePut(relKey: string, data: Buffer | string) {
  const cleaned = cleanKey(relKey);
  const ext = path.extname(cleaned);
  const base = ext ? cleaned.slice(0, -ext.length) : cleaned;
  const key = `${base}_${randomUUID().slice(0, 8)}${ext}`;
  const full = storagePath(key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, data);
  return { key, url: `/api/files/${key}` };
}

export async function storageRead(key: string) {
  return fs.readFile(storagePath(key));
}

export async function storageExists(key: string) {
  try {
    await fs.access(storagePath(key));
    return true;
  } catch {
    return false;
  }
}

export const fileUrl = (key: string) => `/api/files/${key}`;
