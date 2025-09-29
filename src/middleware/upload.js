// src/middleware/upload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const { uploadImage: uploadImageToCloudinary, uploadPDF: uploadPDFToCloudinary, uploadHighlight: uploadHighlightToCloudinary, isConfigured } = require("../services/cloudinary");

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Create upload directories
const uploadsDir = path.join(__dirname, "../../public/uploads");
const imagesDir = path.join(uploadsDir, "images");
const pdfsDir = path.join(uploadsDir, "pdfs");
const thumbnailsDir = path.join(uploadsDir, "thumbnails");

ensureDirectoryExists(imagesDir);
ensureDirectoryExists(pdfsDir);
ensureDirectoryExists(thumbnailsDir);

// Storage configuration for different file types
const createStorage = (subfolder) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(uploadsDir, subfolder);
      ensureDirectoryExists(uploadPath);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Generate unique filename with timestamp
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const name = file.originalname
        .replace(ext, "")
        .replace(/[^a-zA-Z0-9]/g, "-");
      cb(null, `${name}-${uniqueSuffix}${ext}`);
    },
  });
};

// File filters
const imageFilter = (req, file, cb) => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (JPEG, PNG, WebP) are allowed"), false);
  }
};

const pdfFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

// Upload configurations
const uploadImage = multer({
  storage: createStorage("images"),
  fileFilter: imageFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    files: 5,
  },
});

const uploadPDF = multer({
  storage: createStorage("pdfs"),
  fileFilter: pdfFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for PDFs
    files: 2,
  },
});

// Image processing middleware
exports.processImage = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const originalPath = req.file.path;
    const filename = req.file.filename;
    const nameWithoutExt = path.parse(filename).name;

    // Create optimized versions
    const optimizedPath = path.join(
      imagesDir,
      `${nameWithoutExt}-optimized.webp`
    );
    const thumbnailPath = path.join(
      thumbnailsDir,
      `${nameWithoutExt}-thumb.webp`
    );

    // Optimize original image
    await sharp(originalPath)
      .resize(1200, 800, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toFile(optimizedPath);

    // Create thumbnail
    await sharp(originalPath)
      .resize(300, 200, {
        fit: "cover",
      })
      .webp({ quality: 80 })
      .toFile(thumbnailPath);

    // Update file info in request
    req.file.optimizedPath = optimizedPath;
    req.file.thumbnailPath = thumbnailPath;
    req.file.optimizedUrl = `/uploads/images/${nameWithoutExt}-optimized.webp`;
    req.file.thumbnailUrl = `/uploads/thumbnails/${nameWithoutExt}-thumb.webp`;
    req.file.originalUrl = `/uploads/images/${filename}`;

    next();
  } catch (error) {
    console.error("Image processing error:", error);
    next(error);
  }
};

// PDF thumbnail generation (placeholder - you can enhance this)
exports.processPDF = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const filename = req.file.filename;
    const nameWithoutExt = path.parse(filename).name;

    // For now, just set the URL - you can add PDF thumbnail generation later
    req.file.pdfUrl = `/uploads/pdfs/${filename}`;
    req.file.thumbnailUrl = `/uploads/thumbnails/pdf-placeholder.png`;

    next();
  } catch (error) {
    console.error("PDF processing error:", error);
    next(error);
  }
};

// Cloudinary upload middleware
exports.uploadToCloudinary = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const fileType = req.file.mimetype.startsWith('image/') ? 'image' :
                    req.file.mimetype === 'application/pdf' ? 'pdf' : 'unknown';

    let uploadResult;

    if (fileType === 'image') {
      // Check if this is for highlights (based on route or body parameter)
      const isHighlight = req.route.path.includes('/highlights') || req.body.type === 'highlight';

      if (isHighlight) {
        uploadResult = await uploadHighlightToCloudinary(req.file.path);
      } else {
        uploadResult = await uploadImageToCloudinary(req.file.path);
      }
    } else if (fileType === 'pdf') {
      uploadResult = await uploadPDFToCloudinary(req.file.path);
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    if (!uploadResult.success) {
      return res.status(500).json({ error: uploadResult.error });
    }

    // Clean up temporary file
    try {
      fs.unlinkSync(req.file.path);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    // Add Cloudinary result to request
    req.cloudinaryResult = uploadResult;

    next();
  } catch (error) {
    console.error('Cloudinary upload middleware error:', error);
    next(error);
  }
};

// Export upload middleware
exports.uploadSingleImage = uploadImage.single("image");
exports.uploadMultipleImages = uploadImage.array("images", 5);
exports.uploadSinglePDF = uploadPDF.single("pdf");
exports.uploadImageAndPDF = uploadPDF.fields([
  { name: "image", maxCount: 1 },
  { name: "pdf", maxCount: 1 },
]);

// Error handling middleware for upload errors
exports.handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error:
          "File too large. Maximum size is 10MB for images and 50MB for PDFs.",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        error: "Too many files. Maximum 5 files allowed.",
      });
    }
    if (error.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        error: "Unexpected file field.",
      });
    }
  }

  if (error.message.includes("Only")) {
    return res.status(400).json({ error: error.message });
  }

  next(error);
};
