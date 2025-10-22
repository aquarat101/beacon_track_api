const express = require('express');
const multer = require('multer');
const router = express.Router();
const { createKid, getMultipleKids, getKidsByUserId, getKidByUserIdAndKidId, getAllKids, updateKid, deleteKid, getKidByKidId } = require('../controllers/kidController')

const upload = multer({ storage: multer.memoryStorage() }); // เก็บไฟล์ไว้ใน memory buffer

router.post('/create/:id', upload.single('avatar'), createKid)  
// router.post('/addDevice/:schoolId', addDeviceForStudent)
router.get('/getUserKids/:id', getKidsByUserId)
router.get('/getKidByKidId/:kidId', getKidByKidId)
router.get('/getKid/:userId/:kidId', getKidByUserIdAndKidId)
router.get('/getAllKids/', getAllKids)
router.post('/getMultiKid', getMultipleKids)
router.patch('/update/:userId/:kidId', upload.single('avatar'), updateKid)
router.delete('/delete/:id', deleteKid)

module.exports = router;
