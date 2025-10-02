// src/routes/articles.js
const express = require("express");
const {
  authenticateToken,
  requireEditor,
  optionalAuth,
} = require("../middleware/auth");
const {
  createArticle,
  getArticles,
  getArticle,
  getArticleBySlug,
  updateArticle,
  deleteArticle,
  getQuickReads,
  getBreakingNews,
  getTopStories,
  getArticlesByCategory,
  generateNewsFromContent,
  generateSEOOnly,
  regenerateWithFeedback,
  translateContent,
  translateAndCreateArticle,
} = require("../controllers/articles");

const router = express.Router();

// Public routes
router.get("/", optionalAuth, getArticles);
router.get("/slug/:slug", optionalAuth, getArticleBySlug);
router.get("/quick-reads", getQuickReads);
router.get("/breaking", getBreakingNews);
router.get("/top-stories", getTopStories);
router.get("/category/:slug", optionalAuth, getArticlesByCategory);

// Individual article - Public route for frontend display
router.get("/:id", optionalAuth, getArticle);

// Protected routes
router.post("/", authenticateToken, requireEditor, createArticle);
router.put("/:id", authenticateToken, requireEditor, updateArticle);
router.delete("/:id", authenticateToken, requireEditor, deleteArticle);

// AI Content Generation routes
router.post(
  "/generate-from-content",
  authenticateToken,
  requireEditor,
  generateNewsFromContent
);
router.post("/generate-seo", authenticateToken, requireEditor, generateSEOOnly);
router.post(
  "/regenerate-with-feedback",
  authenticateToken,
  requireEditor,
  regenerateWithFeedback
);
router.post("/translate", authenticateToken, requireEditor, translateContent);
router.post("/translate-and-create", authenticateToken, requireEditor, translateAndCreateArticle);

module.exports = router;
