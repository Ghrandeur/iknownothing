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

module.exports = { sendMail, emailConfigured, emailFrom };
