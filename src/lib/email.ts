import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

const transporter =
  smtpHost && smtpUser && smtpPass
    ? nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
      })
    : null;

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const from = process.env.SMTP_USER || "no-reply@nlqi.ng";
  if (!transporter) {
    console.log("[EMAIL NOT SENT - SMTP NOT CONFIGURED]");
    console.log({ to, from, subject, html: html.slice(0, 200) });
    return { messageId: "mock" };
  }
  return transporter.sendMail({ from, to, subject, html });
}

export function registrationTemplate(name: string, link: string) {
  return `<div style="font-family:Georgia,serif;color:#004d2b;">
    <h2>Welcome to NLQI, ${name}</h2>
    <p>Confirm your email to begin your legacy journey.</p>
    <a href="${link}" style="background:#d8ad3f;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;">Verify Email</a>
  </div>`;
}

export function applicationSubmittedTemplate(name: string, number: string) {
  return `<div style="font-family:Georgia,serif;color:#004d2b;">
    <h2>Application Received</h2>
    <p>Hi ${name}, your NLQI application <strong>${number}</strong> has been submitted.</p>
    <p>Complete your payment to finalise your entry.</p>
  </div>`;
}

export function paymentConfirmedTemplate(name: string, number: string) {
  return `<div style="font-family:Georgia,serif;color:#004d2b;">
    <h2>Payment Confirmed</h2>
    <p>Hi ${name}, payment for application <strong>${number}</strong> has been confirmed.</p>
  </div>`;
}

export function statusUpdateTemplate(name: string, number: string, status: string) {
  return `<div style="font-family:Georgia,serif;color:#004d2b;">
    <h2>Application Status Update</h2>
    <p>Hi ${name}, your application <strong>${number}</strong> is now <strong>${status}</strong>.</p>
  </div>`;
}

export function resetPasswordTemplate(name: string, link: string) {
  return `<div style="font-family:Georgia,serif;color:#004d2b;">
    <h2>Reset your password</h2>
    <p>Hi ${name}, click the link below to reset your NLQI password.</p>
    <a href="${link}" style="background:#d8ad3f;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;">Reset Password</a>
  </div>`;
}
