// src/routes/youtube.js
const express = require("express");
const { optionalAuth } = require("../middleware/auth");
const { getShorts } = require("../controllers/youtube");

const router = express.Router();

// Public route
router.get("/shorts", optionalAuth, getShorts);

module.exports = router;
