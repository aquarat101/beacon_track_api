const express = require('express')
const { getPlaces, addPlace } = require('../controllers/placeController')

const router = express.Router()

router.get('/', getPlaces)
router.post('/', addPlace)

module.exports = router
