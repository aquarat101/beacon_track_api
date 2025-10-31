const express = require("express");
const router = express.Router();
const { verifyToken } = require("../../middleware/authMiddleware");
const dashBoardController = require("../../controllers/controllers_back_office/dashBoardController");

router.get('/overview',verifyToken,dashBoardController.overview)

module.exports = router;
