process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-that-is-long-enough";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-long-enough";
process.env.ADMIN_SETUP_KEY = "test-admin-setup-key-that-is-at-least-24-chars";
process.env.COOKIE_SECURE = "false";
process.env.FRONTEND_ORIGIN = "http://localhost:5173";
process.env.SQLITE_DB_PATH = ":memory:";

const { getDb, closeDb } = require("../src/config/db");

beforeAll(() => {
  getDb();
});

afterEach(() => {
  const db = getDb();
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
});

afterAll(() => {
  closeDb();
});
