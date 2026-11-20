const Joi = require("joi");

const createStudentSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().max(254).required(),
  password: Joi.string().min(12).max(128).required(),
});

module.exports = { createStudentSchema };
