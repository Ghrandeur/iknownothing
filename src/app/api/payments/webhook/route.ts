import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, applications } from "@/db/schema";
import { createNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  const body = await request.json();
  const event = body.event;
  const data = body.data;

  if (event === "charge.success" && data?.reference) {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.reference, data.reference))
      .limit(1);

    if (payment && payment.status !== "paid") {
      await db
        .update(payments)
        .set({ status: "paid", channel: data.channel, paidAt: new Date(data.paid_at), metadata: data })
        .where(eq(payments.id, payment.id));

      await db
        .update(applications)
        .set({ paymentStatus: "paid", amountPaid: payment.amount, paymentReference: data.reference })
        .where(eq(applications.id, payment.applicationId));

      await createNotification({
        userId: payment.userId,
        type: "payment",
        title: "Payment confirmed",
        message: `Your payment ${data.reference} has been confirmed.`,
      });
    }
  }

  return NextResponse.json({ received: true });
}
