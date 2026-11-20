const crypto = require("crypto");
const { getDb, transaction } = require("../config/db");
const Request = require("../models/Request");
const Staff = require("../models/Staff");
const ApiError = require("../utils/apiError");
const { recordAudit } = require("./audit.service");

const SORT_COLUMNS = {
  createdAt: "r.created_at",
  updatedAt: "r.updated_at",
  priority: "r.priority",
  status: "r.status",
  subject: "r.subject",
};

function generateReferenceId() {
  return `REQ-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function uniqueReferenceId() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const referenceId = generateReferenceId();
    if (!Request.existsReference(referenceId)) return referenceId;
  }
  throw new ApiError(500, "REFERENCE_GENERATION_FAILED", "Could not generate a request reference");
}

function mapRequestRow(row, includeInternal = false) {
  if (!row) return null;
  const db = getDb();
  const replies = db.prepare(`
    SELECT replies.id, replies.message, replies.created_at,
      users.id AS author_id, users.name AS author_name, users.role AS author_role,
      specialist.id AS specialist_id, specialist.name AS specialist_name,
      specialist.specialization AS specialist_specialization
    FROM replies JOIN users ON users.id = replies.author_id
    LEFT JOIN staff specialist ON specialist.id = replies.assigned_staff_id
    WHERE replies.request_id = ? ORDER BY replies.created_at
  `).all(row.id).map((reply) => ({
    id: reply.id,
    author: { id: reply.author_id, name: reply.author_name, role: reply.author_role },
    assignedStaff: reply.specialist_id ? {
      id: reply.specialist_id,
      name: reply.specialist_name,
      specialization: reply.specialist_specialization,
    } : null,
    message: reply.message,
    createdAt: reply.created_at,
  }));
  const attachments = db.prepare(`
    SELECT id, file_name, original_name, mime_type, size, uploaded_at
    FROM attachments WHERE request_id = ? ORDER BY uploaded_at
  `).all(row.id).map((attachment) => ({
    id: attachment.id,
    fileName: attachment.file_name,
    originalName: attachment.original_name,
    mimeType: attachment.mime_type,
    size: attachment.size,
    uploadedAt: attachment.uploaded_at,
  }));
  const timeline = db.prepare(`
    SELECT timeline.type, timeline.status, timeline.detail, timeline.at,
      users.id AS actor_id, users.name AS actor_name, users.role AS actor_role
    FROM timeline JOIN users ON users.id = timeline.actor_id
    WHERE timeline.request_id = ? ORDER BY timeline.at, timeline.rowid
  `).all(row.id).map((entry) => ({
    type: entry.type,
    status: entry.status,
    detail: entry.detail,
    actor: { id: entry.actor_id, name: entry.actor_name, role: entry.actor_role },
    at: entry.at,
    date: entry.at,
  }));

  const result = {
    id: row.reference_id,
    referenceId: row.reference_id,
    studentId: row.student_id,
    studentName: row.student_name,
    studentEmail: row.student_email,
    student: { id: row.student_id, name: row.student_name, email: row.student_email, role: "Student" },
    subject: row.subject,
    category: row.category,
    priority: row.priority,
    description: row.description,
    status: row.status,
    assignedTo: row.assigned_to
      ? { id: row.assigned_to, name: row.assignee_name, email: row.assignee_email, role: "Admin" }
      : null,
    assignedStaff: row.assigned_staff_id ? {
      id: row.assigned_staff_id,
      name: row.assigned_staff_name,
      specialization: row.assigned_staff_specialization,
    } : null,
    attachments,
    attachment: attachments[0] ? {
      id: attachments[0].id,
      name: attachments[0].originalName,
      size: `${Math.max(1, Math.round(attachments[0].size / 1024))} KB`,
      type: attachments[0].mimeType,
    } : null,
    replies,
    timeline,
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  if (includeInternal) {
    result.internalNotes = db.prepare(`
      SELECT internal_notes.id, internal_notes.note, internal_notes.created_at,
        users.id AS author_id, users.name AS author_name, users.role AS author_role
      FROM internal_notes JOIN users ON users.id = internal_notes.author_id
      WHERE internal_notes.request_id = ? ORDER BY internal_notes.created_at
    `).all(row.id).map((note) => ({
      id: note.id,
      author: { id: note.author_id, name: note.author_name, role: note.author_role },
      note: note.note,
      createdAt: note.created_at,
    }));
    result.notes = result.internalNotes.map((note) => note.note);
  }
  return result;
}

function findRow(referenceId, { studentId, includeDeleted = false } = {}) {
  const clauses = ["r.reference_id = ?"];
  const values = [referenceId];
  if (studentId) {
    clauses.push("r.student_id = ?");
    values.push(studentId);
  }
  if (!includeDeleted) clauses.push("r.deleted = 0");
  return getDb().prepare(`
    SELECT r.*, student.name AS student_name, student.email AS student_email,
      assignee.name AS assignee_name, assignee.email AS assignee_email,
      specialist.name AS assigned_staff_name,
      specialist.specialization AS assigned_staff_specialization
    FROM requests r
    JOIN users student ON student.id = r.student_id
    LEFT JOIN users assignee ON assignee.id = r.assigned_to
    LEFT JOIN staff specialist ON specialist.id = r.assigned_staff_id
    WHERE ${clauses.join(" AND ")}
  `).get(...values);
}

function toIso(value) {
  return value instanceof Date ? value.toISOString() : value;
}

function buildFilters(query, studentId) {
  const where = ["r.deleted = 0"];
  const params = [];
  if (studentId) {
    where.push("r.student_id = ?");
    params.push(studentId);
  }
  for (const [field, column] of [["status", "r.status"], ["category", "r.category"], ["priority", "r.priority"]]) {
    if (query[field]) {
      where.push(`${column} = ?`);
      params.push(query[field]);
    }
  }
  if (query.dateFrom) {
    where.push("r.created_at >= ?");
    params.push(toIso(query.dateFrom));
  }
  if (query.dateTo) {
    where.push("r.created_at <= ?");
    params.push(toIso(query.dateTo));
  }
  if (query.search && !studentId) {
    const pattern = `%${query.search.replace(/[\\%_]/g, "\\$&")}%`;
    where.push(`(
      r.reference_id LIKE ? ESCAPE '\\' COLLATE NOCASE
      OR r.subject LIKE ? ESCAPE '\\' COLLATE NOCASE
      OR r.student_id IN (
        SELECT id FROM users WHERE role = 'Student' AND name LIKE ? ESCAPE '\\' COLLATE NOCASE
      )
    )`);
    params.push(pattern, pattern, pattern);
  }
  return { where: where.join(" AND "), params };
}

function listRequests(query, studentId = null) {
  const db = getDb();
  const { where, params } = buildFilters(query, studentId);
  const page = query.page || 1;
  const pageSize = query.pageSize || 10;
  const sortBy = SORT_COLUMNS[query.sortBy] || SORT_COLUMNS.createdAt;
  const sortOrder = query.sortOrder === "asc" ? "ASC" : "DESC";
  const offset = (page - 1) * pageSize;
  const rows = db.prepare(`
    SELECT r.*, student.name AS student_name, student.email AS student_email,
      assignee.name AS assignee_name, assignee.email AS assignee_email,
      specialist.name AS assigned_staff_name,
      specialist.specialization AS assigned_staff_specialization
    FROM requests r
    JOIN users student ON student.id = r.student_id
    LEFT JOIN users assignee ON assignee.id = r.assigned_to
    LEFT JOIN staff specialist ON specialist.id = r.assigned_staff_id
    WHERE ${where}
    ORDER BY ${sortBy} ${sortOrder}, r.id ${sortOrder}
    LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset);
  const total = db.prepare(`SELECT COUNT(*) AS count FROM requests r WHERE ${where}`).get(...params).count;
  return {
    items: rows.map((row) => mapRequestRow(row)),
    pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
  };
}

