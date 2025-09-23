// src/routes/nit.js
const express = require("express");
const {
  authenticateToken,
  requireEditor,
  optionalAuth,
} = require("../middleware/auth");
const {
  uploadSingleImage,
  processImage,
  handleUploadError,
} = require("../middleware/upload");
const {
  createNIT,
  getNITs,
  updateNIT,
  deleteNIT,
} = require("../controllers/nit");

const router = express.Router();

// Public routes
router.get("/", optionalAuth, getNITs);

// Protected routes
router.post(
  "/",
  authenticateToken,
  requireEditor,
  uploadSingleImage,
  handleUploadError,
  processImage,
  createNIT
);
router.put(
  "/:id",
  authenticateToken,
  requireEditor,
  uploadSingleImage,
  handleUploadError,
  processImage,
  updateNIT
);
router.delete("/:id", authenticateToken, requireEditor, deleteNIT);

module.exports = router;

// =====================================
