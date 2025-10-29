const express = require("express");
const router = express.Router();

const zoneController = require("../../controllers/controllers_beacon_scanner/zoneController");

// Routes
router.get('/getZones', zoneController.getZones);

module.exports = router;
