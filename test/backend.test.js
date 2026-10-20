const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const { once } = require("node:events");
const fs = require("node:fs");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "nlqi-backend-test-"));
const databaseFile = path.join(tempRoot, "nlqi.sqlite");
const uploads = path.join(tempRoot, "uploads");
let origin;
let serverProcess;
let serverOutput = "";

async function unusedPort() {
  const server = net.createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForServer() {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/api/health`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`NLQI server did not start. Output: ${serverOutput}`);
}

function createClient() {
  const cookies = new Map();
  let csrfToken = "";
  const updateCookies = (response) => {
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const separator = pair.indexOf("=");
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  };
  const cookieHeader = () => [...cookies].map(([key, value]) => `${key}=${value}`).join("; ");
  const csrf = async () => {
    const response = await fetch(`${origin}/api/csrf`);
    updateCookies(response);
    csrfToken = (await response.json()).token;
  };
  const request = async (url, options = {}) => {
    const method = (options.method || "GET").toUpperCase();
    if (!["GET", "HEAD"].includes(method) && !csrfToken) await csrf();
    const headers = new Headers(options.headers || {});
    if (cookieHeader()) headers.set("Cookie", cookieHeader());
    if (!["GET", "HEAD"].includes(method)) headers.set("X-CSRF-Token", csrfToken);
    const response = await fetch(`${origin}${url}`, { ...options, headers });
    updateCookies(response);
    return response;
  };
  return { request, csrf, cookies };
}

async function json(response) {
  return response.json();
}

async function waitForVerificationToken() {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    const token = serverOutput.match(/verify\?token=([a-f0-9]{64})/)?.[1];
    if (token) return token;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return null;
}

async function waitForPasswordSetupToken() {
  const deadline = Date.now() + 2000;
  while (Date.now() < deadline) {
    const token = serverOutput.match(/reset-password\?token=([a-f0-9]{64})/)?.[1];
    if (token) return token;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return null;
}

before(async () => {
  const port = await unusedPort();
  origin = `http://127.0.0.1:${port}`;
  serverProcess = spawn(process.execPath, ["server.js"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: "test",
      HOST: "127.0.0.1",
      PORT: String(port),
      APP_URL: origin,
      DATABASE_FILE: databaseFile,
      UPLOAD_DIR: uploads,
      SMTP_HOST: "",
      SMTP_USER: "",
      SMTP_PASS: "",
      CONTACT_EMAIL: "contact@example.test",
      PAYSTACK_SECRET_KEY: "",
      ADMIN_EMAIL: "admin@example.test",
      ADMIN_PASSWORD: "Admin-Test-Password-8765",
      ADMIN_NAME: "Test Administrator",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  serverProcess.stdout.on("data", (chunk) => { serverOutput += chunk.toString(); });
  serverProcess.stderr.on("data", (chunk) => { serverOutput += chunk.toString(); });
  await waitForServer();
});

after(async () => {
  if (serverProcess && serverProcess.exitCode === null) {
    serverProcess.kill("SIGTERM");
    await once(serverProcess, "close");
  }
  fs.rmSync(tempRoot, { recursive: true, force: true });
});

test("static site and health endpoint are served", async () => {
  const health = await fetch(`${origin}/api/health`);
  assert.deepEqual(await json(health), { ok: true, service: "nlqi-api", database: "SQLite" });
  const homepage = await fetch(origin);
  assert.equal(homepage.status, 200);
  assert.match(await homepage.text(), /Nigeria Legacy Queen International/);
  const contactPage = await fetch(`${origin}/contact.html`);
  assert.equal(contactPage.status, 200);
  assert.match(await contactPage.text(), /Send message/);
  const cleanRegisterPage = await fetch(`${origin}/register`);
  assert.equal(cleanRegisterPage.status, 200);
  assert.match(await cleanRegisterPage.text(), /Create your applicant account/);
  const cleanContactPage = await fetch(`${origin}/contact`);
  assert.equal(cleanContactPage.status, 200);
  assert.match(await cleanContactPage.text(), /Send message/);
});

test("applicant verification, 48-field application, admin review, exports and access control", async () => {
  const applicant = createClient();
  const contact = createClient();
  const contactMessage = await contact.request("/api/contact", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test Contact",
      email: "contact-sender@example.test",
      message: "I would like to learn more about NLQI partnerships.",
    }),
  });
  assert.equal(contactMessage.status, 202);
  assert.match((await json(contactMessage)).message, /sent/);
  const applyPage = fs.readFileSync(path.join(projectRoot, "public/apply.html"), "utf8");
  const formMarkup = applyPage.match(/<form id="application-form">([\s\S]*?)<\/form>/)?.[1] || "";
  const fieldsInForm = [...formMarkup.matchAll(/name="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((name) => !["termsAgreed", "headshot", "fullBody", "identityDocument"].includes(name));
  assert.equal(fieldsInForm.length, 48, fieldsInForm.join(", "));
  assert.equal(new Set(fieldsInForm).size, 48);

  const registered = await applicant.request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test Applicant", email: "applicant@example.test", password: "Strong-Test-Password-456" }),
  });
  assert.equal(registered.status, 201);
  assert.match((await json(registered)).message, /Account created/);
  const verificationToken = await waitForVerificationToken();
  assert.ok(verificationToken, "development email should print a verification URL");

  const verification = await applicant.request("/api/auth/verify-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: verificationToken }),
  });
  assert.equal(verification.status, 200);

  const login = await applicant.request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "applicant@example.test", password: "Strong-Test-Password-456" }),
  });
  assert.equal(login.status, 200);
  assert.ok(applicant.cookies.has("nlqi_session"));
  assert.ok(applicant.cookies.has("nlqi_csrf"), "login must preserve the CSRF cookie");

  const answers = Object.fromEntries(fieldsInForm.map((key) => [key, `Answer for ${key}`]));
  Object.assign(answers, {
    firstName: "Test",
    lastName: "Applicant",
    phone: "+2348012345678",
    dateOfBirth: "1998-08-10",
    state: "Lagos",
    motivation: "I want to build a stronger community through purposeful leadership.",
    experience: "Mentorship and community service have shaped my work and aspirations.",
    advocacy: "Education",
    impactIdea: "I will support accessible learning and leadership opportunities for young women.",
  });
  const formBody = (withDeclaration) => {
    const form = new FormData();
    form.set("data", JSON.stringify(answers));
    form.set("currentStep", "4");
    form.set("termsAgreed", withDeclaration ? "true" : "false");
    form.set("headshot", new Blob([Buffer.from([0xff, 0xd8, 0xff, 0x00])], { type: "image/jpeg" }), "portrait.jpg");
    return form;
  };
  const saved = await applicant.request("/api/applications/me", { method: "PUT", body: formBody(false) });
  assert.equal(saved.status, 200);
  const draft = await json(await applicant.request("/api/applications/me"));
  assert.equal(Object.keys(draft.application.data).length, 48);
  assert.deepEqual(draft.application.uploads, ["headshot"]);

  const submitted = await applicant.request("/api/applications/me/submit", {
    method: "POST",
    body: formBody(true),
  });
  assert.equal(submitted.status, 201);
  const submission = await json(submitted);
  assert.equal(submission.application.status, "pending");

  const payment = await applicant.request("/api/payments/initialize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(payment.status, 503);

  const adminSeed = spawnSync(process.execPath, ["backend/seed-admin.js"], {
    cwd: projectRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      DATABASE_FILE: databaseFile,
      ADMIN_EMAIL: "admin@example.test",
      ADMIN_PASSWORD: "Admin-Test-Password-8765",
      ADMIN_NAME: "Test Administrator",
    },
  });
  assert.equal(adminSeed.status, 0, adminSeed.stderr);

  const admin = createClient();
  const adminLogin = await admin.request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@example.test", password: "Admin-Test-Password-8765" }),
  });
  assert.equal(adminLogin.status, 200);
  const settings = await json(await admin.request("/api/admin/settings"));
  assert.equal(settings.database, "SQLite");
  assert.equal(settings.email.configured, false);
  assert.equal(settings.contactEmailConfigured, true);
  assert.equal(Object.hasOwn(settings, "PAYSTACK_SECRET_KEY"), false);
  const metrics = await json(await admin.request("/api/admin/metrics"));
  assert.equal(metrics.pending, 1);
  const listing = await json(await admin.request("/api/admin/applications"));
  assert.equal(listing.applications.length, 1);
  assert.equal(listing.applications[0].data.advocacy, "Education");

  const paymentFixture = spawnSync(process.execPath, ["-e", `
    const db = require("./backend/database");
    (async () => {
      const app = await db.get("SELECT id, user_id, application_number FROM applications LIMIT 1");
      await db.run("INSERT INTO payments (application_id, user_id, reference, amount, currency, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        app.id, app.user_id, "NLQI-TEST-PENDING", 500000, "NGN", "pending", Date.now());
      await db.close();
    })().catch((error) => { console.error(error); process.exitCode = 1; });
  `], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, DATABASE_FILE: databaseFile },
  });
  assert.equal(paymentFixture.status, 0, paymentFixture.stderr);
  const finance = await json(await admin.request("/api/admin/finance?status=pending&search=TEST-PENDING"));
  assert.equal(finance.summary.pendingCount, 1);
  assert.equal(finance.payments[0].amountMajorUnits, 5000);
  const financeExport = await admin.request("/api/admin/finance/export.csv");
  assert.equal(financeExport.status, 200);
  assert.match(await financeExport.text(), /NLQI-TEST-PENDING/);

  const document = await admin.request(`/api/admin/applications/${listing.applications[0].id}/documents/headshot`);
  assert.equal(document.status, 200);
  assert.equal(document.headers.get("content-type"), "image/jpeg");

  const changedStatus = await admin.request(`/api/admin/applications/${listing.applications[0].id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "shortlisted" }),
  });
  assert.equal(changedStatus.status, 200);

  const contentCreate = await admin.request("/api/admin/content/blog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Purpose in practice",
      slug: "purpose-in-practice",
      excerpt: "A story from the NLQI community.",
      body: "Leadership starts with listening.\n\nPurpose grows through action.",
      imageUrl: "/images/nlqi-hero.jpg",
      status: "published",
    }),
  });
  assert.equal(contentCreate.status, 201);
  const publicPosts = await json(await fetch(`${origin}/api/content/blog`));
  assert.equal(publicPosts.items[0].slug, "purpose-in-practice");
  const publicPost = await json(await fetch(`${origin}/api/content/blog/purpose-in-practice`));
  assert.match(publicPost.post.body, /Leadership starts with listening/);

  const galleryCreate = await admin.request("/api/admin/content/gallery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Community mentorship",
      description: "A mentorship gathering.",
      imageUrl: "/images/women-development.jpg",
      active: true,
      sortOrder: 1,
    }),
  });
  assert.equal(galleryCreate.status, 201);
  const publicGallery = await json(await fetch(`${origin}/api/content/gallery`));
  assert.equal(publicGallery.items[0].title, "Community mentorship");

  const inviteJudge = await admin.request("/api/admin/judges", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test Judge", email: "judge@example.test", bio: "Community leadership mentor." }),
  });
  assert.equal(inviteJudge.status, 201);
  const setupToken = await waitForPasswordSetupToken();
  assert.ok(setupToken, "development judge invitation should print a password setup link");
  const judgeClient = createClient();
  const setJudgePassword = await judgeClient.request("/api/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: setupToken, password: "Strong-Judge-Password-789" }),
  });
  assert.equal(setJudgePassword.status, 200);
  const judgeLogin = await judgeClient.request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "judge@example.test", password: "Strong-Judge-Password-789" }),
  });
  assert.equal((await json(judgeLogin)).user.role, "judge");

  const assigned = await admin.request(`/api/admin/judges/${(await json(inviteJudge)).judgeId}/assignments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ applicationId: listing.applications[0].id }),
  });
  assert.equal(assigned.status, 201);
  const judgeQueue = await json(await judgeClient.request("/api/judge/assignments"));
  assert.equal(judgeQueue.assignments.length, 1);
  assert.equal(judgeQueue.assignments[0].applicationNumber, submission.application.applicationNumber);
  const scoreResponse = await judgeClient.request(`/api/judge/assignments/${listing.applications[0].id}/scores`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scores: { advocacy: 8, communication: 7, confidence: 9, leadership: 8, purpose: 10, presentation: 7 },
      comments: { leadership: "Shows promise as a community leader." },
    }),
  });
  assert.equal(scoreResponse.status, 200);
  const scoreSummary = await json(await admin.request("/api/admin/scoring"));
  assert.equal(scoreSummary.applications[0].judgesScored, 1);
  assert.equal(scoreSummary.applications[0].averageScore, 8.17);

  const analytics = await json(await admin.request("/api/admin/analytics"));
  assert.equal(analytics.byState[0][0], "Lagos");
  assert.equal(analytics.total, 1);

  const users = await json(await admin.request("/api/admin/users"));
  const judgeRecord = users.users.find((user) => user.email === "judge@example.test");
  assert.ok(judgeRecord);
  const suspendJudge = await admin.request(`/api/admin/users/${judgeRecord.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "suspended" }),
  });
  assert.equal(suspendJudge.status, 200);
  const inactiveJudgeAssignments = await judgeClient.request("/api/judge/assignments");
  assert.equal(inactiveJudgeAssignments.status, 401);
  const reactivateJudge = await admin.request(`/api/admin/users/${judgeRecord.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "active" }),
  });
  assert.equal(reactivateJudge.status, 200);

  const exported = await admin.request("/api/admin/applications/export.csv");
  assert.equal(exported.status, 200);
  assert.match(await exported.text(), /applicant@example\.test/);
  const applicantForbidden = await applicant.request("/api/admin/metrics");
  assert.equal(applicantForbidden.status, 403);
  const logs = await json(await admin.request("/api/admin/audit-logs?action=application_status_changed"));
  assert.ok(logs.logs.some((log) => log.action === "admin.application_status_changed"));

  const notifications = await json(await applicant.request("/api/notifications"));
  assert.ok(notifications.notifications.some((item) => item.title === "Application Shortlisted"));

  const csrfRejected = await fetch(`${origin}/api/admin/content/gallery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(csrfRejected.status, 403);
});
