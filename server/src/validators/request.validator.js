const Joi = require("joi");

const createRequestSchema = Joi.object({
  subject: Joi.string().trim().min(5).max(160).required(),
  category: Joi.string().lowercase().valid("academic", "fee", "certificate", "hostel", "other").required(),
  priority: Joi.string().valid("Low", "Medium", "High", "Urgent").default("Medium"),
  description: Joi.string().trim().min(20).max(10000).required(),
});

const statusSchema = Joi.object({
  status: Joi.string().valid("Pending", "In Progress", "Resolved", "Rejected").required(),
});

const prioritySchema = Joi.object({
  priority: Joi.string().valid("Low", "Medium", "High", "Urgent").required(),
});

const assignmentSchema = Joi.object({
  staffId: Joi.string().guid({ version: ["uuidv4"] }).allow(null).required(),
});

const replySchema = Joi.object({
  message: Joi.string().trim().min(3).max(5000).required(),
});

const noteSchema = Joi.object({
  note: Joi.string().trim().min(3).max(5000).required(),
});

const listSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid("Pending", "In Progress", "Resolved", "Rejected").optional(),
  category: Joi.string().valid("academic", "fee", "certificate", "hostel", "other").optional(),
  priority: Joi.string().valid("Low", "Medium", "High", "Urgent").optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  search: Joi.string().trim().max(160).optional(),
  sortBy: Joi.string().valid("createdAt", "updatedAt", "priority", "status", "subject").default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});

module.exports = { createRequestSchema, statusSchema, prioritySchema, assignmentSchema, replySchema, noteSchema, listSchema };
