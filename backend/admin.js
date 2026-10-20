const bcrypt = require("bcryptjs");
const crypto = require("node:crypto");
const { emailConfigured } = require("./email");

const SCORE_CRITERIA = ["advocacy", "communication", "confidence", "leadership", "purpose", "presentation"];
const CONTENT_TABLES = {
  gallery: {
    table: "gallery",
    publicFields: "id, title, description, image_url AS imageUrl, sort_order AS sortOrder",
    fields: ["title", "description", "imageUrl", "active", "sortOrder"],
  },
  blog: {
    table: "blog_posts",
    publicFields: "id, title, slug, excerpt, body, image_url AS imageUrl, published_at AS publishedAt",
    fields: ["title", "slug", "excerpt", "body", "imageUrl", "status"],
  },
  sponsors: {
    table: "sponsors",
    publicFields: "id, name, logo_url AS logoUrl, website_url AS websiteUrl, tier, sort_order AS sortOrder",
    fields: ["name", "logoUrl", "websiteUrl", "tier", "active", "sortOrder"],
  },
  partners: {
    table: "partners",
    publicFields: "id, name, logo_url AS logoUrl, website_url AS websiteUrl, description, sort_order AS sortOrder",
    fields: ["name", "logoUrl", "websiteUrl", "description", "active", "sortOrder"],
  },
};

function toPublicContent(type, row) {
  if (type === "gallery") return { ...row, active: Boolean(row.active) };
  if (type === "blog") return row;
  return { ...row, active: Boolean(row.active) };
}

function normalizeUrl(value, optional = false) {
  if (value === undefined || value === null || value === "") {
    if (optional) return "";
    throw Object.assign(new Error("Provide a valid URL."), { status: 400 });
  }
  if (typeof value !== "string") throw Object.assign(new Error("URL values must be text."), { status: 400 });
  if (!value.trim()) {
    if (optional) return "";
    throw Object.assign(new Error("Provide a valid URL."), { status: 400 });
  }
  const input = value.trim();
  if (input.startsWith("/") && !input.startsWith("//") && !input.includes("\\")) return input.slice(0, 500);
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    throw Object.assign(new Error("URLs must use HTTPS or a local site path."), { status: 400 });
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw Object.assign(new Error("External URLs must use HTTPS and cannot contain credentials."), { status: 400 });
  }
  return parsed.href.slice(0, 500);
}

function normalizeContent(type, body, apiError) {
  const fail = (message) => { throw apiError(400, message); };
  if (!body || typeof body !== "object" || Array.isArray(body)) fail("Content must be sent as a JSON object.");
  const clean = (field, max, required = false) => {
    const value = body[field];
    if (value === undefined || value === null) return required ? fail(`${field} is required.`) : "";
    if (typeof value !== "string") return fail(`${field} must be text.`);
    const result = value.trim();
    if (required && !result) fail(`${field} is required.`);
    if (result.length > max) fail(`${field} is too long.`);
    return result;
  };
  const positiveInt = (field, fallback = 0) => {
    if (body[field] === undefined || body[field] === "") return fallback;
    const value = Number(body[field]);
    if (!Number.isSafeInteger(value) || value < 0 || value > 100000) fail(`${field} must be a whole number.`);
    return value;
  };
  const active = body.active === undefined ? true : body.active;
  if (type !== "blog" && typeof active !== "boolean") fail("active must be true or false.");
  if (type === "gallery") {
    return {
      title: clean("title", 160, true),
      description: clean("description", 800),
      image_url: normalizeUrl(body.imageUrl),
      active: active ? 1 : 0,
      sort_order: positiveInt("sortOrder"),
    };
  }
  if (type === "blog") {
    const title = clean("title", 180, true);
    const slug = clean("slug", 180, true).toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fail("slug must contain lowercase letters, numbers, and single hyphens only.");
    const status = body.status ?? "draft";
    if (!["draft", "published"].includes(status)) fail("Choose draft or published status.");
    return {
      title,
      slug,
      excerpt: clean("excerpt", 500),
      body: clean("body", 20000, true),
      image_url: normalizeUrl(body.imageUrl || "", true),
      status,
    };
  }
  if (type === "sponsors") {
    const tier = body.tier ?? "partner";
    if (!["platinum", "gold", "silver", "bronze", "partner"].includes(tier)) fail("Choose a valid sponsor tier.");
    return {
      name: clean("name", 160, true),
      logo_url: normalizeUrl(body.logoUrl, true),
      website_url: normalizeUrl(body.websiteUrl, true),
      tier,
      active: active ? 1 : 0,
      sort_order: positiveInt("sortOrder"),
    };
  }
  return {
    name: clean("name", 160, true),
    logo_url: normalizeUrl(body.logoUrl, true),
    website_url: normalizeUrl(body.websiteUrl, true),
    description: clean("description", 800),
    active: active ? 1 : 0,
    sort_order: positiveInt("sortOrder"),
  };
}

