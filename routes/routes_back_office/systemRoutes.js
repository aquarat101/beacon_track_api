const express = require("express");
const router = express.Router();
const systemController = require("../../controllers/controllers_back_office/systemController");
const { verifyToken } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { ROLES } = require("../../constants/role");

const auth = (roles = []) => [verifyToken, authorizeRoles(...roles)];

router.get(
  "/",
  verifyToken,
  ...auth([ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN]),
  systemController.systemLog
);

module.exports = router;
