const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const env = require("../config/env");
const ApiError = require("../utils/apiError");

fs.mkdirSync(env.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, env.uploadDir),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${crypto.randomBytes(16).toString("hex")}${extension}`);
  },
});

const allowed = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const allowedExtensions = new Set([".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"]);

const upload = multer({
  storage,
  limits: { fileSize: env.maxFileSize, files: 1 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!allowed.has(file.mimetype) || !allowedExtensions.has(extension)) {
      return callback(new ApiError(422, "INVALID_FILE_TYPE", "Unsupported file type"));
    }
    callback(null, true);
  },
});

module.exports = upload;
