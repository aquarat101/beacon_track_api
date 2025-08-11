const express = require('express');
const router = express.Router();

const { getBeaconHits, getZoneHitByBeaconIdAndUserId } = require('../controllers/beaconController')

router.get('/beacon-hit', getBeaconHits);
router.get('/getZoneHits/:beaconId/:userId', getZoneHitByBeaconIdAndUserId)

module.exports = router;
