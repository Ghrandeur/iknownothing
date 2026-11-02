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
  const healthBody = await json(health);
  assert.equal(healthBody.ok, true);
  assert.equal(healthBody.service, "nlqi-api");
  assert.equal(healthBody.database, "SQLite");
  assert.equal(typeof healthBody.adminConfigured, "boolean");
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

test("account creation stores participant details in the admin portal", async () => {
  const applicant = createClient();
  const registered = await applicant.request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test Applicant", phone: "+2348012345678", email: "applicant@example.test", password: "Strong-Test-Password-456" }),
  });
  assert.equal(registered.status, 201);
  assert.match((await json(registered)).message, /Account created/);
  const verificationToken = await waitForVerificationToken();
  assert.ok(verificationToken);
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
  const adminSeed = spawnSync(process.execPath, ["backend/seed-admin.js"], {
    cwd: projectRoot,
    encoding: "utf8",
    env: { ...process.env, DATABASE_FILE: databaseFile, ADMIN_EMAIL: "admin@example.test", ADMIN_PASSWORD: "Admin-Test-Password-8765", ADMIN_NAME: "Test Administrator" },
  });
  assert.equal(adminSeed.status, 0, adminSeed.stderr);
  const admin = createClient();
  const adminLogin = await admin.request("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@example.test", password: "Admin-Test-Password-8765" }),
  });
  assert.equal(adminLogin.status, 200);
  const users = await json(await admin.request("/api/admin/users"));
  const participant = users.users.find((user) => user.email === "applicant@example.test");
  assert.ok(participant);
  assert.equal(participant.name, "Test Applicant");
  assert.equal(participant.phone, "+2348012345678");
});
