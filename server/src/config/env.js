require("dotenv").config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  databasePath: process.env.SQLITE_DB_PATH || "./data/student_portal.sqlite",
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenTtl: process.env.REFRESH_TOKEN_TTL || "7d",
  adminSetupKey: process.env.ADMIN_SETUP_KEY,
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  cookieSecure: process.env.COOKIE_SECURE === "true",
  maxFileSize: Number(process.env.MAX_FILE_SIZE_BYTES || 5242880),
  uploadDir: process.env.UPLOAD_DIR || "./storage/uploads",
};
