"use server";

import { revalidatePath } from "next/cache";
import { eq, ilike, and, or, count } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  applications,
  payments,
  notifications,
  auditLogs,
} from "@/db/schema";
import {
  hashPassword,
  comparePassword,
  signToken,
  setSessionCookie,
  deleteSessionCookie,
  requireAuth,
  requireAdmin,
  requireApplicant,
  getCurrentUser,
  generateEmailToken,
} from "@/lib/auth";
import {
  sendEmail,
  registrationTemplate,
  applicationSubmittedTemplate,
  paymentConfirmedTemplate,
  statusUpdateTemplate,
  resetPasswordTemplate,
} from "@/lib/email";
import {
  initializePaystackPayment,
  verifyPaystackTransaction,
} from "@/lib/paystack";
import { saveFile } from "@/lib/upload";
import { generateUniqueApplicationNumber } from "@/lib/application-number";
import { applicationsToCsv } from "@/lib/csv";
import { createNotification } from "@/lib/notifications";
import { logAction } from "@/lib/audit";

const PUBLIC_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const APPLICATION_FEE = Number(process.env.APPLICATION_FEE || 5000);

export type ActionResult<T = unknown> =
  | { success: true; data?: T; message?: string }
  | { success: false; error: string };

function getFormString(formData: FormData, key: string) {
  return (formData.get(key) as string | null)?.trim() || null;
}

function getFormNumber(formData: FormData, key: string) {
  const val = formData.get(key);
  if (!val) return null;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

function getFormBoolean(formData: FormData, key: string) {
  return formData.get(key) === "true" || formData.get(key) === "on";
}

// AUTH ACTIONS

export async function registerAction(formData: FormData): Promise<ActionResult> {
  try {
    const email = getFormString(formData, "email") || "";
    const password = formData.get("password") as string;
    const firstName = getFormString(formData, "firstName") || "";
    const lastName = getFormString(formData, "lastName") || "";
    const phone = getFormString(formData, "phone") || "";

    if (!email || !password || !firstName || !lastName) {
      return { success: false, error: "Please fill all required fields" };
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    if (existing.length > 0) {
      return { success: false, error: "An account with this email already exists" };
    }

    const hash = await hashPassword(password);
    const emailToken = generateEmailToken();

    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash: hash,
        role: "applicant",
        emailToken,
      })
      .returning();

    const appNumber = await generateUniqueApplicationNumber();
    await db.insert(applications).values({
      userId: user.id,
      applicationNumber: appNumber,
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      status: "draft",
    });

    const verifyLink = `${PUBLIC_URL}/verify-email?token=${emailToken}`;
    await sendEmail({
      to: user.email,
      subject: "Welcome to Nigeria Legacy Queen International",
      html: registrationTemplate(`${firstName} ${lastName}`, verifyLink),
    });

    await logAction({
      userId: user.id,
      action: "USER_REGISTERED",
      entity: "users",
      entityId: user.id,
    });

    return { success: true, message: "Account created. Please verify your email." };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Registration failed. Please try again." };
  }
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  try {
    const email = getFormString(formData, "email") || "";
    const password = formData.get("password") as string;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user || !(await comparePassword(password, user.passwordHash))) {
      return { success: false, error: "Invalid email or password" };
    }

    if (user.status !== "active") {
      return { success: false, error: "Account is suspended" };
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    await setSessionCookie(token);

    await logAction({
      userId: user.id,
      action: "USER_LOGIN",
      entity: "users",
      entityId: user.id,
    });

    return {
      success: true,
      data: { role: user.role, emailVerified: user.emailVerified },
    };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Login failed" };
  }
}

export async function logoutAction(): Promise<ActionResult> {
  await deleteSessionCookie();
  return { success: true };
}

export async function getMeAction(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };
  return {
    success: true,
    data: {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    },
  };
}

export async function forgotPasswordAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const email = getFormString(formData, "email") || "";
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) return { success: true, message: "If the email exists, a reset link has been sent." };

    const resetToken = generateEmailToken();
    await db
      .update(users)
      .set({
        resetToken,
        resetExpires: new Date(Date.now() + 1000 * 60 * 60 * 2),
      })
      .where(eq(users.id, user.id));

    const link = `${PUBLIC_URL}/reset-password?token=${resetToken}`;
    await sendEmail({
      to: user.email,
      subject: "Reset your NLQI password",
      html: resetPasswordTemplate(user.email, link),
    });

    return { success: true, message: "If the email exists, a reset link has been sent." };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to send reset link" };
  }
}

