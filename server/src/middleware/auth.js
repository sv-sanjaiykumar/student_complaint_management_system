const ApiError = require("../utils/apiError");
const { verifyAccessToken } = require("../utils/jwt");
const User = require("../models/User");

async function authenticate(req, _res, next) {
  try {
    const header = req.get("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new ApiError(401, "AUTH_REQUIRED", "Authentication required");
    const payload = verifyAccessToken(token);
    const user = User.findById(payload.sub);
    if (!user || !user.active) throw new ApiError(401, "INVALID_SESSION", "Session is invalid or account is inactive");
    req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    return next(new ApiError(401, "INVALID_ACCESS_TOKEN", "Access token is missing or invalid"));
  }
}

function authorizeRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "FORBIDDEN", "You do not have permission for this action"));
    }
    next();
  };
}

module.exports = { authenticate, authorizeRoles };
