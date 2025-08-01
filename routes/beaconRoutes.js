const express = require('express');
const router = express.Router();

const { getBeaconHits } = require('../controllers/beaconController')

router.get('/beacon-hit', getBeaconHits);

module.exports = router;
