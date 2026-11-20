require("dotenv").config();
const Staff = require("../src/models/Staff");
const { disconnectDatabase } = require("../src/config/db");
const staffData = require("./staff-data");

function seedStaff() {
  let added = 0;
  for (const staff of staffData) {
    if (Staff.findByEmail(staff.email)) continue;
    Staff.create(staff);
    added += 1;
  }
  console.log(`Staff seed complete. Added ${added}; retained ${staffData.length - added} existing records.`);
}

try {
  seedStaff();
} catch (error) {
  console.error("Staff seed failed:", error.message);
  process.exitCode = 1;
} finally {
  disconnectDatabase();
}
