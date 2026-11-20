const router = require("express").Router();
const { authenticate, authorizeRoles } = require("../middleware/auth");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const upload = require("../middleware/upload");
const controller = require("../controllers/request.controller");
const {
  createRequestSchema, statusSchema, prioritySchema, assignmentSchema,
  replySchema, noteSchema, listSchema,
} = require("../validators/request.validator");

router.use(authenticate);

router.post("/", authorizeRoles("Student"), upload.single("attachment"), validate(createRequestSchema), asyncHandler(controller.createRequest));
router.get("/me", authorizeRoles("Student"), validate(listSchema, "query"), asyncHandler(controller.listStudentRequests));
router.get("/:id", asyncHandler(controller.getRequest));

module.exports = router;
