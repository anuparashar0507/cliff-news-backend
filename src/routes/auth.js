// src/routes/auth.js
const express = require("express");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const {
  login,
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  getProfile,
  updateProfile,
  verifyToken,
} = require("../controllers/auth");

const router = express.Router();

// Public routes
router.post("/login", login);

// Protected routes
router.get("/verify", authenticateToken, verifyToken);
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);

// Admin only routes
router.post("/users", authenticateToken, requireAdmin, createUser);
router.get("/users", authenticateToken, requireAdmin, getUsers);
router.put("/users/:id", authenticateToken, requireAdmin, updateUser);
router.delete("/users/:id", authenticateToken, requireAdmin, deleteUser);

module.exports = router;
