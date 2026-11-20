const env = require("../config/env");
const authService = require("../services/auth.service");
const { success } = require("../utils/response");

function setRefreshCookie(res, token) {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.nodeEnv === "production" ? "strict" : "lax",
    path: "/api/v1/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

async function login(req, res) {
  const result = await authService.login(req.body.email, req.body.password, req.body.role);
  setRefreshCookie(res, result.refreshToken);
  return success(res, 200, { user: result.user, accessToken: result.accessToken }, "Login successful");
}

async function refresh(req, res) {
  if (!req.cookies.refreshToken) {
    return success(res, 200, { authenticated: false }, "No active refresh session");
  }
  const result = await authService.refresh(req.cookies.refreshToken);
  setRefreshCookie(res, result.refreshToken);
  return success(res, 200, { user: result.user, accessToken: result.accessToken }, "Session refreshed");
}

async function logout(req, res) {
  await authService.logout(req.cookies.refreshToken);
  res.clearCookie("refreshToken", { httpOnly: true, secure: env.cookieSecure, sameSite: env.nodeEnv === "production" ? "strict" : "lax", path: "/api/v1/auth" });
  return success(res, 200, { success: true }, "Logout successful");
}

async function me(req, res) {
  const user = await authService.currentUser(req.user.id);
  return success(res, 200, { user }, "Current user");
}

function adminRegistrationStatus(_req, res) {
  return success(res, 200, { available: authService.adminRegistrationAvailable() }, "Admin registration status");
}

async function registerAdmin(req, res) {
  const result = await authService.registerAdmin(req.body);
  setRefreshCookie(res, result.refreshToken);
  return success(res, 201, { user: result.user, accessToken: result.accessToken }, "Admin registered");
}

module.exports = { login, refresh, logout, me, adminRegistrationStatus, registerAdmin };
