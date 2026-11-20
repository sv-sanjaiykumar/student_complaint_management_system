const service = require("../services/request.service");
const User = require("../models/User");
const Staff = require("../models/Staff");
const authService = require("../services/auth.service");
const { success } = require("../utils/response");

async function createRequest(req, res) {
  const request = await service.createRequest(req.user.id, req.body, req.file);
  return success(res, 201, { request }, "Request submitted");
}

async function listStudentRequests(req, res) {
  const result = await service.listStudentRequests(req.user.id, req.query);
  return success(res, 200, result, "Student requests retrieved");
}

async function getRequest(req, res) {
  const request = req.user.role === "Admin"
    ? await service.getAdminRequest(req.params.id)
    : await service.getStudentRequest(req.user.id, req.params.id);
  return success(res, 200, { request }, "Request retrieved");
}

async function listAdminRequests(req, res) {
  const result = await service.listAdminRequests(req.query);
  return success(res, 200, result, "Requests retrieved");
}

async function studentDashboard(req, res) {
  const result = await service.studentDashboard(req.user.id);
  return success(res, 200, result, "Dashboard retrieved");
}

async function adminDashboard(req, res) {
  const result = await service.adminDashboard();
  return success(res, 200, result, "Dashboard retrieved");
}

async function adminUsers(_req, res) {
  return success(res, 200, { users: User.listActiveAdmins() }, "Active admins retrieved");
}

async function listStaff(_req, res) {
  return success(res, 200, { staff: Staff.listActive() }, "Active staff retrieved");
}

async function listStudents(_req, res) {
  return success(res, 200, { users: User.listStudents() }, "Student accounts retrieved");
}

async function createStudent(req, res) {
  const user = await authService.createStudent(req.body, req.user.id);
  return success(res, 201, { user }, "Student account created");
}

async function changeStatus(req, res) {
  const request = await service.changeStatus(req.params.id, req.body.status, req.user.id);
  return success(res, 200, { request }, "Status updated");
}

async function changePriority(req, res) {
  const request = await service.changePriority(req.params.id, req.body.priority, req.user.id);
  return success(res, 200, { request }, "Priority updated");
}

async function assignRequest(req, res) {
  const request = await service.assignRequest(req.params.id, req.body.staffId, req.user.id);
  return success(res, 200, { request }, "Request assigned");
}

async function addReply(req, res) {
  const reply = await service.addReply(req.params.id, req.body.message, req.user.id);
  return success(res, 201, { reply }, "Reply posted");
}

async function addNote(req, res) {
  const request = await service.addNote(req.params.id, req.body.note, req.user.id);
  return success(res, 201, { request }, "Internal note added");
}

async function archiveRequest(req, res) {
  const request = await service.archiveRequest(req.params.id, req.user.id);
  return success(res, 200, { request }, "Request archived");
}

async function deleteRequest(req, res) {
  const result = await service.softDeleteRequest(req.params.id, req.user.id);
  return success(res, 200, result, "Request deleted");
}

module.exports = {
  createRequest, listStudentRequests, getRequest, listAdminRequests, studentDashboard,
  adminDashboard, changeStatus, changePriority, assignRequest, addReply, addNote,
  archiveRequest, deleteRequest, adminUsers, listStaff, listStudents, createStudent,
};
