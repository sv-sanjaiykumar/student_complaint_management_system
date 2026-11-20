const Joi = require("joi");

const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().max(254).required(),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid("Student", "Admin", "student", "admin").required(),
});

const adminSetupSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().max(254).required(),
  password: Joi.string().min(12).max(128).required(),
  setupKey: Joi.string().min(24).max(256).required(),
});

module.exports = { loginSchema, adminSetupSchema };
