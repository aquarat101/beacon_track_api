const express = require("express");
const router = express.Router();
const schoolController = require("../../controllers/controllers_back_office/schoolController");

// Schools
router.post("/create", schoolController.createSchool);
router.get("/getAll", schoolController.getSchools);
router.get("/get/:id", schoolController.getSchool);
router.put("/update/:id", schoolController.updateSchool);
router.delete("/delete/:id", schoolController.deleteSchool);

router.post("/createStudent/:schoolId/:userId", schoolController.createStudent);
router.get("/getAllStudent/:schoolId", schoolController.getSchoolStudents);
router.get(
  "/getSchoolIdByName/:schoolName",
  schoolController.getSchoolIdByName
);

// School Users
router.get("/getAllUser", schoolController.getSchoolUsers);
router.get("/getUser/:id", schoolController.getSchoolUser);
router.get(
  "/getAllUserById/:schoolId",
  schoolController.getSchoolUsersBySchoolId
);
router.post("/createSchool", schoolController.createSchoolUser);
router.put("/updateSchoolUser/:id", schoolController.updateSchoolUser);
router.delete("/deleteUser/:id", schoolController.deleteSchoolUser); // <-- delete user

module.exports = router;
