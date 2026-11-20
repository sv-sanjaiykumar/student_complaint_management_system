const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const env = require("../config/env");
const { transaction } = require("../config/db");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt");
const { recordAudit } = require("./audit.service");

const LOCK_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active };
}

function normalizeRole(role) {
  if (typeof role !== "string") return role;
  return role.toLowerCase() === "admin" ? "Admin" : role.toLowerCase() === "student" ? "Student" : role;
}

async function login(email, password, requestedRole) {
  const user = User.findByEmail(email);
  if (!user) throw new ApiError(401, "INVALID_CREDENTIALS", "Email, password or role is invalid");
  if (!user.active) throw new ApiError(403, "ACCOUNT_INACTIVE", "This account is inactive");
  if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
    throw new ApiError(423, "ACCOUNT_LOCKED", "Account is temporarily locked");
  }
  if (user.role !== normalizeRole(requestedRole)) {
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email, password or role is invalid");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    const lockUntil = failedLoginAttempts >= LOCK_ATTEMPTS
      ? new Date(Date.now() + LOCK_DURATION_MS).toISOString()
      : null;
    User.updateLoginState(user.id, { failedLoginAttempts, lockUntil });
    throw new ApiError(401, "INVALID_CREDENTIALS", "Email, password or role is invalid");
  }

  User.updateLoginState(user.id, { failedLoginAttempts: 0, lockUntil: null });
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  User.setRefreshTokenHash(user.id, hashRefreshToken(refreshToken));
  return { user: publicUser(user), accessToken, refreshToken };
}

async function refresh(refreshToken) {
  if (!refreshToken) throw new ApiError(401, "REFRESH_REQUIRED", "Refresh token is required");
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Refresh token is missing or invalid");
  }
  const user = User.findByIdWithSession(payload.sub);
  if (!user || !user.active) throw new ApiError(401, "INVALID_SESSION", "Session is invalid");
  if (!user.refreshTokenHash || user.refreshTokenHash !== hashRefreshToken(refreshToken)) {
    throw new ApiError(401, "INVALID_REFRESH_TOKEN", "Refresh token is missing or invalid");
  }

  const accessToken = signAccessToken(user);
  const nextRefreshToken = signRefreshToken(user);
  User.setRefreshTokenHash(user.id, hashRefreshToken(nextRefreshToken));
  return { user: publicUser(user), accessToken, refreshToken: nextRefreshToken };
}

async function logout(refreshToken) {
  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      User.clearRefreshTokenHash(payload.sub);
    } catch (_error) {
      // Logout is intentionally best-effort.
    }
  }
  return { success: true };
}

async function currentUser(userId) {
  const user = User.findById(userId);
  if (!user || !user.active) throw new ApiError(401, "INVALID_SESSION", "Session is invalid");
  return publicUser(user);
}

async function registerAdmin({ name, email, password, setupKey }) {
  const expected = env.adminSetupKey || "";
  const suppliedBuffer = Buffer.from(setupKey);
  const expectedBuffer = Buffer.from(expected);
  if (!expected || suppliedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    throw new ApiError(403, "INVALID_SETUP_KEY", "Admin registration key is invalid");
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const created = transaction(() => {
    if (User.countAdmins() > 0) {
      throw new ApiError(403, "ADMIN_SETUP_CLOSED", "Initial admin setup is already complete");
    }
    return User.create({ name, email, passwordHash, role: "Admin" });
  });
  return login(created.email, password, "Admin");
}

async function createStudent({ name, email, password }, actorId) {
  const passwordHash = await bcrypt.hash(password, 12);
  const student = User.create({ name, email, passwordHash, role: "Student" });
  recordAudit({ actor: actorId, action: "STUDENT_ACCOUNT_CREATED", details: { studentId: student.id, email: student.email } });
  return publicUser(student);
}

module.exports = {
  login, refresh, logout, currentUser, registerAdmin, createStudent,
};
