require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("node:path");
const crypto = require("node:crypto");
const fs = require("node:fs");
const db = require("./backend/database");
const { sendMail, emailConfigured, emailFrom } = require("./backend/email");

const app = express();
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 8080);
const publicRoot = path.join(__dirname, "public");
const uploadRoot = path.resolve(process.env.UPLOAD_DIR || "uploads");
const isProduction = process.env.NODE_ENV === "production";
const sessionTtlDays = Number(process.env.SESSION_TTL_DAYS || 7);
const feeNaira = Number(process.env.APPLICATION_FEE || 5000);
const appUrlValue = process.env.APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${port}`);
let appUrl;
try {
  const configuredUrl = new URL(appUrlValue);
  if (!["http:", "https:"].includes(configuredUrl.protocol) || configuredUrl.pathname !== "/" || configuredUrl.search || configuredUrl.hash) {
    throw new Error("APP_URL must be an HTTP(S) origin without a path, query, or fragment.");
  }
  if (isProduction && configuredUrl.protocol !== "https:") {
    throw new Error("APP_URL must use HTTPS when NODE_ENV=production.");
  }
  appUrl = configuredUrl.origin;
} catch (error) {
  throw new Error(`Invalid APP_URL: ${error.message}`);
}
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be an integer from 1 to 65535.");
if (!Number.isFinite(sessionTtlDays) || sessionTtlDays < 1 || sessionTtlDays > 3650) {
  throw new Error("SESSION_TTL_DAYS must be between 1 and 3650.");
}
if (!Number.isSafeInteger(feeNaira) || feeNaira < 0) throw new Error("APPLICATION_FEE must be a non-negative whole number of naira.");
const sessionTtlMs = sessionTtlDays * 86400000;

if (!process.env.VERCEL) fs.mkdirSync(uploadRoot, { recursive: true });

app.disable("x-powered-by");
app.use(
  helmet({
    strictTransportSecurity: isProduction ? undefined : false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(
  express.json({
    limit: "256kb",
    verify: (req, _res, buffer) => {
      req.rawBody = Buffer.from(buffer);
    },
  }),
);
app.use(express.urlencoded({ extended: false, limit: "32kb" }));
app.use((req, _res, next) => {
  if (req.body === undefined) req.body = {};
  next();
});

const hashToken = (value) => crypto.createHash("sha256").update(value).digest("hex");
const safeEqual = (left, right) => {
  if (typeof left !== "string" || typeof right !== "string") return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const randomToken = () => crypto.randomBytes(32).toString("hex");
const validEmail = (value) =>
  typeof value === "string" &&
  value.length <= 254 &&
  /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(value.trim());
const cleanText = (value, max = 1000) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
const apiError = (status, message) => Object.assign(new Error(message), { status });

const requestLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait and try again." },
});

function parseCookies(header = "") {
  return Object.fromEntries(
    header.split(";").map((part) => {
      const separator = part.indexOf("=");
      if (separator < 0) return ["", ""];
      let value = part.slice(separator + 1).trim();
      try {
        value = decodeURIComponent(value);
      } catch {
        value = "";
      }
      return [part.slice(0, separator).trim(), value];
    }).filter(([key]) => key),
  );
}

function issueCsrf(res) {
  const token = randomToken();
  const secure = isProduction ? "; Secure" : "";
  appendCookie(res, `nlqi_csrf=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=7200${secure}`);
  return token;
}

function appendCookie(res, cookie) {
  const current = res.getHeader("Set-Cookie");
  res.setHeader("Set-Cookie", current ? [...(Array.isArray(current) ? current : [current]), cookie] : cookie);
}

function csrfProtection(req, res, next) {
  if (req.method === "GET" || req.method === "HEAD" || req.path === "/api/payments/webhook") {
    return next();
  }
  const cookieToken = parseCookies(req.headers.cookie).nlqi_csrf;
  const headerToken = req.get("x-csrf-token");
  if (!safeEqual(cookieToken, headerToken)) {
    return res.status(403).json({ error: "Your security token expired. Refresh and try again." });
  }
  const origin = req.get("origin");
  if (origin && origin !== appUrl) {
    return res.status(403).json({ error: "Request origin is not allowed." });
  }
  next();
}

async function authenticate(req, _res, next) {
  const token = parseCookies(req.headers.cookie).nlqi_session;
  if (!token) return next(apiError(401, "Please sign in to continue."));
  const session = await db.get(`
    SELECT users.id, users.email, users.name, users.role, users.email_verified
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.status = 'active'
  `, hashToken(token), Date.now());
  if (!session) return next(apiError(401, "Your session has expired. Please sign in again."));
  req.user = session;
  req.sessionTokenHash = hashToken(token);
  next();
}

function requireVerified(req, _res, next) {
  if (!req.user.email_verified) return next(apiError(403, "Please verify your email address first."));
  next();
}

function requireAdmin(req, _res, next) {
  if (req.user.role !== "admin") return next(apiError(403, "Administrator access is required."));
  next();
}

async function audit(userId, action, entityType = null, entityId = null, details = null) {
  await db.run(`
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, userId || null, action, entityType, entityId, details ? JSON.stringify(details) : null, Date.now());
}

