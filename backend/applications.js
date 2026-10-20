const multer = require("multer");
const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { useSupabaseStorage, uploadFile, readFile, removeFile } = require("./storage");

const uploadFields = [
  { name: "headshot", maxCount: 1 },
  { name: "fullBody", maxCount: 1 },
  { name: "identityDocument", maxCount: 1 },
];
const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".pdf"]);
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
const fileLimit = useSupabaseStorage ? 1024 * 1024 : 5 * 1024 * 1024;

async function isSupportedFile(file, mimeType) {
  const content = file.buffer || await fs.readFile(file.path);
  const bytes = content.subarray(0, 8);
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  return false;
}

function safeOriginalName(name) {
  return path.basename(name || "upload").replace(/[^\w.-]/g, "_").slice(0, 120);
}

function csvCell(value) {
  let text = value == null ? "" : String(value);
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

module.exports = function configureApplicationRoutes({
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
}) {
  const uploader = multer({
    storage: useSupabaseStorage ? multer.memoryStorage() : multer.diskStorage({
      destination(req, _file, callback) {
        const folder = path.join(uploadRoot, String(req.user.id));
        fs.mkdir(folder, { recursive: true }).then(() => callback(null, folder), callback);
      },
      filename(_req, file, callback) {
        callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
      },
    }),
    limits: { fileSize: fileLimit, files: 3, fields: 3, fieldSize: 256 * 1024 },
    fileFilter(_req, file, callback) {
      const extension = path.extname(file.originalname).toLowerCase();
      const extensionMatchesMime =
        (file.mimetype === "image/jpeg" && [".jpg", ".jpeg"].includes(extension)) ||
        (file.mimetype === "image/png" && extension === ".png") ||
        (file.mimetype === "application/pdf" && extension === ".pdf");
      if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(file.mimetype) || !extensionMatchesMime) {
        return callback(apiError(400, "Files must be PDF, JPG, or PNG."));
      }
      callback(null, true);
    },
  }).fields(uploadFields);

  async function loadApplication(userId) {
    const row = await db.get("SELECT * FROM applications WHERE user_id = ?", userId);
    if (!row) throw apiError(404, "Application not found.");
    return row;
  }

  function parsePayload(req) {
    let payload = {};
    if (typeof req.body.data === "string") {
      try {
        payload = JSON.parse(req.body.data);
      } catch {
        throw apiError(400, "Application data must be valid JSON.");
      }
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw apiError(400, "Application data must be an object.");
    const entries = Object.entries(payload);
    if (entries.length > 48) throw apiError(400, "The application can contain at most 48 fields.");
    const clean = {};
    for (const [key, value] of entries) {
      if (!/^[A-Za-z][A-Za-z0-9_]{0,47}$/.test(key)) throw apiError(400, "One or more application field names are invalid.");
      if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
        throw apiError(400, `Application field "${key}" must be text, a number, or a true/false value.`);
      }
      if (typeof value === "string" && value.length > 5000) throw apiError(400, `Application field "${key}" is too long.`);
      clean[key] = typeof value === "string" ? value.trim() : value;
    }
    return clean;
  }

  function persistApplication(req, res, next, submit) {
    uploader(req, res, async (uploadError) => {
      if (uploadError) return next(uploadError);
      const uploadedFiles = Object.values(req.files || {}).flat();
      try {
        for (const file of uploadedFiles) {
          if (!await isSupportedFile(file, file.mimetype)) throw apiError(400, "An uploaded file does not match its declared file type.");
        }
        const application = await loadApplication(req.user.id);
        if (application.status !== "draft") throw apiError(409, "This application has already been submitted and can no longer be edited.");
        const previousData = JSON.parse(application.data_json);
        const data = { ...previousData, ...parsePayload(req) };
        const uploads = JSON.parse(application.uploads_json);
        const previousUploads = { ...uploads };
        for (const [field, fileList] of Object.entries(req.files || {})) {
          const file = fileList[0];
          file.filename = file.filename || `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`;
          uploads[field] = {
            filename: file.filename,
            originalname: safeOriginalName(file.originalname),
            mimetype: file.mimetype,
            size: file.size,
          };
        }
        if (submit) {
          const required = ["firstName", "lastName", "phone", "dateOfBirth", "state", "motivation", "experience", "advocacy", "impactIdea"];
          const missing = required.filter((field) => typeof data[field] !== "string" || !data[field].trim());
          if (missing.length || req.body.termsAgreed !== "true") {
            throw apiError(400, `Complete all required application fields and agree to the declaration before submitting. Missing: ${missing.join(", ") || "declaration"}.`);
          }
        }
        for (const file of uploadedFiles) {
          await uploadFile(req.user.id, file, uploadRoot);
        }
        const now = Date.now();
        const status = submit ? "pending" : "draft";
        await db.transaction(async () => {
          await db.run(`
            UPDATE applications
            SET data_json = ?, uploads_json = ?, status = ?, current_step = ?, submitted_at = COALESCE(submitted_at, ?), updated_at = ?
            WHERE id = ?
          `,
            JSON.stringify(data),
            JSON.stringify(uploads),
            status,
            submit ? 4 : Math.min(4, Math.max(1, Number(req.body.currentStep) || application.current_step)),
            submit ? now : null,
            now,
            application.id,
          );
          await audit(req.user.id, submit ? "application.submitted" : "application.saved", "application", application.id);
          if (submit) {
            await notify(
              req.user.id,
              "application",
              "Application submitted",
              `Your application ${application.application_number} has been submitted and is awaiting review.`,
            );
          }
        });
        for (const field of Object.keys(req.files || {})) {
          const previous = previousUploads[field];
          if (previous) {
            try {
              await removeFile(req.user.id, previous.filename, uploadRoot);
            } catch (cleanupError) {
              console.error("Unable to remove replaced application upload:", cleanupError.message);
            }
          }
        }
        if (submit) {
          const message = `Your application ${application.application_number} has been submitted and is awaiting review.`;
          let emailStatus = "sent";
          try {
            const delivery = await sendNotificationEmail(req.user.email, "Your NLQI application has been submitted", `Hello ${req.user.name},\n\n${message}\n\nYou can review your status at ${appUrl}/track.`);
            emailStatus = delivery?.mode === "development-console" ? "development-console" : "sent";
          } catch (emailError) {
            emailStatus = "failed";
            console.error("Application submitted, but notification email failed:", emailError.message);
          }
          return res.status(201).json({
            message,
            emailStatus,
            application: {
              applicationNumber: application.application_number,
              status,
              paymentStatus: application.payment_status,
            },
          });
        }
        res.json({ message: "Draft saved.", applicationNumber: application.application_number });
      } catch (error) {
        for (const filename of new Set(uploadedFiles.map((file) => file.filename).filter(Boolean))) {
          try {
            await removeFile(req.user.id, filename, uploadRoot);
          } catch (cleanupError) {
            console.error("Unable to remove failed application upload:", cleanupError.message);
          }
        }
        for (const file of uploadedFiles) {
          try {
            if (file.path) await fs.rm(file.path, { force: true });
          } catch (cleanupError) {
            console.error("Unable to remove temporary application upload:", cleanupError.message);
          }
        }
        next(error);
      }
    });
  }

  app.get("/api/applications/me", authenticate, requireVerified, async (req, res, next) => {
    try {
      const row = await loadApplication(req.user.id);
      res.json({
        application: {
          applicationNumber: row.application_number,
          status: row.status,
          paymentStatus: row.payment_status,
          currentStep: row.current_step,
          data: JSON.parse(row.data_json),
          uploads: Object.keys(JSON.parse(row.uploads_json)),
          submittedAt: row.submitted_at,
        },
      });
    } catch (error) {
      next(error);
    }
  });
  app.put("/api/applications/me", authenticate, requireVerified, (req, res, next) => persistApplication(req, res, next, false));
  app.post("/api/applications/me/submit", authenticate, requireVerified, (req, res, next) => persistApplication(req, res, next, true));

  app.get("/api/applications/me/documents/:kind", authenticate, requireVerified, async (req, res, next) => {
    try {
      const row = await loadApplication(req.user.id);
      const file = JSON.parse(row.uploads_json)[req.params.kind];
      if (!file) throw apiError(404, "Document not found.");
      const content = await readFile(req.user.id, file.filename, uploadRoot);
      if (!content) throw apiError(404, "Document file is unavailable.");
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("Content-Disposition", `attachment; filename="${file.originalname.replace(/["\\]/g, "_")}"`);
      res.type(file.mimetype);
      res.send(content);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/metrics", authenticate, requireVerified, requireAdmin, async (_req, res, next) => {
    try {
      const totals = await db.get(`
        SELECT COUNT(*) AS total,
          SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN status = 'shortlisted' THEN 1 ELSE 0 END) AS shortlisted,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
          SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS paid
        FROM applications
      `);
      const revenue = (await db.get("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'paid'")).total;
      res.json({ ...totals, revenue, currency: process.env.PAYSTACK_CURRENCY || "NGN" });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/applications/export.csv", authenticate, requireVerified, requireAdmin, async (req, res, next) => {
    try {
      const rows = await db.all(`
        SELECT a.application_number, u.name, u.email, a.status, a.payment_status, a.submitted_at, a.data_json
        FROM applications a JOIN users u ON u.id = a.user_id
        ORDER BY a.created_at DESC
      `);
      const keys = [...new Set(rows.flatMap((row) => Object.keys(JSON.parse(row.data_json))))].slice(0, 48);
      const columns = ["application_number", "name", "email", "status", "payment_status", "submitted_at", ...keys];
      const lines = [
        columns.map(csvCell).join(","),
        ...rows.map((row) => {
          const data = JSON.parse(row.data_json);
          const values = [row.application_number, row.name, row.email, row.status, row.payment_status,
            row.submitted_at ? new Date(row.submitted_at).toISOString() : "", ...keys.map((key) => data[key] ?? "")];
          return values.map(csvCell).join(",");
        }),
      ];
      await audit(req.user.id, "admin.applications_exported", "application", null, { count: rows.length });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="nlqi-applications.csv"');
      res.send(`\uFEFF${lines.join("\r\n")}`);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/applications", authenticate, requireVerified, requireAdmin, async (req, res, next) => {
    try {
      const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
      const status = typeof req.query.status === "string" ? req.query.status : "";
      const allowedStatuses = ["draft", "pending", "shortlisted", "approved", "rejected"];
      const page = Math.max(1, Math.min(10000, Number(req.query.page) || 1));
      const limit = 50;
      const clauses = [];
      const params = [];
      if (status && allowedStatuses.includes(status)) {
        clauses.push("a.status = ?");
        params.push(status);
      }
      if (search) {
        clauses.push("(a.application_number LIKE ? OR u.name LIKE ? OR u.email LIKE ?)");
        const like = `%${search.replace(/[%_]/g, "\\$&")}%`;
        params.push(like, like, like);
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const rows = (await db.all(`
        SELECT a.id, a.application_number AS applicationNumber, a.status, a.payment_status AS paymentStatus,
          a.submitted_at AS submittedAt, a.data_json AS data, a.uploads_json AS uploads,
          u.id AS userId, u.name, u.email, u.email_verified AS emailVerified
        FROM applications a JOIN users u ON u.id = a.user_id
        ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?
      `, ...params, limit, (page - 1) * limit)).map((row) => ({
        ...row,
        data: JSON.parse(row.data),
        uploads: Object.keys(JSON.parse(row.uploads)),
        emailVerified: Boolean(row.emailVerified),
      }));
      res.json({ applications: rows, page, pageSize: limit });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/applications/:id/documents/:kind", authenticate, requireVerified, requireAdmin, async (req, res, next) => {
    try {
      const row = await db.get("SELECT user_id, uploads_json FROM applications WHERE id = ?", Number(req.params.id));
      if (!row) throw apiError(404, "Application not found.");
      const file = JSON.parse(row.uploads_json)[req.params.kind];
      if (!file) throw apiError(404, "Document not found.");
      const content = await readFile(row.user_id, file.filename, uploadRoot);
      if (!content) throw apiError(404, "Document file is unavailable.");
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("Content-Disposition", `attachment; filename="${file.originalname.replace(/["\\]/g, "_")}"`);
      res.type(file.mimetype);
      res.send(content);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/admin/applications/:id/status", authenticate, requireVerified, requireAdmin, async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const status = req.body.status;
      const allowed = ["pending", "shortlisted", "approved", "rejected"];
      if (!Number.isSafeInteger(id) || id <= 0 || !allowed.includes(status)) throw apiError(400, "Choose a valid application status.");
      const row = await db.get(`
        SELECT a.id, a.application_number, a.status, u.id AS user_id, u.email, u.name
        FROM applications a JOIN users u ON u.id = a.user_id WHERE a.id = ?
      `, id);
      if (!row) throw apiError(404, "Application not found.");
      const label = status.charAt(0).toUpperCase() + status.slice(1);
      const message = `Your NLQI application ${row.application_number} status is now ${label}.`;
      await db.transaction(async () => {
        await db.run("UPDATE applications SET status = ?, updated_at = ? WHERE id = ?", status, Date.now(), id);
        await notify(row.user_id, "application_status", `Application ${label}`, message);
        await audit(req.user.id, "admin.application_status_changed", "application", id, { from: row.status, to: status });
      });
      let emailStatus = "sent";
      try {
        const delivery = await sendNotificationEmail(row.email, `NLQI application update: ${label}`, `Hello ${row.name},\n\n${message}\n\nSign in to view your application status.`);
        emailStatus = delivery?.mode === "development-console" ? "development-console" : "sent";
      } catch (emailError) {
        emailStatus = "failed";
        console.error("Application status updated, but notification email failed:", emailError.message);
      }
      res.json({ message, status, emailStatus });
    } catch (error) {
      next(error);
    }
  });

  async function confirmPayment(reference, providerData) {
    const payment = await db.get("SELECT * FROM payments WHERE reference = ?", reference);
    if (!payment || payment.status === "paid") return { confirmed: false, emailStatus: "not-sent" };
    if (payment.status !== "pending") throw apiError(400, "This payment is not awaiting confirmation.");
    const paidAmount = Number(providerData.amount);
    const paidCurrency = String(providerData.currency || "").toUpperCase();
    if (paidAmount !== payment.amount || paidCurrency !== payment.currency) {
      throw apiError(400, "Payment amount or currency does not match the pending payment.");
    }
    const now = Date.now();
    const applied = await db.transaction(async () => {
      const result = await db.run("UPDATE payments SET status = 'paid', channel = ?, paid_at = ?, metadata_json = ? WHERE id = ? AND status = 'pending'",
        cleanProviderText(providerData.channel), now, JSON.stringify({ gatewayResponse: cleanProviderText(providerData.gateway_response) }), payment.id);
      if (!result.changes) return false;
      await db.run("UPDATE applications SET payment_status = 'paid', updated_at = ? WHERE id = ?", now, payment.application_id);
      await notify(payment.user_id, "payment", "Payment confirmed", `Your application fee for ${reference} has been received.`);
      return true;
    });
    if (!applied) return { confirmed: false, emailStatus: "not-sent" };
    const user = await db.get("SELECT email, name FROM users WHERE id = ?", payment.user_id);
    await audit(payment.user_id, "payment.confirmed", "payment", payment.id, { reference });
    try {
      const delivery = await sendNotificationEmail(user.email, "NLQI payment confirmed", `Hello ${user.name},\n\nYour application payment has been confirmed. Reference: ${reference}.`);
      return { confirmed: true, emailStatus: delivery?.mode === "development-console" ? "development-console" : "sent" };
    } catch (emailError) {
      console.error("Payment confirmed, but notification email failed:", emailError.message);
      return { confirmed: true, emailStatus: "failed" };
    }
  }

  app.post("/api/payments/initialize", authenticate, requireVerified, async (req, res, next) => {
    try {
      const secret = process.env.PAYSTACK_SECRET_KEY;
      if (!secret) throw apiError(503, "Online payment is not configured yet. Please contact NLQI.");
      if (!Number.isSafeInteger(feeNaira) || feeNaira < 1) throw apiError(503, "The application fee is not configured correctly.");
      const application = await loadApplication(req.user.id);
      if (application.status === "draft") throw apiError(409, "Submit your application before making payment.");
      if (application.payment_status === "paid") throw apiError(409, "This application fee has already been paid.");
      const reference = `NLQI-${application.application_number}-${crypto.randomBytes(6).toString("hex")}`;
      const amount = feeNaira * 100;
      const currency = (process.env.PAYSTACK_CURRENCY || "NGN").toUpperCase();
      await db.run(`
        INSERT INTO payments (application_id, user_id, reference, amount, currency, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?)
      `, application.id, req.user.id, reference, amount, currency, Date.now());
      try {
        const response = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            email: req.user.email,
            amount,
            currency,
            reference,
            callback_url: `${appUrl}/track`,
            metadata: { applicationNumber: application.application_number },
          }),
          signal: AbortSignal.timeout(15000),
        });
        const result = await response.json();
        if (!response.ok || !result.status || !result.data?.authorization_url) {
          await db.run("UPDATE payments SET status = 'failed' WHERE reference = ?", reference);
          throw apiError(502, "The payment provider could not start checkout. Please try again.");
        }
        await audit(req.user.id, "payment.initialized", "payment", null, { reference });
        return res.json({ authorizationUrl: result.data.authorization_url, reference });
      } catch (error) {
        await db.run("UPDATE payments SET status = 'failed' WHERE reference = ?", reference);
        if (error.status) throw error;
        throw apiError(502, "The payment provider could not be reached. Please try again.");
      }
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/payments/verify", authenticate, requireVerified, async (req, res, next) => {
    try {
      const reference = typeof req.body.reference === "string" ? req.body.reference.slice(0, 150) : "";
      const payment = await db.get("SELECT id FROM payments WHERE reference = ? AND user_id = ?", reference, req.user.id);
      if (!payment) throw apiError(404, "Payment reference not found.");
      const secret = process.env.PAYSTACK_SECRET_KEY;
      if (!secret) throw apiError(503, "Online payment is not configured.");
      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok || !result.status || result.data?.status !== "success") {
        throw apiError(400, "The payment provider has not confirmed this payment.");
      }
      const confirmation = await confirmPayment(reference, result.data);
      res.json({ message: "Payment confirmed.", reference, emailStatus: confirmation.emailStatus });
    } catch (error) {
      next(error);
    }
  });

  return {
    confirmPayment,
  };
};

function cleanProviderText(value) {
  return typeof value === "string" ? value.slice(0, 200) : null;
}
