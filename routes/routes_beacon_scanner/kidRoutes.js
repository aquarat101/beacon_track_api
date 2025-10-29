const express = require("express");
const router = express.Router();

const kidController = require("../../controllers/controllers_beacon_scanner/kidController");

// Routes
router.get('/beacons', kidController.getKidsBeacons);
router.post('/updateStatus', kidController.updateKidStatus);
router.post('/checkOffline', kidController.checkOffline);

module.exports = router;
