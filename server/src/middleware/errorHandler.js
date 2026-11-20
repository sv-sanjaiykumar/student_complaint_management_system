const ApiError = require("../utils/apiError");

function notFound(req, _res, next) {
  next(new ApiError(404, "NOT_FOUND", `Route ${req.method} ${req.originalUrl} not found`));
}

function errorHandler(error, _req, res, _next) {
  let apiError = error;
  if (error.code === "LIMIT_FILE_SIZE") apiError = new ApiError(422, "FILE_TOO_LARGE", "File size exceeds the configured limit");
  if (error.code === "LIMIT_UNEXPECTED_FILE") apiError = new ApiError(422, "INVALID_ATTACHMENT", "Only one attachment is allowed");
  if (error.code === "ERR_SQLITE_CONSTRAINT_UNIQUE" || error.errcode === 2067) {
    apiError = new ApiError(409, "CONFLICT", "A user with this email already exists");
  }
  if (error.name === "CastError") apiError = new ApiError(400, "INVALID_ID", "Invalid identifier");
  if (error.code === 11000) apiError = new ApiError(409, "CONFLICT", "A record with this value already exists");
  if (error.name === "ValidationError") {
    apiError = new ApiError(422, "VALIDATION_ERROR", "Validation failed",
      Object.entries(error.errors).map(([field, item]) => ({ field, message: item.message })));
  }
  const status = apiError.statusCode || 500;
  const code = apiError.code || "INTERNAL_ERROR";
  const message = status === 500 ? "An unexpected error occurred" : apiError.message;
  const payload = {
    success: false,
    data: null,
    message,
    error: { code, details: apiError.details || null },
  };
  if (process.env.NODE_ENV !== "test" && status >= 500) console.error(error);
  res.status(status).json(payload);
}

module.exports = { notFound, errorHandler };
