const { randomUUID } = require("crypto");
const { getDb, transaction } = require("../config/db");

function create({ referenceId, studentId, subject, category, priority, description, file }) {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  const insertRequest = db.prepare(`
    INSERT INTO requests
      (id, reference_id, student_id, subject, category, priority, description, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)
  `);
  const insertTimeline = db.prepare(`
    INSERT INTO timeline (id, request_id, type, status, detail, actor_id, at)
    VALUES (?, ?, 'Submitted', 'Pending', 'Request submitted', ?, ?)
  `);
  const insertAttachment = db.prepare(`
    INSERT INTO attachments (id, request_id, file_name, original_name, mime_type, size, storage_path, uploaded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  transaction(() => {
    insertRequest.run(id, referenceId, studentId, subject, category, priority, description, now, now);
    insertTimeline.run(randomUUID(), id, studentId, now);
    if (file) insertAttachment.run(randomUUID(), id, file.filename, file.originalname, file.mimetype, file.size, file.path, now);
  });
  return id;
}

function findByReference(referenceId, { studentId, includeDeleted = false } = {}) {
  let sql = "SELECT * FROM requests WHERE reference_id = ?";
  const params = [referenceId];
  if (studentId) {
    sql += " AND student_id = ?";
    params.push(studentId);
  }
  if (!includeDeleted) sql += " AND deleted = 0";
  return getDb().prepare(sql).get(...params) || null;
}

function existsReference(referenceId) {
  return Boolean(getDb().prepare("SELECT 1 FROM requests WHERE reference_id = ?").get(referenceId));
}

function softDelete(referenceId, actorId) {
  const db = getDb();
  const row = findByReference(referenceId);
  if (!row) return null;
  const now = new Date().toISOString();
  transaction(() => {
    db.prepare("UPDATE requests SET deleted = 1, deleted_at = ?, updated_at = ? WHERE id = ?").run(now, now, row.id);
    db.prepare(`
      INSERT INTO timeline (id, request_id, type, detail, actor_id, at)
      VALUES (?, ?, 'Delete', 'Request soft deleted', ?, ?)
    `).run(randomUUID(), row.id, actorId, now);
    db.prepare(`
      INSERT INTO audits (id, actor_id, action, request_id, reference_id, details, created_at)
      VALUES (?, ?, 'REQUEST_SOFT_DELETED', ?, ?, ?, ?)
    `).run(randomUUID(), actorId, row.id, referenceId, JSON.stringify({ deletedAt: now }), now);
  });
  return { id: referenceId, deleted: true };
}

module.exports = { create, findByReference, existsReference, softDelete };
