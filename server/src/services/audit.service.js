const { randomUUID } = require("crypto");
const { getDb } = require("../config/db");

function recordAudit({ actor, action, request = null, referenceId = null, details = {} }) {
  getDb().prepare(`
    INSERT INTO audits (id, actor_id, action, request_id, reference_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    randomUUID(),
    actor,
    action,
    request,
    referenceId,
    JSON.stringify(details),
    new Date().toISOString(),
  );
}

module.exports = { recordAudit };
