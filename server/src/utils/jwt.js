const jwt = require("jsonwebtoken");
const { randomUUID } = require("crypto");
const env = require("../config/env");

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, env.accessSecret, {
    expiresIn: env.accessTokenTtl,
    issuer: "student-portal",
  });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, role: user.role, type: "refresh" }, env.refreshSecret, {
    expiresIn: env.refreshTokenTtl,
    issuer: "student-portal",
    jwtid: randomUUID(),
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.accessSecret, { issuer: "student-portal" });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.refreshSecret, { issuer: "student-portal" });
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
