// src/routes/notifications.js
const express = require("express");
const {
  authenticateToken,
  requireEditor,
  optionalAuth,
} = require("../middleware/auth");
const {
  createNotification,
  getNotifications,
  getNotification,
  updateNotification,
  deleteNotification,
  sendNotification,
  getNotificationStats,
  subscribeUser,
  unsubscribeUser,
  sendBreakingNews,
} = require("../controllers/notifications");

const router = express.Router();

// Public routes
router.post("/subscribe", subscribeUser);
router.post("/unsubscribe", unsubscribeUser);

// Protected routes
router.get("/", authenticateToken, getNotifications);
router.get("/stats", authenticateToken, getNotificationStats);
router.get("/:id", authenticateToken, getNotification);
router.post("/", authenticateToken, requireEditor, createNotification);
router.put("/:id", authenticateToken, requireEditor, updateNotification);
router.delete("/:id", authenticateToken, requireEditor, deleteNotification);
router.post("/:id/send", authenticateToken, requireEditor, sendNotification);
router.post("/breaking", authenticateToken, requireEditor, sendBreakingNews);

module.exports = router;
