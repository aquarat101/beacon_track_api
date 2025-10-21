const express = require("express");
const router = express.Router();
const schoolController = require('../../controllers/controllers_back_office/schoolController');

// Schools
router.get('/get/:id', schoolController.getSchool);
router.get('/getAll', schoolController.getSchools);
router.post('/create', schoolController.createSchool);
router.put("/update/:id", schoolController.updateSchool);
router.delete('/delete/:id', schoolController.deleteSchool); // <-- delete school

// School Users
router.get('/getUser/:id', schoolController.getSchoolUser);
router.get('/getAllUser', schoolController.getSchoolUsers);
router.post('/createSchool', schoolController.createSchoolUser);
router.put('/updateSchoolUser/:id', schoolController.updateSchoolUser);
router.delete('/deleteUser/:id', schoolController.deleteSchoolUser); // <-- delete user

module.exports = router;