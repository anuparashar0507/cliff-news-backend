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
  uploadToCloudinary,
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
  uploadToCloudinary,
  createNIT
);
router.put(
  "/:id",
  authenticateToken,
  requireEditor,
  uploadSingleImage,
  handleUploadError,
  uploadToCloudinary,
  updateNIT
);
router.delete("/:id", authenticateToken, requireEditor, deleteNIT);

module.exports = router;

// =====================================
