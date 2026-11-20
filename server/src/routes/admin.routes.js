const router = require("express").Router();
const { authenticate, authorizeRoles } = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const controller = require("../controllers/request.controller");
const validateUser = require("../middleware/validate");
const { createStudentSchema } = require("../validators/user.validator");
const {
  statusSchema, prioritySchema, assignmentSchema, replySchema, noteSchema, listSchema,
} = require("../validators/request.validator");

router.use(authenticate, authorizeRoles("Admin"));

router.get("/users", asyncHandler(controller.adminUsers));
router.get("/staff", asyncHandler(controller.listStaff));
router.get("/students", asyncHandler(controller.listStudents));
router.post("/students", validateUser(createStudentSchema), asyncHandler(controller.createStudent));
router.get("/dashboard", asyncHandler(controller.adminDashboard));
router.get("/requests", validate(listSchema, "query"), asyncHandler(controller.listAdminRequests));
router.get("/requests/:id", asyncHandler(controller.getRequest));
router.patch("/requests/:id/status", validate(statusSchema), asyncHandler(controller.changeStatus));
router.patch("/requests/:id/priority", validate(prioritySchema), asyncHandler(controller.changePriority));
router.patch("/requests/:id/assign", validate(assignmentSchema), asyncHandler(controller.assignRequest));
router.post("/requests/:id/replies", validate(replySchema), asyncHandler(controller.addReply));
router.post("/requests/:id/notes", validate(noteSchema), asyncHandler(controller.addNote));
router.patch("/requests/:id/archive", asyncHandler(controller.archiveRequest));
router.delete("/requests/:id", asyncHandler(controller.deleteRequest));

module.exports = router;
