const express = require("express");
const router = express.Router();
const schoolController = require("../../controllers/controllers_back_office/schoolController");
const { verifyToken } = require("../../middleware/authMiddleware");
const { authorizeRoles } = require("../../middleware/roleMiddleware");
const { ROLES } = require("../../constants/role");

const auth = (roles = []) => [verifyToken, authorizeRoles(...roles)];

// Schools
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

// student
router.post(
  "/createStudent/:schoolId/:userId",
  verifyToken,
  ...auth([ROLES.SCHOOL_ADMIN, ROLES.SCHOOL_STAFF]),
  schoolController.createStudent
);
router.get(
  "/getAllStudent",
  verifyToken,
  ...auth([ROLES.SUPER_ADMIN]),
  schoolController.getAllStudents
);
router.get(
  "/getAllStudent/:schoolId",
  verifyToken,
  ...auth([ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.SCHOOL_STAFF]),
  schoolController.getSchoolStudents
);
router.get(
  "/:schoolId/student/:studentId",
  verifyToken,
  ...auth([ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.SCHOOL_STAFF]),
  schoolController.getStudentById
);
router.delete(
  "/:schoolId/student/:studentId",
  verifyToken,
  ...auth([ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.SCHOOL_STAFF]),
  schoolController.deleteStudent
);

// router.get(
//   "/getSchoolIdByName/:schoolName",
//   schoolController.getSchoolIdByName
// );

// School Users
router.get("/getAllUser", verifyToken, schoolController.getSchoolUsers);
router.get(
  "/getAllUserById/:schoolId",
  verifyToken,
  ...auth([ROLES.SUPER_ADMIN]),
  schoolController.getSchoolUsersBySchoolId
);
router.get(
  "/getUser/:id",
  ...auth([ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN, ROLES.SCHOOL_STAFF]),
  schoolController.getSchoolUser
);
router.put(
  "/updateSchoolUser/:id",
  verifyToken,
  ...auth([ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN]),
  schoolController.updateSchoolUser
);
router.delete(
  "/deleteUser/:id",
  verifyToken,
  ...auth([ROLES.SUPER_ADMIN, ROLES.SCHOOL_ADMIN]),
  schoolController.deleteSchoolUser
);

module.exports = router;
