const router = require("express").Router();
const { authenticate, authorizeRoles } = require("../middleware/auth");
const asyncHandler = require("../middleware/asyncHandler");
const controller = require("../controllers/request.controller");

router.use(authenticate, authorizeRoles("Student"));
router.get("/dashboard", asyncHandler(controller.studentDashboard));

module.exports = router;
