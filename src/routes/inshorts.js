// src/routes/inshorts.js
const express = require("express");
const router = express.Router();
const {
  generateInshort,
  getInshorts,
  getInshort,
  updateInshort,
  deleteInshort,
  getInshortsByArticle,
  publishInshort,
} = require("../controllers/inshorts");
const { authenticateToken } = require("../middleware/auth");

// Generate Inshort from Article
router.post("/generate/:articleId", authenticateToken, generateInshort);

// Get all Inshorts
router.get("/", getInshorts);

// Get single Inshort
router.get("/:id", getInshort);

// Update Inshort
router.put("/:id", authenticateToken, updateInshort);

// Delete Inshort
router.delete("/:id", authenticateToken, deleteInshort);

// Get Inshorts by Article
router.get("/article/:articleId", getInshortsByArticle);

// Publish Inshort
router.post("/:id/publish", authenticateToken, publishInshort);

module.exports = router;
