const express = require("express");
const router = express.Router();
const studentController = require("../../controllers/controllers_back_office/studentController");
const { verifyToken } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { ROLES } = require("../../constants/role");

const auth = (roles = []) => [verifyToken, authorizeRoles(...roles)];

router.post(
  "/createStudent/:schoolId/:userId",
  verifyToken,
  ...auth([ROLES.SCHOOL_ADMIN, ROLES.SCHOOL_STAFF]),
  studentController.createStudent
);
router.get(
  "/getAllStudent",
  verifyToken,
  ...auth([ROLES.SUPER_ADMIN]),
  studentController.getAllStudents
);
router.get(
  "/getAllStudent/:schoolId",
  verifyToken,
  ...auth([ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.SCHOOL_STAFF]),
  studentController.getSchoolStudents
);
router.get(
  "/:schoolId/student/:studentId",
  verifyToken,
  ...auth([ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.SCHOOL_STAFF]),
  studentController.getStudentById
);
router.delete(
  "/:schoolId/student/:studentId",
  verifyToken,
  ...auth([ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.SCHOOL_STAFF]),
  studentController.deleteStudent
);
router.get(
  "/historyTrack/:schoolId/student/:studentId",
  verifyToken,
  ...auth([ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.SCHOOL_STAFF]),
  studentController.historyTrack
);

module.exports = router;
