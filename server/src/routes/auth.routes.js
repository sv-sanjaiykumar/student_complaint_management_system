const router = require("express").Router();
const { loginLimiter } = require("../middleware/rateLimit");
const validate = require("../middleware/validate");
const asyncHandler = require("../middleware/asyncHandler");
const { authenticate } = require("../middleware/auth");
const { loginSchema, adminSetupSchema } = require("../validators/auth.validator");
const controller = require("../controllers/auth.controller");

router.post("/login", loginLimiter, validate(loginSchema), asyncHandler(controller.login));
router.post("/admin/register", loginLimiter, validate(adminSetupSchema), asyncHandler(controller.registerAdmin));
router.post("/refresh", asyncHandler(controller.refresh));
router.post("/logout", asyncHandler(controller.logout));
router.get("/me", authenticate, asyncHandler(controller.me));

module.exports = router;
