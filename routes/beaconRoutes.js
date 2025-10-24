const express = require("express");
const router = express.Router();

const {
  getBeaconHits,
  getZoneHitByBeaconIdAndUserId,
  getZoneEventsByBeaconIdAndUserId,
} = require("../controllers/beaconController");

router.get("/beacon-hit", getBeaconHits);
router.get("/getZoneHits/:beaconId/:userId", getZoneHitByBeaconIdAndUserId);
router.get(
  "/getZoneEvents/:beaconId/:userId",
  getZoneEventsByBeaconIdAndUserId
);

module.exports = router;
