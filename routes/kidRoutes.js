const express = require('express');
const router = express.Router();
const { createKid, getKidsByUserId, getKidByUserIdAndKidId, getAllKids, updateKid, deleteKid } = require('../controllers/kidController')

router.post('/create/:id', createKid)
router.get('/getUserKids/:id', getKidsByUserId)
router.get('/getKid/:userId/:kidId', getKidByUserIdAndKidId)
router.get('/getAllKids/', getAllKids)
router.patch('/update/:userId/:kidId', updateKid)
router.delete('/delete/:id', deleteKid)

module.exports = router;
