const express = require("express");
const router = express.Router();
const schoolController = require("../../controllers/controllers_back_office/schoolController");
const { verifyToken } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { ROLES } = require("../../constants/role");

const auth = (roles = []) => [verifyToken, authorizeRoles(...roles)];

router.post(
  "/create",
  ...auth([ROLES.SUPER_ADMIN]),
  schoolController.createSchool
);
router.get(
  "/getAll",
  ...auth([ROLES.SUPER_ADMIN]),
  schoolController.getSchools
);
router.get(
  "/get/:id",
  ...auth([ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN]),
  schoolController.getSchool
);
router.put(
  "/update/:id",
  ...auth([ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN]),
  schoolController.updateSchool
);
router.delete(
  "/delete/:id",
  ...auth([ROLES.SUPER_ADMIN]),
  schoolController.deleteSchool
);

module.exports = router;
