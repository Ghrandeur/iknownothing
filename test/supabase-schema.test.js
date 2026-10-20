const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");

const schema = fs.readFileSync(path.resolve(__dirname, "../supabase/schema.sql"), "utf8");

test("Supabase schema includes the private applicant uploads bucket and protected application tables", () => {
  assert.match(schema, /INSERT INTO storage\.buckets/i);
  assert.match(schema, /'nlqi-applicant-documents'\s*,\s*'nlqi-applicant-documents'\s*,\s*FALSE/i);
  assert.match(schema, /file_size_limit[\s\S]*5242880/i);
  assert.match(schema, /ARRAY\['image\/jpeg', 'image\/png', 'application\/pdf'\]/i);
  for (const table of ["users", "sessions", "applications", "payments", "notifications", "audit_logs", "judges", "judge_assignments", "scores", "gallery", "blog_posts", "sponsors", "partners"]) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`, "i"), `${table} table is defined`);
    assert.match(schema, new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`, "i"), `${table} has RLS enabled`);
  }
});
