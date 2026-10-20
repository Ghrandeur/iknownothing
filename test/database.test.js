const assert = require("node:assert/strict");
const { after, test } = require("node:test");

const originalDatabaseUrl = process.env.SUPABASE_DB_URL;
process.env.SUPABASE_DB_URL = "postgresql://test:test@db.example.com:5432/nlqi";
const database = require("../backend/database");

after(async () => {
  await database.close();
  if (originalDatabaseUrl === undefined) delete process.env.SUPABASE_DB_URL;
  else process.env.SUPABASE_DB_URL = originalDatabaseUrl;
});

test("Postgres pool trusts the configured CA without disabling TLS verification", () => {
  const options = database.createPostgresPoolOptions(
    "postgresql://user:password@db.example.com:5432/nlqi?sslmode=require&application_name=nlqi",
    "-----BEGIN CERTIFICATE-----\\nroot-certificate\\n-----END CERTIFICATE-----",
  );
  const connectionUrl = new URL(options.connectionString);

  assert.equal(connectionUrl.searchParams.has("sslmode"), false);
  assert.equal(connectionUrl.searchParams.get("application_name"), "nlqi");
  assert.equal(options.ssl.rejectUnauthorized, true);
  assert.equal(options.ssl.ca, "-----BEGIN CERTIFICATE-----\nroot-certificate\n-----END CERTIFICATE-----");
});