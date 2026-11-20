const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const env = require("./env");

let database;
let transactionDepth = 0;
let savepointId = 0;

const schema = `
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK(length(name) <= 100),
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('Student', 'Admin')),
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    lock_until TEXT,
    refresh_token_hash TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_users_role_name ON users(role, name);

  CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL CHECK(length(name) <= 100),
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    specialization TEXT NOT NULL CHECK(specialization IN ('academic', 'fee', 'certificate', 'hostel', 'other')),
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_staff_specialization_active ON staff(specialization, active, name);

  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    reference_id TEXT NOT NULL UNIQUE,
    student_id TEXT NOT NULL REFERENCES users(id),
    subject TEXT NOT NULL CHECK(length(subject) <= 160),
    category TEXT NOT NULL CHECK(category IN ('academic', 'fee', 'certificate', 'hostel', 'other')),
    priority TEXT NOT NULL CHECK(priority IN ('Low', 'Medium', 'High', 'Urgent')),
    description TEXT NOT NULL CHECK(length(description) <= 10000),
    status TEXT NOT NULL CHECK(status IN ('Pending', 'In Progress', 'Resolved', 'Rejected')),
    assigned_to TEXT REFERENCES users(id),
    assigned_staff_id TEXT REFERENCES staff(id),
    archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0, 1)),
    deleted INTEGER NOT NULL DEFAULT 0 CHECK(deleted IN (0, 1)),
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_requests_student_status ON requests(student_id, deleted, status, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_requests_filter ON requests(status, category, priority, created_at);
  CREATE INDEX IF NOT EXISTS idx_requests_assignee ON requests(assigned_to, deleted);
  CREATE INDEX IF NOT EXISTS idx_requests_reference ON requests(reference_id);

  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    uploaded_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS replies (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id),
    assigned_staff_id TEXT REFERENCES staff(id),
    message TEXT NOT NULL CHECK(length(message) <= 5000),
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS internal_notes (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id),
    note TEXT NOT NULL CHECK(length(note) <= 5000),
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS timeline (
    id TEXT PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK(type IN ('Submitted', 'Status', 'Assignment', 'Reply', 'Note', 'Archive', 'Delete')),
    status TEXT CHECK(status IS NULL OR status IN ('Pending', 'In Progress', 'Resolved', 'Rejected')),
    detail TEXT NOT NULL CHECK(length(detail) <= 1000),
    actor_id TEXT NOT NULL REFERENCES users(id),
    at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_timeline_request_date ON timeline(request_id, at);

  CREATE TABLE IF NOT EXISTS audits (
    id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL REFERENCES users(id),
    action TEXT NOT NULL,
    request_id TEXT REFERENCES requests(id),
    reference_id TEXT,
    details TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_audits_request_date ON audits(request_id, created_at);
`;

function resolveDatabasePath() {
  if (env.databasePath === ":memory:") return env.databasePath;
  return path.resolve(__dirname, "../..", env.databasePath);
}

function getDb() {
  if (database) return database;
  const file = resolveDatabasePath();
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  database = new DatabaseSync(file);
  database.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  if (file !== ":memory:") database.exec("PRAGMA journal_mode = WAL;");
  database.exec(schema);
  const ensureColumn = (table, column, definition) => {
    const columns = database.prepare(`PRAGMA table_info(${table})`).all();
    if (!columns.some((entry) => entry.name === column)) {
      database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  };
  ensureColumn("requests", "assigned_staff_id", "TEXT REFERENCES staff(id)");
  ensureColumn("replies", "assigned_staff_id", "TEXT REFERENCES staff(id)");
  database.exec("CREATE INDEX IF NOT EXISTS idx_requests_assigned_staff ON requests(assigned_staff_id, deleted)");
  return database;
}

function closeDb() {
  if (database) {
    database.close();
    database = undefined;
    transactionDepth = 0;
  }
}

function transaction(callback) {
  const db = getDb();
  const nested = transactionDepth > 0;
  const savepoint = `nested_${++savepointId}`;
  db.exec(nested ? `SAVEPOINT ${savepoint}` : "BEGIN IMMEDIATE");
  transactionDepth += 1;
  try {
    const result = callback();
    db.exec(nested ? `RELEASE SAVEPOINT ${savepoint}` : "COMMIT");
    return result;
  } catch (error) {
    db.exec(nested ? `ROLLBACK TO SAVEPOINT ${savepoint}; RELEASE SAVEPOINT ${savepoint}` : "ROLLBACK");
    throw error;
  } finally {
    transactionDepth -= 1;
  }
}

async function connectDatabase() {
  return getDb();
}

async function disconnectDatabase() {
  closeDb();
}

module.exports = { getDb, closeDb, transaction, connectDatabase, disconnectDatabase };
