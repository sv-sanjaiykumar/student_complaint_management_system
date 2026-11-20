const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../src/app");
const User = require("../src/models/User");
const Staff = require("../src/models/Staff");
const Request = require("../src/models/Request");
const { signAccessToken } = require("../src/utils/jwt");

async function createUsers() {
  const passwordHash = await bcrypt.hash("ChangeMe123!", 4);
  const student = User.create({ name: "Fake Student", email: "student@test.demo", passwordHash, role: "Student" });
  const studentTwo = User.create({ name: "Second Student", email: "student2@test.demo", passwordHash, role: "Student" });
  const admin = User.create({ name: "Fake Admin", email: "admin@test.demo", passwordHash, role: "Admin" });
  return { student, studentTwo, admin };
}

describe("Authentication and authorization", () => {
  test("logs in a fake student and exposes current user", async () => {
    const { student } = await createUsers();
    const login = await request(app).post("/api/v1/auth/login").send({
      email: "student@test.demo",
      password: "ChangeMe123!",
      role: "Student",
    });
    expect(login.status).toBe(200);
    expect(login.body.success).toBe(true);
    expect(login.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(login.body.data.accessToken).toBeTruthy();

    const me = await request(app).get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${login.body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.id).toBe(student.id);
  });

  test("admin bootstrap requires the private key and closes after the first admin", async () => {
    const invalid = await request(app).post("/api/v1/auth/admin/register").send({
      name: "Portal Admin",
      email: "first-admin@test.demo",
      password: "A-Strong-Admin-Pass-123",
      setupKey: "wrong-private-registration-key",
    });
    expect(invalid.status).toBe(403);

    const setup = await request(app).post("/api/v1/auth/admin/register").send({
      name: "Portal Admin",
      email: "first-admin@test.demo",
      password: "A-Strong-Admin-Pass-123",
      setupKey: process.env.ADMIN_SETUP_KEY,
    });
    expect(setup.status).toBe(201);
    expect(setup.body.data.user.role).toBe("Admin");

    const secondSetup = await request(app).post("/api/v1/auth/admin/register").send({
      name: "Another Admin",
      email: "another-admin@test.demo",
      password: "A-Strong-Admin-Pass-123",
      setupKey: process.env.ADMIN_SETUP_KEY,
    });
    expect(secondSetup.status).toBe(403);
    expect(secondSetup.body.error.code).toBe("ADMIN_SETUP_CLOSED");
  });

  test("does not expose admin registration status publicly", async () => {
    const response = await request(app).get("/api/v1/auth/admin/registration-status");
    expect(response.status).toBe(404);
  });

  test("locks account after repeated failed logins", async () => {
    await createUsers();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app).post("/api/v1/auth/login").send({
        email: "student@test.demo",
        password: "WrongPassword1!",
        role: "Student",
      });
    }
    const locked = await request(app).post("/api/v1/auth/login").send({
      email: "student@test.demo",
      password: "ChangeMe123!",
      role: "Student",
    });
    expect(locked.status).toBe(423);
  });

  test("rotates refresh tokens and clears the refresh session on logout", async () => {
    await createUsers();
    const login = await request(app).post("/api/v1/auth/login").send({
      email: "student@test.demo",
      password: "ChangeMe123!",
      role: "Student",
    });
    const refreshCookie = login.headers["set-cookie"][0].split(";")[0];
    const refreshed = await request(app).post("/api/v1/auth/refresh").set("Cookie", refreshCookie);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.accessToken).toBeTruthy();

    const replay = await request(app).post("/api/v1/auth/refresh").set("Cookie", refreshCookie);
    expect(replay.status).toBe(401);

    const nextCookie = refreshed.headers["set-cookie"][0].split(";")[0];
    const logout = await request(app).post("/api/v1/auth/logout").set("Cookie", nextCookie);
    expect(logout.status).toBe(200);
  });

  test("refresh without a cookie reports an unauthenticated session without an error", async () => {
    const response = await request(app).post("/api/v1/auth/refresh");
    expect(response.status).toBe(200);
    expect(response.body.data.authenticated).toBe(false);
  });

  test("student cannot read another student's request", async () => {
    const { student, studentTwo } = await createUsers();
    const requestId = Request.create({
      referenceId: "REQ-TEST1",
      studentId: studentTwo.id,
      subject: "Private test request",
      category: "other",
      priority: "Low",
      description: "This description belongs only to the second student.",
    });
    const token = signAccessToken(student);
    const response = await request(app).get("/api/v1/requests/REQ-TEST1")
      .set("Authorization", `Bearer ${token}`);
    expect(requestId).toBeTruthy();
    expect(response.status).toBe(404);
  });

  test("student creates request and admin can update status", async () => {
    const { student, admin } = await createUsers();
    const studentToken = signAccessToken(student);
    const created = await request(app).post("/api/v1/requests")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        subject: "Certificate name update",
        category: "Certificate",
        priority: "Medium",
        description: "Please update the name printed on my course certificate.",
      });
    expect(created.status).toBe(201);
    const id = created.body.data.request.id;

    const adminToken = signAccessToken(admin);
    const updated = await request(app).patch(`/api/v1/admin/requests/${id}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "In Progress" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.request.status).toBe("In Progress");
    const db = require("../src/config/db").getDb();
    expect(db.prepare("SELECT COUNT(*) AS count FROM timeline WHERE type = 'Status'").get().count).toBe(1);
    expect(db.prepare("SELECT COUNT(*) AS count FROM audits WHERE action = 'STATUS_CHANGED'").get().count).toBe(1);
  });

  test("admin request search matches subject and paginates results", async () => {
    const { student, admin } = await createUsers();
    Request.create({
      referenceId: "REQ-SEARCH1",
      studentId: student.id,
      subject: "Course enrollment access",
      category: "academic",
      priority: "High",
      description: "Please help me access course enrollment before registration closes.",
    });
    const response = await request(app).get("/api/v1/admin/requests?search=enrollment&page=1&pageSize=5")
      .set("Authorization", `Bearer ${signAccessToken(admin)}`);
    expect(response.status).toBe(200);
    expect(response.body.data.pagination.total).toBe(1);
    expect(response.body.data.items[0].id).toBe("REQ-SEARCH1");
  });

  test("admin creates a student login without returning or listing password data", async () => {
    const { admin } = await createUsers();
    const adminToken = signAccessToken(admin);
    const created = await request(app).post("/api/v1/admin/students")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "New Student",
        email: "new.student@test.demo",
        password: "Temporary-Student-Pass-1",
      });
    expect(created.status).toBe(201);
    expect(created.body.data.user.role).toBe("Student");
    expect(JSON.stringify(created.body)).not.toContain("password");

    const login = await request(app).post("/api/v1/auth/login").send({
      name: "New Student",
      email: "new.student@test.demo",
      password: "Temporary-Student-Pass-1",
      role: "Student",
    });
    expect(login.status).toBe(200);

    const students = await request(app).get("/api/v1/admin/students")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(students.body.data.users.map((user) => user.email)).toContain("new.student@test.demo");
    expect(JSON.stringify(students.body)).not.toContain("password_hash");
  });

  test("admin assignment, reply, notes, archive and deletion are persisted", async () => {
    const { student, admin } = await createUsers();
    const studentToken = signAccessToken(student);
    const adminToken = signAccessToken(admin);
    const created = await request(app).post("/api/v1/requests")
      .set("Authorization", `Bearer ${studentToken}`)
      .send({
        subject: "Help with course enrollment",
        category: "academic",
        priority: "High",
        description: "Please help me resolve a course enrollment problem before the deadline.",
      });
    const id = created.body.data.request.id;

    const specialist = Staff.create({
      name: "Alex Specialist",
      email: "specialist@test.demo",
      specialization: "academic",
    });
    const assignees = await request(app).get("/api/v1/admin/staff")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(assignees.body.data.staff.map((member) => member.id)).toContain(specialist.id);
    const studentStaffResponse = await request(app).get("/api/v1/admin/staff")
      .set("Authorization", `Bearer ${studentToken}`);
    expect(studentStaffResponse.status).toBe(403);
    const assignment = await request(app).patch(`/api/v1/admin/requests/${id}/assign`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ staffId: specialist.id });
    expect(assignment.status).toBe(200);
    expect(assignment.body.data.request.assignedStaff.id).toBe(specialist.id);

    const reply = await request(app).post(`/api/v1/admin/requests/${id}/replies`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ message: "We are reviewing your enrollment issue now." });
    expect(reply.status).toBe(201);
    expect(reply.body.data.reply.assignedStaff.name).toBe("Alex Specialist");

    const note = await request(app).post(`/api/v1/admin/requests/${id}/notes`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ note: "Check prerequisite override before responding." });
    expect(note.status).toBe(201);

    const studentDetail = await request(app).get(`/api/v1/requests/${id}`)
      .set("Authorization", `Bearer ${studentToken}`);
    expect(studentDetail.body.data.request.replies).toHaveLength(1);
    expect(studentDetail.body.data.request.assignedStaff.name).toBe("Alex Specialist");
    expect(studentDetail.body.data.request.assignedStaff.email).toBeUndefined();
    expect(studentDetail.body.data.request.replies[0].assignedStaff.name).toBe("Alex Specialist");
    expect(studentDetail.body.data.request.internalNotes).toBeUndefined();
    expect(JSON.stringify(studentDetail.body)).not.toContain("prerequisite override");

    const archived = await request(app).patch(`/api/v1/admin/requests/${id}/archive`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(archived.body.data.request.archived).toBe(true);

    const removed = await request(app).delete(`/api/v1/admin/requests/${id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(removed.body.data.deleted).toBe(true);
    const db = require("../src/config/db").getDb();
    const actions = db.prepare("SELECT action FROM audits ORDER BY action").all().map((row) => row.action);
    expect(actions).toEqual(expect.arrayContaining([
      "REQUEST_ASSIGNED", "REPLY_ADDED", "NOTE_ADDED", "REQUEST_ARCHIVED", "REQUEST_SOFT_DELETED",
    ]));
  });

  test("student cannot access admin dashboard", async () => {
    const { student } = await createUsers();
    const response = await request(app).get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${signAccessToken(student)}`);
    expect(response.status).toBe(403);
  });

  test("students never receive internal notes", async () => {
    const { student } = await createUsers();
    const db = require("../src/config/db").getDb();
    const id = Request.create({
      referenceId: "REQ-NOTE1",
      studentId: student.id,
      subject: "Question about fees",
      category: "fee",
      priority: "Low",
      description: "I have a question about my current semester fees.",
    });
    db.prepare("INSERT INTO internal_notes (id, request_id, author_id, note, created_at) VALUES (?, ?, ?, ?, ?)")
      .run("note-id", id, student.id, "Private internal text", new Date().toISOString());
    const response = await request(app).get("/api/v1/requests/REQ-NOTE1")
      .set("Authorization", `Bearer ${signAccessToken(student)}`);
    expect(response.status).toBe(200);
    expect(response.body.data.request.internalNotes).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain("Private internal text");
  });
});
