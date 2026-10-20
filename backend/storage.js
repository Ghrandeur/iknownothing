const fs = require("node:fs/promises");
const path = require("node:path");

const useSupabaseStorage = Boolean(process.env.VERCEL);
const bucket = process.env.SUPABASE_STORAGE_BUCKET || "nlqi-applicant-documents";

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  return { url: url.replace(/\/+$/, ""), key };
}

function storagePath(userId, filename) {
  return `${userId}/${path.basename(filename)}`;
}

async function uploadFile(userId, file, uploadRoot) {
  const key = storagePath(userId, file.filename);
  if (useSupabaseStorage) {
    const { url, key: serviceKey } = getSupabaseConfig();
    const response = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        "Content-Type": file.mimetype,
        "x-upsert": "false",
      },
      body: file.buffer,
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Supabase Storage upload failed (${response.status}): ${detail.slice(0, 300)}`);
    }
    return key;
  }
  const destination = path.join(uploadRoot, String(userId), path.basename(file.filename));
  if (path.resolve(file.path) === path.resolve(destination)) return key;
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.rename(file.path, destination);
  return key;
}

async function readFile(userId, filename, uploadRoot) {
  const safeName = path.basename(filename);
  if (useSupabaseStorage) {
    const { url, key } = getSupabaseConfig();
    const response = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}/${storagePath(userId, safeName).split("/").map(encodeURIComponent).join("/")}`, {
      headers: { Authorization: `Bearer ${key}`, apikey: key },
    });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Supabase Storage download failed (${response.status}).`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
  try {
    return await fs.readFile(path.join(uploadRoot, String(userId), safeName));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function removeFile(userId, filename, uploadRoot) {
  const safeName = path.basename(filename);
  if (useSupabaseStorage) {
    const { url, key } = getSupabaseConfig();
    const response = await fetch(`${url}/storage/v1/object/${encodeURIComponent(bucket)}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefixes: [storagePath(userId, safeName)] }),
    });
    if (!response.ok) throw new Error(`Supabase Storage delete failed (${response.status}).`);
    return;
  }
  await fs.rm(path.join(uploadRoot, String(userId), safeName), { force: true });
}

module.exports = { useSupabaseStorage, uploadFile, readFile, removeFile };
