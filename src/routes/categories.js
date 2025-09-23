// src/routes/categories.js
const express = require("express");
const {
  authenticateToken,
  requireEditor,
  optionalAuth,
} = require("../middleware/auth");
const {
  getCategories,
  getCategory,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoriesStats,
} = require("../controllers/categories");

const router = express.Router();

// Public routes
router.get("/", optionalAuth, getCategories);
router.get("/slug/:slug", optionalAuth, getCategoryBySlug);

// Protected routes
router.get("/stats", authenticateToken, requireEditor, getCategoriesStats);
router.get("/:id", authenticateToken, getCategory);
router.post("/", authenticateToken, requireEditor, createCategory);
router.put("/:id", authenticateToken, requireEditor, updateCategory);
router.delete("/:id", authenticateToken, requireEditor, deleteCategory);

module.exports = router;
