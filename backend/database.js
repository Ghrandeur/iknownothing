const fs = require("node:fs");
const path = require("node:path");
const { AsyncLocalStorage } = require("node:async_hooks");

const usePostgres = Boolean(process.env.SUPABASE_DB_URL || process.env.VERCEL);
const transactions = new AsyncLocalStorage();

function normalizePostgresSql(sql) {
  return sql
    .replace(/\bCOLLATE\s+NOCASE\b/gi, "")
    .replace(/json_extract\(\s*((?:[A-Za-z_]\w*\.)?data_json)\s*,\s*'\$\.([A-Za-z0-9_]+)'\s*\)/g, "$1::jsonb ->> '$2'")
    .replace(/\bAS\s+([A-Za-z_][A-Za-z0-9_]*[A-Z][A-Za-z0-9_]*)\b/g, 'AS "$1"')
    .replace(/\?/g, (_match, offset) => `$${normalizePostgresSql.parameterIndex++}`);
}

let sqlite;
let pool;

if (usePostgres) {
  if (!process.env.SUPABASE_DB_URL) throw new Error("SUPABASE_DB_URL is required when running on Vercel.");
  const { Pool, types } = require("pg");
  types.setTypeParser(20, (value) => Number(value));
  pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: process.env.SUPABASE_DB_URL.includes("localhost") ? false : { rejectUnauthorized: true },
    max: Number(process.env.PG_POOL_MAX || 5),
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });
} else {
  const Database = require("better-sqlite3");
  const databasePath = path.resolve(process.env.DATABASE_FILE || "data/nlqi.sqlite");
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  sqlite = new Database(databasePath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'applicant'
        CHECK (role IN ('applicant', 'admin', 'judge')), status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended')), email_verified INTEGER NOT NULL DEFAULT 0,
      email_verify_hash TEXT, reset_token_hash TEXT, reset_expires INTEGER,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      application_number TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'pending', 'shortlisted', 'approved', 'rejected')),
      payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
      current_step INTEGER NOT NULL DEFAULT 1, data_json TEXT NOT NULL DEFAULT '{}',
      uploads_json TEXT NOT NULL DEFAULT '{}', submitted_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS applications_status ON applications(status);
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, reference TEXT NOT NULL UNIQUE,
      amount INTEGER NOT NULL, currency TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'failed', 'refunded')), channel TEXT, paid_at INTEGER,
      metadata_json TEXT, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, read INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS notifications_user_date ON notifications(user_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL, entity_type TEXT, entity_id INTEGER, details TEXT, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS judges (
      id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      bio TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS judge_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT, judge_id INTEGER NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
      application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL, created_at INTEGER NOT NULL, UNIQUE (judge_id, application_id)
    );
    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT, judge_id INTEGER NOT NULL REFERENCES judges(id) ON DELETE CASCADE,
      application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      criterion TEXT NOT NULL, score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 10),
      comment TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
      UNIQUE (judge_id, application_id, criterion)
    );
    CREATE INDEX IF NOT EXISTS scores_application ON scores(application_id);
    CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS blog_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
      excerpt TEXT NOT NULL DEFAULT '', body TEXT NOT NULL, image_url TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
      author_id INTEGER REFERENCES users(id) ON DELETE SET NULL, published_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS blog_posts_public ON blog_posts(status, published_at DESC);
    CREATE TABLE IF NOT EXISTS sponsors (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, logo_url TEXT NOT NULL DEFAULT '',
      website_url TEXT NOT NULL DEFAULT '', tier TEXT NOT NULL DEFAULT 'partner'
        CHECK (tier IN ('platinum', 'gold', 'silver', 'bronze', 'partner')),
      active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, logo_url TEXT NOT NULL DEFAULT '',
      website_url TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
  `);
}

async function execute(sql, params = [], kind = "run") {
  const client = transactions.getStore();
  if (usePostgres) {
    normalizePostgresSql.parameterIndex = 1;
    let queryText = normalizePostgresSql(sql);
    if (kind === "run" && /^\s*INSERT\b/i.test(queryText) && !/\bRETURNING\b/i.test(queryText)) {
      queryText += " RETURNING id";
    }
    const result = await (client || pool).query(queryText, params);
    if (kind === "all") return result.rows;
    if (kind === "get") return result.rows[0];
    return { changes: result.rowCount, id: result.rows[0]?.id ?? null, lastInsertRowid: result.rows[0]?.id ?? null };
  }
  const statement = sqlite.prepare(sql);
  if (kind === "all") return statement.all(...params);
  if (kind === "get") return statement.get(...params);
  const result = statement.run(...params);
  return { changes: result.changes, id: result.lastInsertRowid, lastInsertRowid: result.lastInsertRowid };
}

async function transaction(callback) {
  if (!usePostgres) {
    sqlite.exec("BEGIN");
    try {
      const value = await transactions.run(sqlite, callback);
      sqlite.exec("COMMIT");
      return value;
    } catch (error) {
      sqlite.exec("ROLLBACK");
      throw error;
    }
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const value = await transactions.run(client, callback);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  provider: usePostgres ? "Supabase Postgres" : "SQLite",
  get: (sql, ...params) => execute(sql, params, "get"),
  all: (sql, ...params) => execute(sql, params, "all"),
  run: (sql, ...params) => execute(sql, params, "run"),
  transaction,
  normalizePostgresSql,
  async health() {
    await execute("SELECT 1", [], "get");
    return true;
  },
  async close() {
    if (pool) await pool.end();
    if (sqlite) sqlite.close();
  },
};