async function notify(userId, type, title, message) {
  await db.run(`
    INSERT INTO notifications (user_id, type, title, message, created_at)
    VALUES (?, ?, ?, ?, ?)
  `, userId, type, title, message, Date.now());
}

function emailLink(pathname, token) {
  return `${appUrl}${pathname}?token=${encodeURIComponent(token)}`;
}

async function sendNotificationEmail(to, subject, text) {
  return sendMail({ to, subject, text, from: emailFrom() });
}

function deliveryStatus(result) {
  return result?.mode === "development-console" ? "development-console" : "sent";
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, emailVerified: Boolean(user.email_verified) };
}

let adminProvisionPromise;
async function ensureInitialAdmin() {
  const configuredEmail = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!configuredEmail && !password) return;
  if (!validEmail(configuredEmail) || !password) {
    throw new Error("Configure both ADMIN_EMAIL and ADMIN_PASSWORD to provision the initial administrator.");
  }
  const email = configuredEmail.trim().toLowerCase();
  if (password.length < 16 || password.length > 128) {
    throw new Error("ADMIN_PASSWORD must contain between 16 and 128 characters.");
  }
  if (!adminProvisionPromise) {
    adminProvisionPromise = (async () => {
      const existing = await db.get("SELECT id, role FROM users WHERE email = ?", email);
      if (existing) {
        if (existing.role !== "admin") {
          throw new Error("ADMIN_EMAIL already belongs to a non-admin account; choose another email.");
        }
        return;
      }
      const passwordHash = await require("bcryptjs").hash(password, 12);
      const now = Date.now();
      let result;
      try {
        result = await db.run(`
          INSERT INTO users (email, name, password_hash, role, status, email_verified, created_at, updated_at)
          VALUES (?, ?, ?, 'admin', 'active', 1, ?, ?)
          ON CONFLICT (email) DO NOTHING
        `, email, cleanText(process.env.ADMIN_NAME, 120) || "NLQI Administrator", passwordHash, now, now);
      } catch (error) {
        const createdByConcurrentRequest = await db.get("SELECT role FROM users WHERE email = ?", email);
        if (!createdByConcurrentRequest) throw error;
        if (createdByConcurrentRequest.role !== "admin") {
          throw new Error("ADMIN_EMAIL already belongs to a non-admin account; choose another email.");
        }
        return;
      }
      if (result.changes) await audit(result.id, "admin.initial_account_provisioned", "user", result.id);
    })();
  }
  try {
    await adminProvisionPromise;
  } catch (error) {
    adminProvisionPromise = undefined;
    throw error;
  }
}

function setSessionCookie(res, token) {
  const secure = isProduction ? "; Secure" : "";
  appendCookie(res, `nlqi_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(sessionTtlMs / 1000)}${secure}`);
}

