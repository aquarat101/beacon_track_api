const express = require("express");
const router = express.Router();

const lineController = require("../../controllers/controllers_beacon_scanner/lineController");

// Routes
router.post('/notify', lineController.notify);

module.exports = router;