async function createRequest(studentId, body, file) {
  const referenceId = uniqueReferenceId();
  const db = getDb();
  transaction(() => {
    const requestId = Request.create({
      referenceId,
      studentId,
      subject: body.subject,
      category: body.category,
      priority: body.priority,
      description: body.description,
      file,
    });
    recordAudit({ actor: studentId, action: "REQUEST_CREATED", request: requestId, referenceId });
  });
  return mapRequestRow(findRow(referenceId));
}

async function listStudentRequests(studentId, query) {
  return listRequests(query, studentId);
}

async function getStudentRequest(studentId, referenceId) {
  const row = findRow(referenceId, { studentId });
  if (!row) throw new ApiError(404, "REQUEST_NOT_FOUND", "Request not found");
  return mapRequestRow(row);
}

async function getAdminRequest(referenceId) {
  const row = findRow(referenceId);
  if (!row) throw new ApiError(404, "REQUEST_NOT_FOUND", "Request not found");
  return mapRequestRow(row, true);
}

async function listAdminRequests(query) {
  return listRequests(query);
}

async function studentDashboard(studentId) {
  const db = getDb();
  const statusCounts = db.prepare(`
    SELECT status, COUNT(*) AS count FROM requests
    WHERE student_id = ? AND deleted = 0 GROUP BY status
  `).all(studentId);
  const counts = Object.fromEntries(["Pending", "In Progress", "Resolved", "Rejected"].map((status) => [status, 0]));
  statusCounts.forEach((row) => { counts[row.status] = row.count; });
  const recent = db.prepare(`
    SELECT r.*, student.name AS student_name, student.email AS student_email,
      assignee.name AS assignee_name, assignee.email AS assignee_email,
      specialist.name AS assigned_staff_name,
      specialist.specialization AS assigned_staff_specialization
    FROM requests r JOIN users student ON student.id = r.student_id
    LEFT JOIN users assignee ON assignee.id = r.assigned_to
    LEFT JOIN staff specialist ON specialist.id = r.assigned_staff_id
    WHERE r.student_id = ? AND r.deleted = 0
    ORDER BY r.updated_at DESC LIMIT 4
  `).all(studentId);
  return { counts, recent: recent.map((row) => mapRequestRow(row)) };
}

