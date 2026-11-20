const { randomUUID } = require("crypto");
const { getDb } = require("../config/db");

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    active: Boolean(row.active),
    failedLoginAttempts: row.failed_login_attempts,
    lockUntil: row.lock_until,
    refreshTokenHash: row.refresh_token_hash,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function findById(id) {
  return mapUser(getDb().prepare(`
    SELECT id, name, email, role, active, created_at, updated_at
    FROM users WHERE id = ?
  `).get(id));
}

function findByEmail(email) {
  return mapUser(getDb().prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE").get(email));
}

function findByIdWithSession(id) {
  return mapUser(getDb().prepare("SELECT * FROM users WHERE id = ?").get(id));
}

function findActiveAdmin(id) {
  return mapUser(getDb().prepare(`
    SELECT id, name, email, role, active, created_at, updated_at
    FROM users WHERE id = ? AND role = 'Admin' AND active = 1
  `).get(id));
}

function listActiveAdmins() {
  return getDb().prepare(`
    SELECT id, name, email, role, active FROM users WHERE role = 'Admin' AND active = 1 ORDER BY name
  `).all().map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: Boolean(row.active),
  }));
}

function countAdmins() {
  return getDb().prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'Admin'").get().count;
}

function listStudents() {
  return getDb().prepare(`
    SELECT id, name, email, active, created_at FROM users
    WHERE role = 'Student' ORDER BY created_at DESC
  `).all().map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: "Student",
    active: Boolean(row.active),
    createdAt: row.created_at,
  }));
}

function create({ name, email, passwordHash, role, active = true }) {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name.trim(), email.trim().toLowerCase(), passwordHash, role, active ? 1 : 0, now, now);
  return findById(id);
}

function updateLoginState(id, { failedLoginAttempts, lockUntil }) {
  const now = new Date().toISOString();
  getDb().prepare(`
    UPDATE users SET failed_login_attempts = ?, lock_until = ?, updated_at = ? WHERE id = ?
  `).run(failedLoginAttempts, lockUntil, now, id);
}

function setRefreshTokenHash(id, hash) {
  getDb().prepare("UPDATE users SET refresh_token_hash = ?, updated_at = ? WHERE id = ?")
    .run(hash, new Date().toISOString(), id);
}

function clearRefreshTokenHash(id) {
  getDb().prepare("UPDATE users SET refresh_token_hash = NULL, updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id);
}

module.exports = {
  findById, findByIdWithSession, findByEmail, findActiveAdmin, listActiveAdmins,
  countAdmins, listStudents, create, updateLoginState,
  setRefreshTokenHash, clearRefreshTokenHash,
};
