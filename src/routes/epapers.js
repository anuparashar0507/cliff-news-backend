// src/routes/epapers.js
const express = require("express");
const {
  authenticateToken,
  requireEditor,
  optionalAuth,
} = require("../middleware/auth");
const {
  uploadSinglePDF,
  processPDF,
  handleUploadError,
} = require("../middleware/upload");
const {
  uploadEPaper,
  getEPapers,
  getTodayEPaper,
  getEPaperByDate,
  getEPaper,
  updateEPaper,
  deleteEPaper,
  getEPapersCalendar,
  getEPaperAnalytics,
} = require("../controllers/epapers");

const router = express.Router();

// Public routes
router.get("/", optionalAuth, getEPapers);
router.get("/today", getTodayEPaper);
router.get("/calendar", getEPapersCalendar);
router.get("/date/:date/:language", getEPaperByDate);

// Protected routes
router.get("/analytics", authenticateToken, requireEditor, getEPaperAnalytics);
router.post(
  "/upload",
  authenticateToken,
  requireEditor,
  uploadSinglePDF,
  handleUploadError,
  processPDF,
  uploadEPaper
);
router.get("/:id", authenticateToken, getEPaper);
router.put("/:id", authenticateToken, requireEditor, updateEPaper);
router.delete("/:id", authenticateToken, requireEditor, deleteEPaper);

module.exports = router;