function calculateAge(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const birth = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(birth.valueOf()) || birth.toISOString().slice(0, 10) !== value) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (today.getUTCMonth() < birth.getUTCMonth() ||
      (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age >= 0 && age <= 120 ? age : null;
}

module.exports = function configureAdminRoutes({
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
}) {
  const admin = [authenticate, requireVerified, requireAdmin];
  const judge = async (req, _res, next) => {
    if (req.user.role !== "judge") return next(apiError(403, "Judge access is required."));
    try {
      const record = await db.get("SELECT id FROM judges WHERE user_id = ? AND active = 1", req.user.id);
      if (!record) return next(apiError(403, "Your judge account is inactive."));
      req.judgeId = record.id;
      next();
    } catch (error) {
      next(error);
    }
  };

  app.get("/api/content/:type", async (req, res, next) => {
    const config = CONTENT_TABLES[req.params.type];
    if (!config) return next(apiError(404, "Content collection not found."));
    const where = req.params.type === "blog" ? "status = 'published'" : "active = 1";
    const order = req.params.type === "blog" ? "published_at DESC, id DESC" : "sort_order ASC, id DESC";
    res.json({
      items: (await db.all(`SELECT ${config.publicFields} FROM ${config.table} WHERE ${where} ORDER BY ${order}`))
        .map((row) => toPublicContent(req.params.type, row)),
    });
  });

  app.get("/api/content/blog/:slug", async (req, res, next) => {
    const post = await db.get(`
      SELECT id, title, slug, excerpt, body, image_url AS imageUrl, published_at AS publishedAt
      FROM blog_posts WHERE slug = ? AND status = 'published'
    `, req.params.slug);
    if (!post) return next(apiError(404, "Article not found."));
    res.json({ post });
  });

  app.get("/api/admin/users", ...admin, async (req, res) => {
    const users = (await db.all(`
      SELECT u.id, u.name, u.email, u.role, u.status, u.email_verified AS emailVerified,
        u.created_at AS createdAt, COUNT(DISTINCT a.id) AS applicationCount
      FROM users u LEFT JOIN applications a ON a.user_id = u.id
      GROUP BY u.id ORDER BY u.created_at DESC LIMIT 250
    `)).map((user) => ({ ...user, emailVerified: Boolean(user.emailVerified) }));
    res.json({ users });
  });

  app.patch("/api/admin/users/:id", ...admin, async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0) return next(apiError(400, "Invalid user."));
    const target = await db.get("SELECT id, role, status FROM users WHERE id = ?", id);
    if (!target) return next(apiError(404, "User not found."));
    if (id === req.user.id) return next(apiError(400, "You cannot change your own account here."));
    const changes = {};
    if (req.body.status !== undefined) {
      if (!["active", "suspended"].includes(req.body.status)) return next(apiError(400, "Choose active or suspended status."));
      changes.status = req.body.status;
    }
    if (req.body.role !== undefined) {
      if (!["applicant", "judge"].includes(req.body.role)) {
        return next(apiError(400, "Administrator roles can only be assigned through the trusted environment setup."));
      }
      changes.role = req.body.role;
    }
    if (!Object.keys(changes).length) return next(apiError(400, "No valid user changes provided."));
    if (target.role === "admin" && changes.status === "suspended") {
      const activeAdmins = (await db.get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND status = 'active'")).count;
      if (activeAdmins <= 1) return next(apiError(409, "The last active administrator cannot be suspended."));
    }
    const now = Date.now();
    await db.transaction(async () => {
      if (changes.status) await db.run("UPDATE users SET status = ?, updated_at = ? WHERE id = ?", changes.status, now, id);
      if (changes.status) {
        await db.run("DELETE FROM sessions WHERE user_id = ?", id);
        if (target.role === "judge") {
          await db.run("UPDATE judges SET active = ?, updated_at = ? WHERE user_id = ?", changes.status === "active" ? 1 : 0, now, id);
        }
      }
      if (changes.role) await db.run("UPDATE users SET role = ?, updated_at = ? WHERE id = ?", changes.role, now, id);
      if (target.role === "judge" && changes.role === "applicant") {
        await db.run("UPDATE judges SET active = 0, updated_at = ? WHERE user_id = ?", now, id);
      }
      if (target.role === "applicant" && changes.role === "judge") {
        await db.run(`
          INSERT INTO judges (user_id, bio, active, created_at, updated_at)
          VALUES (?, '', 1, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET active = 1, updated_at = excluded.updated_at
        `, id, now, now);
      }
      await audit(req.user.id, "admin.user_updated", "user", id, { changes });
    });
    res.json({ message: "User updated.", changes });
  });

  app.get("/api/admin/judges", ...admin, async (_req, res) => {
    const judges = (await db.all(`
      SELECT j.id, j.user_id AS userId, j.bio, j.active, u.name, u.email,
        COUNT(DISTINCT ja.application_id) AS assignedApplications,
        COUNT(DISTINCT s.application_id) AS scoredApplications
      FROM judges j JOIN users u ON u.id = j.user_id
      LEFT JOIN judge_assignments ja ON ja.judge_id = j.id
      LEFT JOIN scores s ON s.judge_id = j.id
      GROUP BY j.id, j.user_id, j.bio, j.active, u.name, u.email ORDER BY LOWER(u.name)
    `)).map((row) => ({ ...row, active: Boolean(row.active) }));
    res.json({ judges, criteria: SCORE_CRITERIA });
  });

  app.post("/api/admin/judges", ...admin, async (req, res, next) => {
    try {
      const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
      const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const bio = typeof req.body.bio === "string" ? req.body.bio.trim() : "";
      if (name.length < 2 || name.length > 120) throw apiError(400, "Judge name must be between 2 and 120 characters.");
      if (!/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(email)) {
        throw apiError(400, "Enter a valid judge email address.");
      }
      if (bio.length > 2000) throw apiError(400, "Judge bio must be 2,000 characters or shorter.");
      if (await db.get("SELECT 1 FROM users WHERE email = ?", email)) throw apiError(409, "An account already exists for this email.");
      const now = Date.now();
      const setupToken = crypto.randomBytes(32).toString("hex");
      const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(48).toString("hex"), 12);
      const judgeId = await db.transaction(async () => {
        const result = await db.run(`
          INSERT INTO users (email, name, password_hash, role, status, email_verified, reset_token_hash, reset_expires, created_at, updated_at)
          VALUES (?, ?, ?, 'judge', 'active', 1, ?, ?, ?, ?)
        `, email, name, randomPasswordHash, crypto.createHash("sha256").update(setupToken).digest("hex"), now + 48 * 60 * 60 * 1000, now, now);
        const userId = Number(result.lastInsertRowid);
        const judgeResult = await db.run(`
          INSERT INTO judges (user_id, bio, active, created_at, updated_at) VALUES (?, ?, 1, ?, ?)
        `, userId, bio, now, now);
        await audit(req.user.id, "admin.judge_created", "judge", Number(judgeResult.lastInsertRowid));
        return Number(judgeResult.lastInsertRowid);
      });
      const setupLink = `${appUrl}/reset-password?token=${encodeURIComponent(setupToken)}`;
      let emailStatus = "sent";
      try {
        const delivery = await sendNotificationEmail(email, "Your NLQI judge account", `Hello ${name},\n\nAn NLQI administrator has invited you to judge applications. Set your password within 48 hours:\n${setupLink}\n\nSign in at ${appUrl}/login after setting your password.`);
        emailStatus = delivery?.mode === "development-console" ? "development-console" : "sent";
      } catch (error) {
        emailStatus = "failed";
        console.error("Judge account created, but invitation email failed:", error.message);
      }
      res.status(201).json({ message: "Judge account created.", judgeId, emailStatus });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/admin/judges/:id", ...admin, async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id <= 0 || typeof req.body.active !== "boolean") {
      return next(apiError(400, "Provide a valid judge ID and active true/false value."));
    }
    const row = await db.get("SELECT id, user_id FROM judges WHERE id = ?", id);
    if (!row) return next(apiError(404, "Judge not found."));
    await db.transaction(async () => {
      await db.run("UPDATE judges SET active = ?, updated_at = ? WHERE id = ?", req.body.active ? 1 : 0, Date.now(), id);
      if (!req.body.active) await db.run("DELETE FROM sessions WHERE user_id = ?", row.user_id);
      await audit(req.user.id, req.body.active ? "admin.judge_activated" : "admin.judge_deactivated", "judge", id);
    });
    res.json({ message: `Judge ${req.body.active ? "activated" : "deactivated"}.` });
  });

  app.get("/api/admin/applications/assignable", ...admin, async (_req, res) => {
    const applications = await db.all(`
      SELECT id, application_number AS applicationNumber,
        json_extract(data_json, '$.firstName') || ' ' || json_extract(data_json, '$.lastName') AS applicantName
      FROM applications WHERE status IN ('pending', 'shortlisted', 'approved')
      ORDER BY submitted_at DESC LIMIT 250
    `);
    res.json({ applications });
  });

  app.post("/api/admin/judges/:id/assignments", ...admin, async (req, res, next) => {
    const judgeId = Number(req.params.id);
    const applicationId = Number(req.body.applicationId);
    if (!Number.isSafeInteger(judgeId) || !Number.isSafeInteger(applicationId) || judgeId <= 0 || applicationId <= 0) {
      return next(apiError(400, "Select a valid judge and application."));
    }
    const selectedJudge = await db.get(`
      SELECT j.id, j.active FROM judges j JOIN users u ON u.id = j.user_id
      WHERE j.id = ? AND u.status = 'active'
    `, judgeId);
    const selectedApplication = await db.get("SELECT id, application_number FROM applications WHERE id = ? AND status != 'draft'", applicationId);
    if (!selectedJudge || !selectedJudge.active) return next(apiError(404, "Active judge not found."));
    if (!selectedApplication) return next(apiError(404, "Submitted application not found."));
    try {
      const assignment = await db.transaction(async () => {
        const result = await db.run(`
          INSERT INTO judge_assignments (judge_id, application_id, assigned_by, created_at) VALUES (?, ?, ?, ?)
        `, judgeId, applicationId, req.user.id, Date.now());
        const judgeUser = await db.get("SELECT user_id FROM judges WHERE id = ?", judgeId);
        await notify(judgeUser.user_id, "judge_assignment", "Application assigned", `Application ${selectedApplication.application_number} has been assigned to you for review.`);
        await audit(req.user.id, "admin.judge_assigned", "application", applicationId, { judgeId });
        return { id: Number(result.lastInsertRowid), judgeUserId: judgeUser.user_id };
      });
      const judgeUser = await db.get("SELECT email, name FROM users WHERE id = ?", assignment.judgeUserId);
      let emailStatus = "sent";
      try {
        const delivery = await sendNotificationEmail(judgeUser.email, "NLQI application assigned for review", `Hello ${judgeUser.name},\n\nApplication ${selectedApplication.application_number} has been assigned to you. Sign in to review it at ${appUrl}/judge.`);
        emailStatus = delivery?.mode === "development-console" ? "development-console" : "sent";
      } catch (error) {
        emailStatus = "failed";
        console.error("Judge assignment created, but notification email failed:", error.message);
      }
      res.status(201).json({ message: "Application assigned to judge.", assignmentId: assignment.id, emailStatus });
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE" || error.code === "23505") return next(apiError(409, "This application is already assigned to that judge."));
      next(error);
    }
  });

  app.get("/api/judge/assignments", authenticate, requireVerified, judge, async (req, res) => {
    const rows = await db.all(`
      SELECT a.id AS applicationId, a.application_number AS applicationNumber,
        a.status, a.data_json AS data, a.submitted_at AS submittedAt,
        EXISTS (SELECT 1 FROM scores s WHERE s.judge_id = ja.judge_id AND s.application_id = a.id) AS scored
      FROM judge_assignments ja JOIN applications a ON a.id = ja.application_id
      WHERE ja.judge_id = ? ORDER BY a.submitted_at DESC
    `, req.judgeId);
    const assignments = await Promise.all(rows.map(async (row) => ({
      ...row,
      data: JSON.parse(row.data),
      scored: Boolean(row.scored),
      criteria: await db.all("SELECT criterion, score, comment FROM scores WHERE judge_id = ? AND application_id = ?", req.judgeId, row.applicationId),
    })));
    res.json({ assignments, criteria: SCORE_CRITERIA });
  });

  app.put("/api/judge/assignments/:applicationId/scores", authenticate, requireVerified, judge, async (req, res, next) => {
    const applicationId = Number(req.params.applicationId);
    if (!Number.isSafeInteger(applicationId) || applicationId <= 0) return next(apiError(400, "Invalid application."));
    if (!await db.get("SELECT 1 FROM judge_assignments WHERE judge_id = ? AND application_id = ?", req.judgeId, applicationId)) {
      return next(apiError(403, "This application is not assigned to you."));
    }
    if (!req.body.scores || typeof req.body.scores !== "object" || Array.isArray(req.body.scores)) {
      return next(apiError(400, "Scores must be provided as a criterion-to-score object."));
    }
    const scoreEntries = Object.entries(req.body.scores);
    if (scoreEntries.length !== SCORE_CRITERIA.length || scoreEntries.some(([criterion]) => !SCORE_CRITERIA.includes(criterion))) {
      return next(apiError(400, "Score every listed criterion exactly once."));
    }
    const comments = req.body.comments && typeof req.body.comments === "object" && !Array.isArray(req.body.comments)
      ? req.body.comments
      : {};
    const now = Date.now();
    try {
      await db.transaction(async () => {
      for (const criterion of SCORE_CRITERIA) {
        const score = Number(req.body.scores[criterion]);
        if (!Number.isInteger(score) || score < 1 || score > 10) throw apiError(400, "Each score must be a whole number from 1 to 10.");
        const comment = typeof comments[criterion] === "string" ? comments[criterion].trim() : "";
        if (comment.length > 1000) throw apiError(400, "Score comments must be 1,000 characters or shorter.");
        await db.run(`
          INSERT INTO scores (judge_id, application_id, criterion, score, comment, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(judge_id, application_id, criterion)
          DO UPDATE SET score = excluded.score, comment = excluded.comment, updated_at = excluded.updated_at
        `, req.judgeId, applicationId, criterion, score, comment, now, now);
      }
      await audit(req.user.id, "judge.scores_saved", "application", applicationId);
      });
      res.json({ message: "Scores saved." });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/scoring", ...admin, async (_req, res) => {
    const rows = await db.all(`
      SELECT a.id AS applicationId, a.application_number AS applicationNumber,
        json_extract(a.data_json, '$.firstName') || ' ' || json_extract(a.data_json, '$.lastName') AS applicantName,
        COUNT(DISTINCT s.judge_id) AS judgesScored,
        ROUND(AVG(s.score), 2) AS averageScore
      FROM applications a LEFT JOIN scores s ON s.application_id = a.id
      WHERE a.status != 'draft'
      GROUP BY a.id ORDER BY averageScore DESC, a.submitted_at DESC
    `);
    res.json({ applications: rows });
  });

  app.get("/api/admin/analytics", ...admin, async (_req, res) => {
    const applications = (await db.all(`
      SELECT a.status, a.payment_status AS paymentStatus, a.data_json AS data, a.submitted_at AS submittedAt
      FROM applications a WHERE a.status != 'draft'
    `)).map((row) => ({ ...row, data: JSON.parse(row.data) }));
    const byState = {};
    const byAge = {};
    const byMonth = {};
    for (const application of applications) {
      const state = typeof application.data.state === "string" ? application.data.state.trim() : "";
      if (state) byState[state] = (byState[state] || 0) + 1;
      const age = Number(application.data.age) || calculateAge(application.data.dateOfBirth);
      if (age !== null && Number.isFinite(age)) {
        const bracket = `${Math.floor(age / 10) * 10}-${Math.floor(age / 10) * 10 + 9}`;
        byAge[bracket] = (byAge[bracket] || 0) + 1;
      }
      if (application.submittedAt) {
        const month = new Date(application.submittedAt).toISOString().slice(0, 7);
        byMonth[month] = (byMonth[month] || 0) + 1;
      }
    }
    const count = applications.length;
    const approved = applications.filter((application) => application.status === "approved").length;
    const shortlisted = applications.filter((application) => application.status === "shortlisted").length;
    const paid = applications.filter((application) => application.paymentStatus === "paid").length;
    res.json({
      total: count,
      approvedRatio: count ? Number((approved / count * 100).toFixed(1)) : 0,
      shortlistedRatio: count ? Number((shortlisted / count * 100).toFixed(1)) : 0,
      paidRatio: count ? Number((paid / count * 100).toFixed(1)) : 0,
      byState: Object.entries(byState).sort((a, b) => b[1] - a[1]),
      byAge: Object.entries(byAge).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true })),
      byMonth: Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])),
    });
  });

  app.get("/api/admin/finance", ...admin, async (req, res) => {
    const status = typeof req.query.status === "string" ? req.query.status : "";
    const validStatuses = ["pending", "paid", "failed", "refunded"];
    const page = Math.max(1, Math.min(10000, Number(req.query.page) || 1));
    const limit = 50;
    const clauses = [];
    const params = [];
    if (status && validStatuses.includes(status)) {
      clauses.push("p.status = ?");
      params.push(status);
    }
    const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
    if (search) {
      clauses.push("(p.reference LIKE ? ESCAPE '\\' OR a.application_number LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\')");
      const like = `%${escapeLike(search)}%`;
      params.push(like, like, like, like);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const summary = await db.get(`
      SELECT COUNT(*) AS count,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingCount,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paidCount,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failedCount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) AS paidMinorUnits
      FROM payments
    `);
    const payments = await db.all(`
      SELECT p.id, p.reference, p.amount, p.currency, p.status, p.channel,
        p.created_at AS createdAt, p.paid_at AS paidAt,
        a.application_number AS applicationNumber, u.name AS applicantName, u.email AS applicantEmail
      FROM payments p
      JOIN applications a ON a.id = p.application_id
      JOIN users u ON u.id = p.user_id
      ${where}
      ORDER BY p.created_at DESC LIMIT ? OFFSET ?
    `, ...params, limit, (page - 1) * limit);
    res.json({
      summary,
      payments: payments.map((payment) => ({
        ...payment,
        amountMajorUnits: payment.amount / 100,
      })),
      page,
      pageSize: limit,
      currency: (process.env.PAYSTACK_CURRENCY || "NGN").toUpperCase(),
    });
  });

  app.get("/api/admin/finance/export.csv", ...admin, async (req, res) => {
    const rows = await db.all(`
      SELECT p.reference, p.currency, p.amount, p.status, p.channel,
        p.created_at AS createdAt, p.paid_at AS paidAt,
        a.application_number AS applicationNumber, u.name AS applicantName, u.email AS applicantEmail
      FROM payments p
      JOIN applications a ON a.id = p.application_id
      JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
    `);
    const headers = ["reference", "application_number", "applicant_name", "applicant_email", "currency", "amount_minor_units", "status", "channel", "created_at", "paid_at"];
    const lines = [
      headers.map(csvField).join(","),
      ...rows.map((payment) => [
        payment.reference,
        payment.applicationNumber,
        payment.applicantName,
        payment.applicantEmail,
        payment.currency,
        payment.amount,
        payment.status,
        payment.channel || "",
        new Date(payment.createdAt).toISOString(),
        payment.paidAt ? new Date(payment.paidAt).toISOString() : "",
      ].map(csvField).join(",")),
    ];
    await audit(req.user.id, "admin.finance_exported", "payment", null, { count: rows.length });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="nlqi-payments.csv"');
    res.send(`\uFEFF${lines.join("\r\n")}`);
  });

  app.get("/api/admin/audit-logs", ...admin, async (req, res) => {
    const page = Math.max(1, Math.min(10000, Number(req.query.page) || 1));
    const limit = 50;
    const action = typeof req.query.action === "string" ? req.query.action.trim().slice(0, 120) : "";
    const actor = typeof req.query.actor === "string" ? req.query.actor.trim().slice(0, 120) : "";
    const clauses = [];
    const params = [];
    if (action) {
      clauses.push("l.action LIKE ? ESCAPE '\\'");
      params.push(`%${escapeLike(action)}%`);
    }
    if (actor) {
      clauses.push("(u.name LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\')");
      const like = `%${escapeLike(actor)}%`;
      params.push(like, like);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const logs = (await db.all(`
      SELECT l.id, l.action, l.entity_type AS entityType, l.entity_id AS entityId,
        l.details, l.created_at AS createdAt, u.id AS userId, u.name AS actorName, u.email AS actorEmail
      FROM audit_logs l LEFT JOIN users u ON u.id = l.user_id
      ${where}
      ORDER BY l.created_at DESC, l.id DESC LIMIT ? OFFSET ?
    `, ...params, limit, (page - 1) * limit)).map((log) => {
      let details = null;
      if (log.details) {
        try {
          details = JSON.parse(log.details);
        } catch {
          details = { unavailable: true };
        }
      }
      return { ...log, details };
    });
    const count = (await db.get(`SELECT COUNT(*) AS count FROM audit_logs l LEFT JOIN users u ON u.id = l.user_id ${where}`, ...params)).count;
    res.json({ logs, page, pageSize: limit, total: count });
  });

  app.get("/api/admin/settings", ...admin, (_req, res) => {
    res.json({
      environment: process.env.NODE_ENV || "development",
      appUrl,
      database: "SQLite",
      email: { configured: emailConfigured() },
      payments: {
        configured: Boolean(process.env.PAYSTACK_SECRET_KEY),
        provider: "Paystack",
        currency: (process.env.PAYSTACK_CURRENCY || "NGN").toUpperCase(),
        applicationFee: Number(process.env.APPLICATION_FEE || 5000),
      },
      sessions: { lifetimeDays: Number(process.env.SESSION_TTL_DAYS || 7), secureCookies: process.env.NODE_ENV === "production" },
      uploadLimitMb: 5,
      contactEmailConfigured: Boolean(process.env.CONTACT_EMAIL),
      configurationSource: ".env / process environment",
    });
  });

  app.get("/api/admin/content/:type", ...admin, async (req, res, next) => {
    const config = CONTENT_TABLES[req.params.type];
    if (!config) return next(apiError(404, "Content collection not found."));
    const adminFields = req.params.type === "blog"
      ? "id, title, slug, excerpt, body, image_url AS imageUrl, status, published_at AS publishedAt, created_at AS createdAt"
      : `*, ${req.params.type === "gallery" ? "image_url AS imageUrl, sort_order AS sortOrder" : "logo_url AS logoUrl, website_url AS websiteUrl, sort_order AS sortOrder"}`;
    const order = req.params.type === "blog" ? "updated_at DESC" : "sort_order ASC, id DESC";
    const items = await db.all(`SELECT ${adminFields} FROM ${config.table} ORDER BY ${order} LIMIT 250`);
    res.json({ items: items.map((row) => toPublicContent(req.params.type, row)) });
  });

  app.post("/api/admin/content/:type", ...admin, async (req, res, next) => {
    const config = CONTENT_TABLES[req.params.type];
    if (!config) return next(apiError(404, "Content collection not found."));
    try {
      const fields = normalizeContent(req.params.type, req.body, apiError);
      const now = Date.now();
      const columns = Object.keys(fields);
      const values = Object.values(fields);
      const extras = req.params.type === "blog" ? ["author_id", "published_at", "created_at", "updated_at"] : ["created_at", "updated_at"];
      const extraValues = req.params.type === "blog"
        ? [req.user.id, fields.status === "published" ? now : null, now, now]
        : [now, now];
      const result = await db.run(`
        INSERT INTO ${config.table} (${[...columns, ...extras].join(", ")})
        VALUES (${[...columns, ...extras].map(() => "?").join(", ")})
      `, ...values, ...extraValues);
      await audit(req.user.id, "admin.content_created", req.params.type, Number(result.lastInsertRowid));
      res.status(201).json({ message: "Content created.", id: Number(result.lastInsertRowid) });
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE" || error.code === "23505") return next(apiError(409, "That article slug is already in use."));
      next(error);
    }
  });

  app.patch("/api/admin/content/:type/:id", ...admin, async (req, res, next) => {
    const config = CONTENT_TABLES[req.params.type];
    const id = Number(req.params.id);
    if (!config) return next(apiError(404, "Content collection not found."));
    if (!Number.isSafeInteger(id) || id <= 0) return next(apiError(400, "Invalid content ID."));
    if (!await db.get(`SELECT id FROM ${config.table} WHERE id = ?`, id)) return next(apiError(404, "Content not found."));
    try {
      const fields = normalizeContent(req.params.type, req.body, apiError);
      const columns = Object.keys(fields);
      const assignments = columns.map((field) => {
        const column = field === "imageUrl" ? "image_url" :
          field === "logoUrl" ? "logo_url" :
            field === "websiteUrl" ? "website_url" :
              field === "sortOrder" ? "sort_order" : field;
        return `${column} = ?`;
      });
      const values = Object.values(fields);
      if (req.params.type === "blog") {
        assignments.push("published_at = CASE WHEN ? = 'published' THEN COALESCE(published_at, ?) ELSE NULL END");
        values.push(fields.status, Date.now());
      }
      assignments.push("updated_at = ?");
      values.push(Date.now(), id);
      await db.run(`UPDATE ${config.table} SET ${assignments.join(", ")} WHERE id = ?`, ...values);
      await audit(req.user.id, "admin.content_updated", req.params.type, id);
      res.json({ message: "Content updated." });
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE" || error.code === "23505") return next(apiError(409, "That article slug is already in use."));
      next(error);
    }
  });

  app.delete("/api/admin/content/:type/:id", ...admin, async (req, res, next) => {
    const config = CONTENT_TABLES[req.params.type];
    const id = Number(req.params.id);
    if (!config) return next(apiError(404, "Content collection not found."));
    if (!Number.isSafeInteger(id) || id <= 0) return next(apiError(400, "Invalid content ID."));
    const result = await db.run(`DELETE FROM ${config.table} WHERE id = ?`, id);
    if (!result.changes) return next(apiError(404, "Content not found."));
    await audit(req.user.id, "admin.content_deleted", req.params.type, id);
    res.json({ message: "Content deleted." });
  });
};

function csvField(value) {
  let text = value == null ? "" : String(value);
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function escapeLike(value) {
  return value.replace(/[\\%_]/g, "\\$&");
}
