export type UploadKind = "student" | "media" | "mail" | "post" | "course";
export type UploadedFile = { key: string; url: string; name: string; mime: string };

/** Téléverse un fichier vers le serveur (contrôlé côté serveur : type, taille, droits). */
export async function uploadFile(file: File, kind: UploadKind): Promise<UploadedFile> {
  const body = new FormData();
  body.append("kind", kind);
  body.append("file", file);
  const response = await fetch("/api/upload", { method: "POST", body, credentials: "include" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Téléversement impossible.");
  return data as UploadedFile;
}

export const fileHref = (key: string) => `/api/files/${key}`;