export async function resetPasswordAction(
  formData: FormData
): Promise<ActionResult> {
  try {
    const token = getFormString(formData, "token") || "";
    const password = formData.get("password") as string;
    if (!token || !password) return { success: false, error: "Invalid request" };

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.resetToken, token))
      .limit(1);
    if (!user || !user.resetExpires || new Date(user.resetExpires) < new Date()) {
      return { success: false, error: "Reset link is invalid or expired" };
    }

    const hash = await hashPassword(password);
    await db
      .update(users)
      .set({ passwordHash: hash, resetToken: null, resetExpires: null })
      .where(eq(users.id, user.id));

    return { success: true, message: "Password reset successful. Please log in." };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Password reset failed" };
  }
}

export async function verifyEmailAction(token: string): Promise<ActionResult> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.emailToken, token))
      .limit(1);
    if (!user) return { success: false, error: "Invalid verification link" };

    await db
      .update(users)
      .set({ emailVerified: true, emailToken: null })
      .where(eq(users.id, user.id));

    return { success: true, message: "Email verified successfully" };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Verification failed" };
  }
}

// APPLICATION ACTIONS

export async function getMyApplicationAction(): Promise<ActionResult> {
  const user = await requireApplicant();
  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.userId, user.id))
    .limit(1);
  if (!application) return { success: false, error: "Application not found" };
  return { success: true, data: application };
}

export async function saveApplicationStepAction(
  step: number,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireApplicant();

  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.userId, user.id))
    .limit(1);
  if (!application) return { success: false, error: "Application not found" };

  const values: Partial<typeof applications.$inferInsert> = {};

  if (step === 1) {
    values.title = getFormString(formData, "title");
    values.firstName = getFormString(formData, "firstName");
    values.lastName = getFormString(formData, "lastName");
    values.otherNames = getFormString(formData, "otherNames");
    values.email = getFormString(formData, "email");
    values.phone = getFormString(formData, "phone");
    values.dateOfBirth = getFormString(formData, "dateOfBirth");
    values.age = getFormNumber(formData, "age");
    values.stateOfOrigin = getFormString(formData, "stateOfOrigin");
    values.lga = getFormString(formData, "lga");
    values.nationality = getFormString(formData, "nationality");
    values.occupation = getFormString(formData, "occupation");
    values.city = getFormString(formData, "city");
  } else if (step === 2) {
    values.educationLevel = getFormString(formData, "educationLevel");
    values.institution = getFormString(formData, "institution");
    values.courseOfStudy = getFormString(formData, "courseOfStudy");
    values.graduationYear = getFormString(formData, "graduationYear");
    values.height = getFormString(formData, "height");
    values.bust = getFormString(formData, "bust");
    values.waist = getFormString(formData, "waist");
    values.hips = getFormString(formData, "hips");
    values.dressSize = getFormString(formData, "dressSize");
    values.hairColor = getFormString(formData, "hairColor");
    values.eyeColor = getFormString(formData, "eyeColor");
    values.talents = getFormString(formData, "talents");
    values.hobbies = getFormString(formData, "hobbies");
    values.languages = getFormString(formData, "languages");
  } else if (step === 3) {
    values.platformSource = getFormString(formData, "platformSource");
    values.whyParticipate = getFormString(formData, "whyParticipate");
    values.advocacyInterest = getFormString(formData, "advocacyInterest");
    values.communityProject = getFormString(formData, "communityProject");
    values.leadershipExperience = getFormString(formData, "leadershipExperience");
    values.socialImpact = getFormString(formData, "socialImpact");
    values.careerGoals = getFormString(formData, "careerGoals");
  } else if (step === 4) {
    values.emergencyName = getFormString(formData, "emergencyName");
    values.emergencyPhone = getFormString(formData, "emergencyPhone");
    values.emergencyRelationship = getFormString(formData, "emergencyRelationship");

    const idDoc = formData.get("idDocument") as File | null;
    const headshot = formData.get("headshot") as File | null;
    const fullBody = formData.get("fullBody") as File | null;

    if (idDoc && idDoc.size > 0) values.idDocumentPath = await saveFile(idDoc, "documents");
    if (headshot && headshot.size > 0) values.headshotPath = await saveFile(headshot, "photos");
    if (fullBody && fullBody.size > 0) values.fullBodyPath = await saveFile(fullBody, "photos");
  } else if (step === 5) {
    values.termsAgreed = getFormBoolean(formData, "termsAgreed");
    values.consentSigned = getFormBoolean(formData, "consentSigned");
  }

  values.currentStep = Math.max(step, application.currentStep || 1);

  await db.update(applications).set(values).where(eq(applications.id, application.id));

  revalidatePath("/apply");
  return { success: true, message: "Progress saved" };
}