async function adminDashboard() {
  const db = getDb();
  const counts = db.prepare(`
    SELECT COUNT(*) AS total,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS in_progress,
      SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) AS resolved,
      SUM(CASE WHEN priority = 'Urgent' AND status != 'Resolved' THEN 1 ELSE 0 END) AS urgent
    FROM requests WHERE deleted = 0
  `).get();
  const recent = db.prepare(`
    SELECT r.*, student.name AS student_name, student.email AS student_email,
      assignee.name AS assignee_name, assignee.email AS assignee_email,
      specialist.name AS assigned_staff_name,
      specialist.specialization AS assigned_staff_specialization
    FROM requests r JOIN users student ON student.id = r.student_id
    LEFT JOIN users assignee ON assignee.id = r.assigned_to
    LEFT JOIN staff specialist ON specialist.id = r.assigned_staff_id
    WHERE r.deleted = 0 ORDER BY r.updated_at DESC LIMIT 6
  `).all();
  return {
    counts: {
      total: counts.total || 0,
      pending: counts.pending || 0,
      inProgress: counts.in_progress || 0,
      resolved: counts.resolved || 0,
      urgent: counts.urgent || 0,
    },
    recent: recent.map((row) => mapRequestRow(row)),
  };
}

function requireRequest(referenceId) {
  const row = findRow(referenceId);
  if (!row) throw new ApiError(404, "REQUEST_NOT_FOUND", "Request not found");
  return row;
}

