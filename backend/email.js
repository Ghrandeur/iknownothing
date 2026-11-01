const nodemailer = require("nodemailer");

let transport;

function emailConfig() {
  const port = Number(process.env.EMAIL_SMTP_PORT || process.env.SMTP_PORT || 587);
  return {
    host: process.env.EMAIL_SMTP_HOST || process.env.SMTP_HOST,
    port,
    secure: (process.env.EMAIL_SMTP_SECURE ?? process.env.SMTP_SECURE)?.toLowerCase() === "true" || port === 465,
    user: process.env.EMAIL_USER || process.env.SMTP_USER,
    pass: process.env.EMAIL_PASSWORD || process.env.SMTP_PASS,
    authMethod: process.env.EMAIL_SMTP_AUTH_METHOD || undefined,
  };
}

function emailConfigured() {
  if (process.env.NODE_ENV === "test") return false;
  const config = emailConfig();
  return Boolean(config.host && config.user && config.pass);
}

function emailFrom() {
  if (process.env.SMTP_FROM) return process.env.SMTP_FROM;
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const from = process.env.EMAIL_FROM || "NLQI";
  if (from.includes("<") && from.includes(">")) return from;
  if (user) return { name: from, address: user };
  return "NLQI <no-reply@localhost>";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function registrationPaymentTemplate(name, number, logoUrl) {
  const safeName = escapeHtml(name);
  const safeNumber = escapeHtml(number);
  const safeLogoUrl = escapeHtml(logoUrl);
  const registrationLink = "https://rigitix.com/nigeria-legacy-queen-international/register";
  return `<!doctype html><html><body style="margin:0;background:#f5f7f5;padding:24px;font-family:Arial,sans-serif;color:#22352a">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e7e3">
    <tr><td style="background:#fff;padding:20px;text-align:center;border-bottom:3px solid #caa64b"><img src="${safeLogoUrl}" alt="Nigeria Legacy Queen International" width="180" style="display:block;margin:auto;max-width:180px;height:auto"></td></tr>
    <tr><td style="padding:32px">
      <h1 style="margin:0 0 16px;color:#004d2b;font-size:24px">Complete Your Contest Registration</h1>
      <p>Hello <strong>${safeName}</strong>,</p>
      <p>Your application <strong>${safeNumber}</strong> has been received. Please use the official registration link below to complete your registration and make your payment to reserve your space for the Nigeria Legacy Queen International contest.</p>
      <p style="background:#fff8e6;border-left:4px solid #caa64b;padding:14px"><strong>Payment is required to secure your place.</strong> Your application is not confirmed as reserved until the registration and payment process is completed successfully.</p>
      <h2 style="color:#004d2b;font-size:18px;margin-top:24px">Steps to complete registration</h2>
      <ol style="line-height:1.7;padding-left:20px">
        <li>Open the official registration page using the button below.</li>
        <li>Enter your correct personal and contact details exactly as shown in your application.</li>
        <li>Review all details carefully before proceeding.</li>
        <li>Select the available payment option and complete the payment securely.</li>
        <li>Keep your payment receipt or confirmation reference for your records.</li>
      </ol>
      <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px auto"><tr><td style="border-radius:6px;background:#006b3c"><a href="${registrationLink}" style="display:inline-block;padding:14px 28px;color:#fff;text-decoration:none;font-weight:bold;font-size:16px">Complete Registration &amp; Make Payment</a></td></tr></table>
      <p style="word-break:break-all">If the button does not work, copy and open this official link:<br><a href="${registrationLink}" style="color:#006b3c">${registrationLink}</a></p>
      <p>Do not share your payment information with anyone claiming to represent NLQI outside official communication channels. For assistance, use the contact details on our official website.</p>
      <p style="margin-bottom:0">Warm regards,<br><strong>Nigeria Legacy Queen International</strong></p>
    </td></tr>
    <tr><td style="background:#f5f7f5;padding:16px;text-align:center;font-size:12px;color:#66736b">Official communication from Nigeria Legacy Queen International</td></tr>
  </table></body></html>`;
}

async function sendMail(message) {
  if (!emailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Configure EMAIL_SMTP_HOST, EMAIL_USER and EMAIL_PASSWORD (or their SMTP_* compatibility variables) to send production email.");
    }
    console.info(`[NLQI development email]\nTo: ${message.to}\nSubject: ${message.subject}\n${message.text}`);
    return { mode: "development-console" };
  }
  if (!transport) {
    const config = emailConfig();
    transport = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      ...(config.authMethod ? { authMethod: config.authMethod } : {}),
      auth: { user: config.user, pass: config.pass },
    });
  }
  return transport.sendMail(message);
}

module.exports = { sendMail, emailConfigured, emailFrom, registrationPaymentTemplate };