export async function submitApplicationAction(): Promise<ActionResult> {
  const user = await requireApplicant();
  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.userId, user.id))
    .limit(1);
  if (!application) return { success: false, error: "Application not found" };
  if (!application.termsAgreed || !application.consentSigned) {
    return { success: false, error: "Please agree to the terms and consent" };
  }

  await db
    .update(applications)
    .set({ status: "pending" })
    .where(eq(applications.id, application.id));

  await sendEmail({
    to: application.email || user.email,
    subject: "NLQI Application Submitted",
    html: applicationSubmittedTemplate(
      `${application.firstName} ${application.lastName}`,
      application.applicationNumber
    ),
  });

  await createNotification({
    userId: user.id,
    type: "application",
    title: "Application submitted",
    message: `Your application ${application.applicationNumber} has been submitted.`,
  });

  await logAction({
    userId: user.id,
    action: "APPLICATION_SUBMITTED",
    entity: "applications",
    entityId: application.id,
  });

  revalidatePath("/apply");
  return { success: true, message: "Application submitted" };
}

export async function initializeApplicationPaymentAction(): Promise<ActionResult> {
  const user = await requireApplicant();
  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.userId, user.id))
    .limit(1);
  if (!application) return { success: false, error: "Application not found" };
  if (application.paymentStatus === "paid") {
    return { success: false, error: "Payment already confirmed" };
  }

  const reference = `NLQI-PAY-${application.id}-${Date.now()}`;
  await db.insert(payments).values({
    applicationId: application.id,
    userId: user.id,
    reference,
    amount: APPLICATION_FEE,
    status: "unpaid",
  });

  const init = await initializePaystackPayment({
    email: application.email || user.email,
    amount: APPLICATION_FEE,
    reference,
    callbackUrl: `${PUBLIC_URL}/apply`,
  });

  if (!init.status) {
    return { success: false, error: init.message || "Payment initialization failed" };
  }

  return { success: true, data: { authorizationUrl: init.data.authorization_url, reference } };
}

export async function verifyApplicationPaymentAction(reference: string): Promise<ActionResult> {
  const user = await requireAuth();
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.reference, reference))
    .limit(1);
  if (!payment) return { success: false, error: "Payment not found" };

  if (payment.status === "paid") {
    return { success: true, message: "Payment already confirmed" };
  }

  const verify = await verifyPaystackTransaction(reference);
  if (!verify.status || verify.data.status !== "success") {
    return { success: false, error: "Payment verification failed" };
  }

  await db
    .update(payments)
    .set({
      status: "paid",
      channel: verify.data.channel,
      paidAt: new Date(),
      metadata: verify.data,
    })
    .where(eq(payments.id, payment.id));

  await db
    .update(applications)
    .set({ paymentStatus: "paid", amountPaid: payment.amount, paymentReference: reference })
    .where(eq(applications.id, payment.applicationId));

  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, payment.applicationId))
    .limit(1);

  if (application) {
    await sendEmail({
      to: application.email || user.email,
      subject: "NLQI Payment Confirmed",
      html: paymentConfirmedTemplate(
        `${application.firstName} ${application.lastName}`,
        application.applicationNumber
      ),
    });
    await createNotification({
      userId: payment.userId,
      type: "payment",
      title: "Payment confirmed",
      message: `Payment for ${application.applicationNumber} has been confirmed.`,
    });
  }

  revalidatePath("/apply");
  return { success: true, message: "Payment confirmed" };
}

// ADMIN ACTIONS

export async function getApplicationStatsAction(): Promise<ActionResult> {
  await requireAdmin();
  const [totalRes, pendingRes, approvedRes, paidRes, shortlistedRes, rejectedRes] =
    await Promise.all([
      db.select({ count: count() }).from(applications),
      db.select({ count: count() }).from(applications).where(eq(applications.status, "pending")),
      db.select({ count: count() }).from(applications).where(eq(applications.status, "approved")),
      db
        .select({ count: count() })
        .from(applications)
        .where(eq(applications.paymentStatus, "paid")),
      db
        .select({ count: count() })
        .from(applications)
        .where(eq(applications.status, "shortlisted")),
      db.select({ count: count() }).from(applications).where(eq(applications.status, "rejected")),
    ]);

  return {
    success: true,
    data: {
      total: totalRes[0]?.count || 0,
      pending: pendingRes[0]?.count || 0,
      approved: approvedRes[0]?.count || 0,
      paid: paidRes[0]?.count || 0,
      shortlisted: shortlistedRes[0]?.count || 0,
      rejected: rejectedRes[0]?.count || 0,
    },
  };
}

