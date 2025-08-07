const express = require('express')
const router = express.Router()
const { getPlacesByUserId, addPlace, updatePlace, deletePlace } = require('../controllers/placeController')

router.get('/get/:userId', getPlacesByUserId)
router.post('/add/:userId', addPlace)
router.put('/update/:placeId', updatePlace)
router.delete('/delete/:placeId', deletePlace)

module.exports = router
