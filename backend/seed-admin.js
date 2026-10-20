require("dotenv").config();

const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const db = require("./database");

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "NLQI Administrator";
  if (!email || !/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(email)) {
    throw new Error("Set a valid ADMIN_EMAIL in .env before seeding an administrator.");
  }
  if (typeof password !== "string" || password.length < 16 || password.length > 128) {
    throw new Error("Set ADMIN_PASSWORD in .env to a unique password with at least 16 characters.");
  }
  const existing = await db.get("SELECT id, role FROM users WHERE email = ?", email);
  if (existing) {
    if (existing.role !== "admin") throw new Error("That email already belongs to a non-admin account; choose another ADMIN_EMAIL.");
    console.log(`Administrator ${email} already exists; no changes made.`);
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const now = Date.now();
  await db.run(`
    INSERT INTO users (email, name, password_hash, role, status, email_verified, created_at, updated_at)
    VALUES (?, ?, ?, 'admin', 'active', 1, ?, ?)
  `, email, name, passwordHash, now, now);
  console.log(`Administrator account created for ${email}. Sign in at /login.`);
}

main()
  .catch((error) => {
    console.error(`Unable to seed administrator: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.close());