export async function listApplicationsAction({
  search = "",
  status = "",
  paymentStatus = "",
  state = "",
  page = 1,
  limit = 20,
}: {
  search?: string;
  status?: string;
  paymentStatus?: string;
  state?: string;
  page?: number;
  limit?: number;
}): Promise<ActionResult> {
  await requireAdmin();

  const conditions = [];
  if (status) conditions.push(eq(applications.status, status as any));
  if (paymentStatus) conditions.push(eq(applications.paymentStatus, paymentStatus as any));
  if (state) conditions.push(ilike(applications.stateOfOrigin, `%${state}%`));
  if (search) {
    conditions.push(
      or(
        ilike(applications.applicationNumber, `%${search}%`),
        ilike(applications.firstName, `%${search}%`),
        ilike(applications.lastName, `%${search}%`),
        ilike(applications.email, `%${search}%`)
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(applications)
    .where(where)
    .limit(limit)
    .offset((page - 1) * limit)
    .orderBy(applications.createdAt);

  const totalRes = await db
    .select({ count: count() })
    .from(applications)
    .where(where);

  return {
    success: true,
    data: { rows, total: totalRes[0]?.count || 0, page, limit },
  };
}

export async function getApplicationByIdAction(id: number): Promise<ActionResult> {
  const user = await requireAuth();
  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);
  if (!application) return { success: false, error: "Not found" };
  if (user.role !== "admin" && application.userId !== user.id) {
    return { success: false, error: "Forbidden" };
  }
  return { success: true, data: application };
}

export async function updateApplicationStatusAction({
  id,
  status,
}: {
  id: number;
  status: string;
}): Promise<ActionResult> {
  const admin = await requireAdmin();
  const [application] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);
  if (!application) return { success: false, error: "Application not found" };

  await db
    .update(applications)
    .set({ status: status as any })
    .where(eq(applications.id, id));

  await sendEmail({
    to: application.email || "",
    subject: "NLQI Application Status Update",
    html: statusUpdateTemplate(
      `${application.firstName} ${application.lastName}`,
      application.applicationNumber,
      status
    ),
  });

  await createNotification({
    userId: application.userId,
    type: "status",
    title: "Status update",
    message: `Your application ${application.applicationNumber} is now ${status}.`,
  });

  await logAction({
    userId: admin.id,
    action: "STATUS_UPDATED",
    entity: "applications",
    entityId: application.id,
    meta: { status },
  });

  revalidatePath("/admin/applications");
  return { success: true, message: "Status updated" };
}

export async function exportApplicationsCsvAction({
  search = "",
  status = "",
  paymentStatus = "",
  state = "",
}: {
  search?: string;
  status?: string;
  paymentStatus?: string;
  state?: string;
}): Promise<ActionResult> {
  await requireAdmin();

  const conditions = [];
  if (status) conditions.push(eq(applications.status, status as any));
  if (paymentStatus) conditions.push(eq(applications.paymentStatus, paymentStatus as any));
  if (state) conditions.push(ilike(applications.stateOfOrigin, `%${state}%`));
  if (search) {
    conditions.push(
      or(
        ilike(applications.applicationNumber, `%${search}%`),
        ilike(applications.firstName, `%${search}%`),
        ilike(applications.lastName, `%${search}%`),
        ilike(applications.email, `%${search}%`)
      )
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const rows = await db.select().from(applications).where(where);
  const csv = applicationsToCsv(rows);
  return { success: true, data: csv };
}

export async function getAuditLogsAction(limit = 100): Promise<ActionResult> {
  await requireAdmin();
  const rows = await db
    .select()
    .from(auditLogs)
    .limit(limit)
    .orderBy(auditLogs.createdAt);
  return { success: true, data: rows };
}

export async function getNotificationsAction(): Promise<ActionResult> {
  const user = await requireAuth();
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(notifications.createdAt);
  return { success: true, data: rows };
}

export async function markNotificationReadAction(id: number): Promise<ActionResult> {
  const user = await requireAuth();
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));
  return { success: true };
}

export async function sendContactAction(formData: FormData): Promise<ActionResult> {
  const name = getFormString(formData, "name") || "";
  const email = getFormString(formData, "email") || "";
  const message = getFormString(formData, "message") || "";
  if (!name || !email || !message) {
    return { success: false, error: "Please complete all fields" };
  }
  await sendEmail({
    to: process.env.ADMIN_EMAIL || "admin@nlqi.ng",
    subject: `Contact message from ${name}`,
    html: `<p><strong>From:</strong> ${name} &lt;${email}&gt;</p><p>${message.replace(/\n/g, "<br/>")}</p>`,
  });
  return { success: true, message: "Message sent" };
}
