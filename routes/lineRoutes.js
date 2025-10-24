const express = require("express");
const router = express.Router();
const lineController = require("../controllers/lineController");

router.post("/", lineController.handleWebhook);

module.exports = router;
