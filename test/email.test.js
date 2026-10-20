const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..");

test("Gmail EMAIL_* settings configure SMTP transport and NLQI sender", () => {
  const result = spawnSync(process.execPath, ["-e", `
    const nodemailer = require("nodemailer");
    let transportOptions;
    nodemailer.createTransport = (options) => {
      transportOptions = options;
      return { sendMail: async (message) => ({ message }) };
    };
    const email = require("./backend/email");
    (async () => {
      if (!email.emailConfigured()) throw new Error("Gmail configuration was not detected.");
      const sent = await email.sendMail({ to: "applicant@example.test", subject: "Verify", text: "Verify", from: email.emailFrom() });
      console.log(JSON.stringify({
        host: transportOptions.host,
        port: transportOptions.port,
        secure: transportOptions.secure,
        authMethod: transportOptions.authMethod,
        user: transportOptions.auth.user,
        password: transportOptions.auth.pass,
        from: sent.message.from,
      }));
    })().catch((error) => { console.error(error); process.exitCode = 1; });
  `], {
    cwd: projectRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      NODE_ENV: "development",
      EMAIL_USER: "smtp-user@example.test",
      EMAIL_PASSWORD: "test-app-password",
      EMAIL_FROM: "NLQI",
      EMAIL_SMTP_HOST: "smtp.gmail.com",
      EMAIL_SMTP_PORT: "465",
      EMAIL_SMTP_SECURE: "true",
      EMAIL_SMTP_AUTH_METHOD: "PLAIN",
      SMTP_HOST: "",
      SMTP_USER: "",
      SMTP_PASS: "",
    },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    authMethod: "PLAIN",
    user: "smtp-user@example.test",
    password: "test-app-password",
    from: { name: "NLQI", address: "smtp-user@example.test" },
  });
});
