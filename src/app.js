// src/app.js
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");

// Import routes
const authRoutes = require("./routes/auth");
const articleRoutes = require("./routes/articles");
const categoryRoutes = require("./routes/categories");
const epaperRoutes = require("./routes/epapers");
const highlightRoutes = require("./routes/highlights");
const nitRoutes = require("./routes/nit");
const notificationRoutes = require("./routes/notifications");
const inshortsRoutes = require("./routes/inshorts");
const youtubeRoutes = require("./routes/youtube");

const app = express();

// Trust proxy for Render (fixes rate limiting warning)
app.set("trust proxy", true);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: false, // Disable for CMS functionality
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration
app.use(
  cors({
    origin: true, // Allow all origins temporarily
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  })
);

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // limit uploads
  message: { error: "Too many uploads, please try again later." },
});

// Basic middleware
app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static files
app.use("/public", express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

// Apply rate limiting to API routes
app.use("/api", apiLimiter);
app.use("/api/*/upload", uploadLimiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/epapers", epaperRoutes);
app.use("/api/highlights", highlightRoutes);
app.use("/api/nit", nitRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/inshorts", inshortsRoutes);
app.use("/api/youtube", youtubeRoutes);

// Upload routes
const {
  uploadSingleImage,
  uploadSinglePDF,
  handleUploadError,
} = require("./middleware/upload");
const { authenticateToken } = require("./middleware/auth");
app.post(
  "/api/upload/image",
  authenticateToken,
  uploadSingleImage,
  handleUploadError,
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }
    res.json({
      success: true,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: req.file.optimizedUrl || `/uploads/images/${req.file.filename}`,
        thumbnailUrl: req.file.thumbnailUrl,
      },
    });
  }
);

app.post(
  "/api/upload/pdf",
  authenticateToken,
  uploadSinglePDF,
  handleUploadError,
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file provided" });
    }
    res.json({
      success: true,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        url: `/uploads/pdfs/${req.file.filename}`,
      },
    });
  }
);

// Serve CMS static files (assets)
app.use(
  "/cms/assets",
  express.static(path.join(__dirname, "../cms-frontend/assets"))
);

// CMS route - serve index.html for /cms
app.get("/cms", (req, res) => {
  res.sendFile(path.join(__dirname, "../cms-frontend/index.html"));
});

// CMS route - serve index.html for all /cms/* routes
app.get("/cms/*", (req, res) => {
  res.sendFile(path.join(__dirname, "../cms-frontend/index.html"));
});

// Catch-all for API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({
    error: "API endpoint not found",
    path: req.path,
    method: req.method,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);

  // Prisma errors
  if (err.code === "P2002") {
    return res
      .status(400)
      .json({ error: "Duplicate entry. Record already exists." });
  }

  if (err.code === "P2025") {
    return res.status(404).json({ error: "Record not found." });
  }

  // Multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(400)
      .json({ error: "File too large. Maximum size is 10MB." });
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({ error: "Unexpected file field." });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token." });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expired." });
  }

  // Default error
  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message || "Something went wrong",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

module.exports = app;
