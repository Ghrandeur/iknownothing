import { db } from "@/db";
import { notifications } from "@/db/schema";

export async function createNotification({
  userId,
  type,
  title,
  message,
}: {
  userId: number;
  type: string;
  title: string;
  message: string;
}) {
  await db.insert(notifications).values({ userId, type, title, message });
}
