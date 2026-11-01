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

export function registrationPaymentTemplate(name: string, number: string, baseUrl: string = "") {
  const logoUrl = `${baseUrl.replace(/\/$/, "")}/images/nlqi-logo.png`;
  const registrationLink = "https://rigitix.com/nigeria-legacy-queen-international/register";
  return `<div style="margin:0;background:#f5f7f5;padding:24px;font-family:Arial,sans-serif;color:#22352a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e7e3">
      <tr><td style="background:#ffffff;padding:20px;text-align:center;border-bottom:3px solid #caa64b">
        <img src="${logoUrl}" alt="Nigeria Legacy Queen International" width="180" style="display:block;margin:auto;max-width:180px;height:auto">
      </td></tr>
      <tr><td style="padding:32px">
        <h1 style="margin:0 0 16px;color:#004d2b;font-size:24px">Complete Your Contest Registration</h1>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your application <strong>${number}</strong> has been received. Please use the official registration link below to complete your registration and make your payment to reserve your space for the Nigeria Legacy Queen International contest.</p>
        <p style="background:#fff8e6;border-left:4px solid #caa64b;padding:14px"><strong>Payment is required to secure your place.</strong> Your application is not confirmed as reserved until the registration and payment process is completed successfully.</p>
        <h2 style="color:#004d2b;font-size:18px;margin-top:24px">Steps to complete registration</h2>
        <ol style="line-height:1.7;padding-left:20px">
          <li>Open the official registration page using the button below.</li>
          <li>Enter your correct personal and contact details exactly as shown in your application.</li>
          <li>Review all details carefully before proceeding.</li>
          <li>Select the available payment option and complete the payment securely.</li>
          <li>Keep your payment receipt or confirmation reference for your records.</li>
        </ol>
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px auto"><tr><td style="border-radius:6px;background:#006b3c">
          <a href="${registrationLink}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:bold;font-size:16px">Complete Registration &amp; Make Payment</a>
        </td></tr></table>
        <p style="word-break:break-all">If the button does not work, copy and open this official link:<br><a href="${registrationLink}" style="color:#006b3c">${registrationLink}</a></p>
        <p>Do not share your payment information with anyone claiming to represent NLQI outside official communication channels. For assistance, use the contact details on our official website.</p>
        <p style="margin-bottom:0">Warm regards,<br><strong>Nigeria Legacy Queen International</strong></p>
      </td></tr>
      <tr><td style="background:#f5f7f5;padding:16px;text-align:center;font-size:12px;color:#66736b">Official communication from Nigeria Legacy Queen International</td></tr>
    </table>
  </div>`;
}

export function applicationSubmittedTemplate(name: string, number: string, baseUrl: string = "") {
  return registrationPaymentTemplate(name, number, baseUrl);
}

export function paymentConfirmedTemplate(name: string, number: string) {
  return `<div style="font-family:Georgia,serif;color:#004d2b;">
    <h2>Payment Confirmed</h2>
    <p>Hi ${name}, payment for application <strong>${number}</strong> has been confirmed.</p>
  </div>`;
}

export function statusUpdateTemplate(name: string, number: string, status: string, baseUrl: string = "") {
  if (status.toLowerCase() === "approved") {
    return registrationPaymentTemplate(name, number, baseUrl);
  }
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
