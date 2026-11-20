require("dotenv").config();
const bcrypt = require("bcryptjs");
const { getDb, disconnectDatabase } = require("../src/config/db");
const User = require("../src/models/User");
const Staff = require("../src/models/Staff");
const requests = require("../src/services/request.service");
const staffData = require("./staff-data");

async function seed() {
  const db = getDb();
  const existingUsers = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  const reset = process.argv.includes("--reset");
  if (existingUsers && !reset) {
    throw new Error("Database already contains users; use --reset only for a disposable development database.");
  }
  if (reset) {
    db.exec(`
      DELETE FROM audits;
      DELETE FROM timeline;
      DELETE FROM internal_notes;
      DELETE FROM replies;
      DELETE FROM attachments;
      DELETE FROM requests;
      DELETE FROM staff;
      DELETE FROM users;
    `);
  }

  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
  const student = User.create({ name: "Alex Morgan", email: "alex@campus.demo", passwordHash, role: "Student" });
  const secondStudent = User.create({ name: "Taylor Kim", email: "taylor@campus.demo", passwordHash, role: "Student" });
  const admin = User.create({ name: "Morgan Lee", email: "admin@campus.demo", passwordHash, role: "Admin" });
  const secondAdmin = User.create({ name: "Sarah Chen", email: "sarah@campus.demo", passwordHash, role: "Admin" });
  const staff = staffData.map((details) => Staff.findByEmail(details.email) || Staff.create(details));

  await requests.createRequest(student.id, {
    subject: "Request for official transcript",
    category: "academic",
    priority: "High",
    description: "I need an official transcript for a graduate application.",
  });
  await requests.createRequest(student.id, {
    subject: "Tuition fee extension",
    category: "fee",
    priority: "Urgent",
    description: "I am requesting a two-week extension for the tuition fee.",
  });
  await requests.createRequest(student.id, {
    subject: "Hostel room maintenance",
    category: "hostel",
    priority: "Medium",
    description: "The heating in room 418 has not been working consistently.",
  });
  await requests.createRequest(secondStudent.id, {
    subject: "Course enrollment issue",
    category: "academic",
    priority: "High",
    description: "The registration system does not allow me to enroll in BIO 240.",
  });

  const first = db.prepare("SELECT reference_id FROM requests ORDER BY created_at LIMIT 1").get();
  const transcriptSpecialist = staff.find((member) => member.specialization === "certificate");
  await requests.assignRequest(first.reference_id, transcriptSpecialist.id, admin.id);
  await requests.changeStatus(first.reference_id, "In Progress", admin.id);
  await requests.addReply(first.reference_id, "We received your request. Please allow 3–5 business days.", secondAdmin.id);
  console.log("SQLite seed complete.");
  console.log("Fake student: alex@campus.demo / ChangeMe123!");
  console.log("Fake admin: admin@campus.demo / ChangeMe123!");
  console.log(`Added ${staff.length} fake specialist records.`);
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  })
  .finally(disconnectDatabase);
