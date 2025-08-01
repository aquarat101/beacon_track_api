const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.get('/users/', userController.getProfile)

module.exports = router;
