const express = require('express')
const router = express.Router()
const { getPlacesByUserId } = require('../controllers/placeController')

router.get('/get/:id', getPlacesByUserId)

module.exports = router
