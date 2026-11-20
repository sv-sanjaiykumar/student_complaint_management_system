const { randomUUID } = require("crypto");
const { getDb } = require("../config/db");

function mapStaff(row, includeEmail = false) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    ...(includeEmail && { email: row.email }),
    specialization: row.specialization,
    active: Boolean(row.active),
  };
}

function findActiveById(id) {
  return mapStaff(getDb().prepare(`
    SELECT id, name, email, specialization, active
    FROM staff WHERE id = ? AND active = 1
  `).get(id), true);
}

function findByEmail(email) {
  return mapStaff(getDb().prepare(`
    SELECT id, name, email, specialization, active FROM staff WHERE email = ? COLLATE NOCASE
  `).get(email), true);
}

function listActive() {
  return getDb().prepare(`
    SELECT id, name, email, specialization, active
    FROM staff WHERE active = 1 ORDER BY specialization, name
  `).all().map((row) => mapStaff(row, true));
}

function create({ name, email, specialization }) {
  const id = randomUUID();
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO staff (id, name, email, specialization, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, 1, ?, ?)
  `).run(id, name.trim(), email.trim().toLowerCase(), specialization, now, now);
  return findByEmail(email);
}

module.exports = { findActiveById, findByEmail, listActive, create };
