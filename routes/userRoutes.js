const express = require('express');
const multer = require('multer')
const router = express.Router();
const { getProfile, updateProfile } = require('../controllers/userController');

// ใช้ memory storage หรือจะใช้ diskStorage ก็ได้
const upload = multer({ storage: multer.memoryStorage() }); // ใช้ memoryStorage สำหรับอัปโหลดเข้า Firebase

router.get('/get/:id', getProfile)
router.put('/update/:id', upload.single('avatar'), updateProfile)


module.exports = router;
