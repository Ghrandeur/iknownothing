import "dotenv/config";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/auth";

async function seed() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be configured");
  }
  if (password.length < 12) {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters long");
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    console.log("Admin already exists");
    process.exit(0);
  }

  const hash = await hashPassword(password);
  await db.insert(users).values({
    email,
    passwordHash: hash,
    role: "admin",
    emailVerified: true,
  });
  console.log("Admin created:", email);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
