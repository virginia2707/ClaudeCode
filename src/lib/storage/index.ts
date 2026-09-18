import "server-only";
import { mkdir, readFile, stat, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Abstraction du stockage de fichiers. Le MVP écrit sur le disque local
 * (dossier ./uploads à la racine du projet, hors de /public) et sert les
 * fichiers via /api/files/[name]. Un provider S3/R2 pourra implémenter la
 * même interface sans toucher aux appelants.
 */
export interface StorageProvider {
  save(buffer: Buffer, ext: string): Promise<{ storedName: string; url: string }>;
  read(storedName: string): Promise<{ buffer: Buffer; size: number } | null>;
  remove(storedName: string): Promise<void>;
}

// Dossier statique (process.cwd()/uploads) : évite le traçage de tout le projet par Turbopack.
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const SAFE_NAME = /^[a-z0-9]{24,48}\.[a-z0-9]{1,8}$/;

class LocalStorageProvider implements StorageProvider {
  async save(buffer: Buffer, ext: string) {
    await mkdir(/*turbopackIgnore: true*/ UPLOAD_DIR, { recursive: true });
    const storedName = `${randomBytes(16).toString("hex")}.${ext}`;
    await writeFile(/*turbopackIgnore: true*/ path.join(UPLOAD_DIR, storedName), buffer);
    return { storedName, url: `/api/files/${storedName}` };
  }
  async read(storedName: string) {
    if (!SAFE_NAME.test(storedName)) return null;
    const full = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, storedName);
    try {
      const info = await stat(/*turbopackIgnore: true*/ full);
      if (!info.isFile()) return null;
      return { buffer: await readFile(/*turbopackIgnore: true*/ full), size: info.size };
    } catch {
      return null;
    }
  }
  async remove(storedName: string) {
    if (!SAFE_NAME.test(storedName)) return;
    try {
      await unlink(/*turbopackIgnore: true*/ path.join(UPLOAD_DIR, storedName));
    } catch {
      /* déjà supprimé */
    }
  }
}

export const storage: StorageProvider = new LocalStorageProvider();

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** Liste blanche des types acceptés → extension normalisée. */
export const ALLOWED_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "text/csv": "csv",
  "text/plain": "txt",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "audio/mpeg": "mp3",
  "video/mp4": "mp4",
};
