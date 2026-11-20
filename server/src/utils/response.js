function success(res, statusCode, data = null, message = "Success") {
  return res.status(statusCode).json({ success: true, data, message, error: null });
}

module.exports = { success };
