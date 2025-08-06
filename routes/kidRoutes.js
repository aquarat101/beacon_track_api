const express = require('express');
const multer = require('multer');
const router = express.Router();
const { createKid, getKidsByUserId, getKidByUserIdAndKidId, getAllKids, updateKid, deleteKid } = require('../controllers/kidController')

const upload = multer({ storage: multer.memoryStorage() }); // เก็บไฟล์ไว้ใน memory buffer

router.post('/create/:id', createKid)
router.get('/getUserKids/:id', getKidsByUserId)
router.get('/getKid/:userId/:kidId', getKidByUserIdAndKidId)
router.get('/getAllKids/', getAllKids)
router.patch('/update/:userId/:kidId', upload.single('avatar'), updateKid)
router.delete('/delete/:id', deleteKid)

module.exports = router;
