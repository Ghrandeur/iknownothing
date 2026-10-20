import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function saveFile(file: File, folder: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = path.extname(file.name) || ".bin";
  const base = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const dir = path.join(UPLOAD_DIR, folder);
  await mkdir(dir, { recursive: true });

  const fullPath = path.join(dir, base);
  await writeFile(fullPath, buffer);
  return path.join(folder, base).replace(/\\/g, "/");
}

export function getUploadPath(relativePath: string) {
  return path.join(UPLOAD_DIR, relativePath);
}
