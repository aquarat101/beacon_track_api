const express = require("express");
const router = express.Router();
const schoolUserController = require("../../controllers/controllers_back_office/schoolUserController");
const { verifyToken } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { ROLES } = require("../../constants/role");

const auth = (roles = []) => [verifyToken, authorizeRoles(...roles)];

router.get("/getAllUser", verifyToken, schoolUserController.getSchoolUsers);
router.get(
  "/getAllUserById/:schoolId",
  verifyToken,
  ...auth([ROLES.SUPER_ADMIN]),
  schoolUserController.getSchoolUsersBySchoolId
);
router.get(
  "/getUser/:id",
  ...auth([ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.SCHOOL_STAFF]),
  schoolUserController.getSchoolUser
);
router.put(
  "/updateSchoolUser/:id",
  verifyToken,
  ...auth([ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN]),
  schoolUserController.updateSchoolUser
);
router.delete(
  "/deleteUser/:id",
  verifyToken,
  ...auth([ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN]),
  schoolUserController.deleteSchoolUser
);

module.exports = router;
