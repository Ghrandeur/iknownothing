import { db } from "@/db";
import { applications } from "@/db/schema";
import { eq } from "drizzle-orm";

export function generateApplicationNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `NLQI-${year}-${rand}`;
}

export async function generateUniqueApplicationNumber(): Promise<string> {
  let number = generateApplicationNumber();
  while (true) {
    const existing = await db
      .select({ id: applications.id })
      .from(applications)
      .where(eq(applications.applicationNumber, number))
      .limit(1);
    if (existing.length === 0) return number;
    number = generateApplicationNumber();
  }
}
