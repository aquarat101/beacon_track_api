const express = require('express')
const router = express.Router()
const { getPlacesByUserId, addPlace, deletePlace } = require('../controllers/placeController')

router.get('/get/:userId', getPlacesByUserId)
router.post('/add/:userId', addPlace)
router.delete('/delete/:placeId', deletePlace)

module.exports = router