function clearSessionCookie(res) {
  const secure = isProduction ? "; Secure" : "";
  appendCookie(res, `nlqi_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

async function createSession(userId, res) {
  const token = randomToken();
  await db.run("INSERT INTO sessions (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)",
    userId, hashToken(token), Date.now() + sessionTtlMs, Date.now());
  setSessionCookie(res, token);
}

app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
}, requestLimit, csrfProtection);
app.use("/api", async (_req, _res, next) => {
  try {
    await ensureInitialAdmin();
    next();
  } catch (error) {
    next(error);
  }
});
app.get("/api/health", async (_req, res) => {
  await db.health();
  res.json({ ok: true, service: "nlqi-api", database: db.provider });
});
app.get("/api/csrf", (_req, res) => res.json({ token: issueCsrf(res) }));

app.post("/api/auth/register", authLimit, async (req, res, next) => {
  try {
    const name = cleanText(req.body.name, 120);
    const email = validEmail(req.body.email) ? req.body.email.trim().toLowerCase() : "";
    const password = req.body.password;
    if (name.length < 2 || !email || typeof password !== "string" || password.length < 12 || password.length > 128) {
      throw apiError(400, "Enter your name, a valid email, and a password of at least 12 characters.");
    }
    if (await db.get("SELECT 1 FROM users WHERE email = ?", email)) {
      throw apiError(409, "An account already exists for this email. Try signing in or resetting your password.");
    }

    const bcrypt = require("bcryptjs");
    const passwordHash = await bcrypt.hash(password, 12);
    const token = randomToken();
    const now = Date.now();
    const userId = await db.transaction(async () => {
      const result = await db.run(`
        INSERT INTO users (email, name, password_hash, role, status, email_verified, email_verify_hash, created_at, updated_at)
        VALUES (?, ?, ?, 'applicant', 'active', 0, ?, ?, ?)
      `, email, name, passwordHash, hashToken(token), now, now);
      const userId = Number(result.id);
      const applicationNumber = `NLQI-${now.toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
      await db.run(`
        INSERT INTO applications (user_id, application_number, status, payment_status, data_json, uploads_json, created_at, updated_at)
        VALUES (?, ?, 'draft', 'unpaid', '{}', '{}', ?, ?)
      `, userId, applicationNumber, now, now);
      await notify(userId, "account", "Welcome to NLQI", "Your applicant account is ready. Verify your email to continue your application.");
      await audit(userId, "applicant.registered", "user", userId);
      return userId;
    });
    try {
      await sendNotificationEmail(email, "Verify your NLQI account", `Hello ${name},\n\nVerify your email to continue your NLQI application:\n${emailLink("/verify", token)}\n\nIf you did not create this account, you can ignore this message.`);
    } catch (error) {
      await db.run("DELETE FROM users WHERE id = ?", userId);
      throw error;
    }
    res.status(201).json({
      message: emailConfigured() ? "Account created. Check your email to verify your address." : "Account created. In development, open the verification link printed in the server console.",
      emailVerification: emailConfigured() ? "sent" : "development-console",
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/verify-email", authLimit, async (req, res, next) => {
  try {
    const token = cleanText(req.body.token, 200);
    const user = await db.get("SELECT id, email, name FROM users WHERE email_verify_hash = ?", hashToken(token));
    if (!user) throw apiError(400, "This verification link is invalid or has already been used.");
    const now = Date.now();
    await db.run("UPDATE users SET email_verified = 1, email_verify_hash = NULL, updated_at = ? WHERE id = ?", now, user.id);
    await notify(user.id, "account", "Email verified", "Your email is verified. You can now complete and submit your application.");
    await audit(user.id, "applicant.email_verified", "user", user.id);
    let emailStatus = "sent";
    try {
      const delivery = await sendNotificationEmail(user.email, "Your NLQI email is verified", `Hello ${user.name},\n\nYour email is verified. Sign in to continue your NLQI application at ${appUrl}/login.`);
      emailStatus = deliveryStatus(delivery);
    } catch (emailError) {
      emailStatus = "failed";
      console.error("Email verified, but welcome notification failed:", emailError.message);
    }
    res.json({ message: "Email verified. You can now sign in.", emailStatus });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/resend-verification", authLimit, async (req, res, next) => {
  try {
    const email = validEmail(req.body.email) ? req.body.email.trim().toLowerCase() : "";
    const user = email
      ? await db.get("SELECT id, email, name, email_verified FROM users WHERE email = ?", email)
      : null;
    if (user && !user.email_verified) {
      const token = randomToken();
      await db.run("UPDATE users SET email_verify_hash = ?, updated_at = ? WHERE id = ?",
        hashToken(token), Date.now(), user.id);
      await sendNotificationEmail(user.email, "Verify your NLQI account", `Hello ${user.name},\n\nUse this link to verify your email:\n${emailLink("/verify", token)}`);
    }
    res.json({
      message: emailConfigured()
        ? "If the account needs email verification, a new link has been sent."
        : "If the account needs verification, a development-only link was printed in the server console.",
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", authLimit, async (req, res, next) => {
  try {
    const email = validEmail(req.body.email) ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const user = email ? await db.get("SELECT * FROM users WHERE email = ? AND status = 'active'", email) : null;
    const bcrypt = require("bcryptjs");
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw apiError(401, "Email or password is incorrect.");
    }
    if (!user.email_verified) throw apiError(403, "Verify your email before signing in. Check your inbox or register again for help.");
    await db.run("DELETE FROM sessions WHERE user_id = ?", user.id);
    await createSession(user.id, res);
    await audit(user.id, "auth.login", "user", user.id);
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", authenticate, async (req, res) => {
  await db.run("DELETE FROM sessions WHERE token_hash = ?", req.sessionTokenHash);
  clearSessionCookie(res);
  await audit(req.user.id, "auth.logout", "user", req.user.id);
  res.json({ message: "Signed out." });
});

app.get("/api/auth/me", authenticate, async (req, res) => {
  const application = await db.get(`
    SELECT application_number, status, payment_status, submitted_at
    FROM applications WHERE user_id = ?
  `, req.user.id);
  res.json({ user: publicUser(req.user), application: application || null });
});

app.post("/api/auth/forgot-password", authLimit, async (req, res, next) => {
  try {
    const email = validEmail(req.body.email) ? req.body.email.trim().toLowerCase() : "";
    const user = email ? await db.get("SELECT id, email, name FROM users WHERE email = ?", email) : null;
    if (user) {
      const token = randomToken();
      const expires = Date.now() + 60 * 60 * 1000;
      await db.run("UPDATE users SET reset_token_hash = ?, reset_expires = ? WHERE id = ?",
        hashToken(token), expires, user.id);
      await sendNotificationEmail(user.email, "Reset your NLQI password", `Hello ${user.name},\n\nUse this link within one hour to reset your password:\n${emailLink("/reset-password", token)}\n\nIf you did not request this, ignore this message.`);
      await audit(user.id, "auth.password_reset_requested", "user", user.id);
    }
    res.json({
      message: emailConfigured()
        ? "If an account exists for that email, password reset instructions have been sent."
        : "If an account exists, a development-only reset link was printed in the server console.",
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/reset-password", authLimit, async (req, res, next) => {
  try {
    const token = cleanText(req.body.token, 200);
    const password = req.body.password;
    if (typeof password !== "string" || password.length < 12 || password.length > 128) {
      throw apiError(400, "Choose a password with at least 12 characters.");
    }
    const user = await db.get("SELECT id FROM users WHERE reset_token_hash = ? AND reset_expires > ?",
      hashToken(token), Date.now());
    if (!user) throw apiError(400, "This password reset link is invalid or has expired.");
    const bcrypt = require("bcryptjs");
    const passwordHash = await bcrypt.hash(password, 12);
    await db.run("UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_expires = NULL, updated_at = ? WHERE id = ?",
      passwordHash, Date.now(), user.id);
    await db.run("DELETE FROM sessions WHERE user_id = ?", user.id);
    await audit(user.id, "auth.password_reset", "user", user.id);
    res.json({ message: "Password updated. Please sign in with your new password." });
  } catch (error) {
    next(error);
  }
});

const applications = require("./backend/applications")({
  app,
  db,
  authenticate,
  requireVerified,
  requireAdmin,
  apiError,
  notify,
  audit,
  sendNotificationEmail,
  uploadRoot,
  feeNaira,
  appUrl,
});
require("./backend/admin")({
  app,
  db,
  authenticate,
  requireVerified,
  requireAdmin,
  apiError,
  audit,
  notify,
  sendNotificationEmail,
  appUrl,
});

app.get("/api/notifications", authenticate, requireVerified, async (req, res) => {
  const rows = await db.all(`
    SELECT id, type, title, message, read, created_at AS createdAt
    FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50
  `, req.user.id);
  res.json({ notifications: rows });
});

app.post("/api/notifications/:id/read", authenticate, requireVerified, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id <= 0) return next(apiError(400, "Invalid notification."));
  const result = await db.run("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?", id, req.user.id);
  if (!result.changes) return next(apiError(404, "Notification not found."));
  res.json({ message: "Notification marked as read." });
});

app.post("/api/contact", authLimit, async (req, res, next) => {
  try {
    const name = cleanText(req.body.name, 120);
    const email = validEmail(req.body.email) ? req.body.email.trim() : "";
    const message = cleanText(req.body.message, 3000);
    if (name.length < 2 || !email || message.length < 10) throw apiError(400, "Enter your name, valid email, and a message of at least 10 characters.");
    const recipient = process.env.CONTACT_EMAIL;
    if (!recipient) throw apiError(503, "Contact email is not configured. Please try again later.");
    await sendMail({
      to: recipient,
      replyTo: email,
      subject: `NLQI website message from ${name}`,
      text: `From: ${name}\nEmail: ${email}\n\n${message}`,
      from: emailFrom(),
    });
    res.status(202).json({ message: "Your message has been sent." });
  } catch (error) {
    next(error);
  }
});

app.post("/api/payments/webhook", async (req, res, next) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    const signature = req.get("x-paystack-signature");
    if (!secret || !signature || !Buffer.isBuffer(req.rawBody)) throw apiError(400, "Payment webhook is not configured.");
    const expected = crypto.createHmac("sha512", secret).update(req.rawBody).digest("hex");
    if (!safeEqual(signature, expected)) throw apiError(401, "Invalid payment webhook signature.");
    const event = req.body;
    if (event?.event === "charge.success" && event.data?.reference) {
      return applications.confirmPayment(event.data.reference, event.data)
        .then(() => res.sendStatus(200))
        .catch(next);
    }
    res.sendStatus(200);
  } catch (error) {
    next(error);
  }
});

app.use("/api", (_req, _res, next) => next(apiError(404, "API endpoint not found.")));

const cleanPageRoutes = {
  apply: "apply.html",
  register: "register.html",
  login: "login.html",
  verify: "verify.html",
  track: "track.html",
  admin: "admin.html",
  judge: "judge.html",
  "forgot-password": "forgot-password.html",
  "reset-password": "reset-password.html",
  contact: "contact.html",
  privacy: "privacy.html",
  blog: "blog.html",
  "blog-post": "blog-post.html",
  gallery: "gallery.html",
};

for (const [route, file] of Object.entries(cleanPageRoutes)) {
  app.get(`/${route}`, (_req, res, next) => {
    res.sendFile(path.join(publicRoot, file), (error) => {
      if (error) next(error);
    });
  });
}

app.use(express.static(publicRoot, {
  index: "index.html",
  dotfiles: "deny",
  fallthrough: true,
  maxAge: isProduction ? "1h" : 0,
  setHeaders(res) {
    res.setHeader("X-Content-Type-Options", "nosniff");
  },
}));

app.use((req, _res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next(apiError(405, "Method not allowed."));
  next(apiError(404, "Page not found."));
});

app.use((error, _req, res, _next) => {
  if (error instanceof require("multer").MulterError) {
    return res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400)
      .json({ error: error.code === "LIMIT_FILE_SIZE" ? `Each file must be ${process.env.VERCEL ? "1 MB" : "5 MB"} or smaller.` : "Invalid upload." });
  }
  const status = Number(error.status) || 500;
  if (status >= 500) console.error("NLQI request failed:", error.message);
  res.status(status).json({ error: status >= 500 ? "The request could not be completed. Please try again later." : error.message });
});

if (!process.env.VERCEL) {
  const server = app.listen(port, host, () => {
    console.log(`NLQI site and API ready at http://localhost:${port}`);
    if (!emailConfigured() && !isProduction) {
      console.warn("SMTP is not configured. Verification/reset links will be printed to this console for local development.");
    }
  });

  server.on("error", (error) => {
    console.error("Unable to start the NLQI server:", error);
    process.exitCode = 1;
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      server.close(async () => {
        await db.close();
        process.exit(0);
      });
    });
  }
}

module.exports = app;