function appendTimeline(requestId, type, detail, actorId, status = null) {
  getDb().prepare(`
    INSERT INTO timeline (id, request_id, type, status, detail, actor_id, at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), requestId, type, status, detail, actorId, new Date().toISOString());
}

async function changeStatus(referenceId, status, actorId) {
  const row = requireRequest(referenceId);
  if (row.status === status) return mapRequestRow(row, true);
  const db = getDb();
  const now = new Date().toISOString();
  transaction(() => {
    db.prepare("UPDATE requests SET status = ?, updated_at = ? WHERE id = ?").run(status, now, row.id);
    appendTimeline(row.id, "Status", `Status changed to ${status}`, actorId, status);
    recordAudit({ actor: actorId, action: "STATUS_CHANGED", request: row.id, referenceId, details: { status } });
  });
  return getAdminRequest(referenceId);
}

async function changePriority(referenceId, priority, actorId) {
  const row = requireRequest(referenceId);
  const now = new Date().toISOString();
  transaction(() => {
    getDb().prepare("UPDATE requests SET priority = ?, updated_at = ? WHERE id = ?").run(priority, now, row.id);
    recordAudit({ actor: actorId, action: "PRIORITY_CHANGED", request: row.id, referenceId, details: { priority } });
  });
  return getAdminRequest(referenceId);
}

async function assignRequest(referenceId, staffId, actorId) {
  const staff = staffId ? Staff.findActiveById(staffId) : null;
  if (staffId && !staff) throw new ApiError(422, "INVALID_ASSIGNEE", "Assigned specialist must be active staff");
  const row = requireRequest(referenceId);
  const now = new Date().toISOString();
  transaction(() => {
    getDb().prepare("UPDATE requests SET assigned_to = NULL, assigned_staff_id = ?, updated_at = ? WHERE id = ?")
      .run(staff?.id || null, now, row.id);
    appendTimeline(row.id, "Assignment", staff ? `Assigned to ${staff.name} (${staff.specialization})` : "Request unassigned", actorId);
    recordAudit({
      actor: actorId,
      action: "REQUEST_ASSIGNED",
      request: row.id,
      referenceId,
      details: { staffId: staff?.id || null, staffName: staff?.name || null },
    });
  });
  return getAdminRequest(referenceId);
}

async function addReply(referenceId, message, actorId) {
  const row = requireRequest(referenceId);
  const db = getDb();
  const replyId = crypto.randomUUID();
  const now = new Date().toISOString();
  transaction(() => {
    db.prepare(`
      INSERT INTO replies (id, request_id, author_id, assigned_staff_id, message, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(replyId, row.id, actorId, row.assigned_staff_id, message, now);
    db.prepare("UPDATE requests SET updated_at = ? WHERE id = ?").run(now, row.id);
    appendTimeline(row.id, "Reply", "Admin posted a reply", actorId);
    recordAudit({ actor: actorId, action: "REPLY_ADDED", request: row.id, referenceId });
  });
  return (await getAdminRequest(referenceId)).replies.find((reply) => reply.id === replyId);
}

async function addNote(referenceId, note, actorId) {
  const row = requireRequest(referenceId);
  const db = getDb();
  const now = new Date().toISOString();
  transaction(() => {
    db.prepare("INSERT INTO internal_notes (id, request_id, author_id, note, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(crypto.randomUUID(), row.id, actorId, note, now);
    db.prepare("UPDATE requests SET updated_at = ? WHERE id = ?").run(now, row.id);
    appendTimeline(row.id, "Note", "Internal note added", actorId);
    recordAudit({ actor: actorId, action: "NOTE_ADDED", request: row.id, referenceId });
  });
  return getAdminRequest(referenceId);
}

async function archiveRequest(referenceId, actorId) {
  const row = requireRequest(referenceId);
  const db = getDb();
  const now = new Date().toISOString();
  transaction(() => {
    db.prepare("UPDATE requests SET archived = 1, status = 'Resolved', updated_at = ? WHERE id = ?").run(now, row.id);
    appendTimeline(row.id, "Archive", "Request archived and resolved", actorId, "Resolved");
    recordAudit({ actor: actorId, action: "REQUEST_ARCHIVED", request: row.id, referenceId });
  });
  return getAdminRequest(referenceId);
}

async function softDeleteRequest(referenceId, actorId) {
  const result = Request.softDelete(referenceId, actorId);
  if (!result) throw new ApiError(404, "REQUEST_NOT_FOUND", "Request not found");
  return result;
}

module.exports = {
  createRequest, listStudentRequests, getStudentRequest, getAdminRequest, listAdminRequests,
  studentDashboard, adminDashboard, changeStatus, changePriority, assignRequest,
  addReply, addNote, archiveRequest, softDeleteRequest,
};
