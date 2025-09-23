// src/routes/highlights.js
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
  createHighlight,
  getHighlights,
  getHighlight,
  updateHighlight,
  deleteHighlight,
  getHighlightsByCategory,
  getRecentHighlights,
  getHighlightCategories,
  trackInteraction,
  downloadHighlight,
  bulkOperation,
  getHighlightAnalytics,
  getHighlightsAnalytics,
} = require("../controllers/highlights");

const router = express.Router();

// Public routes
router.get("/", optionalAuth, getHighlights);
router.get("/recent", getRecentHighlights);
router.get("/categories", getHighlightCategories);
router.get("/category/:category", getHighlightsByCategory);
router.get("/:id", getHighlight);
router.post("/:id/interact", trackInteraction);
router.get("/:id/download", downloadHighlight);

// Protected routes (CMS)
router.post(
  "/",
  authenticateToken,
  requireEditor,
  uploadSingleImage,
  handleUploadError,
  processImage,
  createHighlight
);
router.put(
  "/:id",
  authenticateToken,
  requireEditor,
  uploadSingleImage,
  handleUploadError,
  processImage,
  updateHighlight
);
router.delete("/:id", authenticateToken, requireEditor, deleteHighlight);
router.post("/bulk", authenticateToken, requireEditor, bulkOperation);
router.get(
  "/:id/analytics",
  authenticateToken,
  requireEditor,
  getHighlightAnalytics
);
router.get(
  "/analytics/overview",
  authenticateToken,
  requireEditor,
  getHighlightsAnalytics
);

module.exports = router;

// =====================================
