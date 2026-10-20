const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const projectRoot = path.resolve(__dirname, "..");

test("Vercel serves the public site and routes API requests to the Node function", () => {
  const config = JSON.parse(fs.readFileSync(path.join(projectRoot, "vercel.json"), "utf8"));
  assert.deepEqual(config.builds, [
    { src: "api/index.js", use: "@vercel/node" },
    { src: "public/**", use: "@vercel/static" },
  ]);
  assert.deepEqual(config.routes, [
    { src: "/api/(.*)", dest: "/api/index.js" },
    { src: "/", dest: "/public/index.html" },
    { src: "/apply/?$", dest: "/public/apply.html" },
    { src: "/register/?$", dest: "/public/register.html" },
    { src: "/login/?$", dest: "/public/login.html" },
    { src: "/verify/?$", dest: "/public/verify.html" },
    { src: "/track/?$", dest: "/public/track.html" },
    { src: "/admin/?$", dest: "/public/admin.html" },
    { src: "/judge/?$", dest: "/public/judge.html" },
    { src: "/forgot-password/?$", dest: "/public/forgot-password.html" },
    { src: "/reset-password/?$", dest: "/public/reset-password.html" },
    { src: "/contact/?$", dest: "/public/contact.html" },
    { src: "/privacy/?$", dest: "/public/privacy.html" },
    { src: "/blog/?$", dest: "/public/blog.html" },
    { src: "/blog-post/?$", dest: "/public/blog-post.html" },
    { src: "/gallery/?$", dest: "/public/gallery.html" },
    { src: "/(.*)", dest: "/public/$1" },
  ]);
  assert.equal(fs.existsSync(path.join(projectRoot, "public", "index.html")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, "api", "index.js")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, "server.js")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, "backend", "database.js")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, "package.json")), true);
  assert.equal(fs.existsSync(path.join(projectRoot, ".vercelignore")), true);
  const vercelIgnore = fs.readFileSync(path.join(projectRoot, ".vercelignore"), "utf8");
  for (const ignoredPath of [".env", "env2", "node_modules", "data", "uploads"]) {
    assert.match(vercelIgnore, new RegExp(`^${ignoredPath.replace(".", "\\.")}$`, "m"), `deployment should exclude ${ignoredPath}`);
  }
  assert.equal(config.builds.some(({ use }) => use === "@vercel/node"), true);
  for (const page of ["apply", "register", "login", "verify", "track", "admin", "judge", "forgot-password", "reset-password", "contact", "privacy", "blog", "blog-post", "gallery"]) {
    assert.ok(config.routes.some(({ src, dest }) => src === `/${page}/?$` && dest === `/public/${page}.html`), `missing clean URL route for /${page}`);
  }
});
