// src/controllers/highlights.js
const { PrismaClient } = require("@prisma/client");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");

const prisma = new PrismaClient();

// Utility function to get client IP
const getClientIP = (req) => {
  return (
    req.ip ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.headers["x-forwarded-for"]?.split(",")[0]
  );
};

// Utility function to detect device type
const getDeviceType = (userAgent) => {
  if (!userAgent) return "DESKTOP";
  const ua = userAgent.toLowerCase();
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
    return "MOBILE";
  } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return "TABLET";
  }
  return "DESKTOP";
};

// Utility function to get image dimensions and metadata
const getImageMetadata = async (filePath) => {
  try {
    const metadata = await sharp(filePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format.toUpperCase(),
      size: fs.statSync(filePath).size,
      aspectRatio: `${metadata.width}:${metadata.height}`,
    };
  } catch (error) {
    console.error("Error getting image metadata:", error);
    return null;
  }
};

// Create new highlight with advanced features
exports.createHighlight = async (req, res) => {
  try {
    const {
      title,
      caption,
      category,
      priority = "NORMAL",
      tags,
      location,
      source,
      altText,
      isPublic = true,
      allowDownload = true,
      allowSharing = true,
      addWatermark = true,
    } = req.body;

    const file = req.file;
    const userId = req.user?.id;

    if (!file) {
      return res.status(400).json({ error: "Image file is required" });
    }

    // Generate default title if not provided
    const finalTitle =
      title?.trim() || `Highlight - ${new Date().toLocaleDateString()}`;

    // Get image metadata
    const imageMetadata = await getImageMetadata(file.path);

    // Generate thumbnail
    const thumbnailFilename = `thumb_${file.filename}`;
    const thumbnailPath = path.join(path.dirname(file.path), thumbnailFilename);

    await sharp(file.path)
      .resize(400, 400, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    const highlight = await prisma.highlight.create({
      data: {
        title: finalTitle,
        caption: caption?.trim() || null,
        imageUrl:
          file.optimizedUrl ||
          file.originalUrl ||
          `/uploads/images/${file.filename}`,
        thumbnailUrl: `/uploads/images/${thumbnailFilename}`,
        category: category?.trim() || null,
        priority: priority.toUpperCase(),
        tags: tags?.trim() || null,
        location: location?.trim() || null,
        source: source?.trim() || null,
        altText: altText?.trim() || null,
        aspectRatio: imageMetadata?.aspectRatio || null,
        fileSize: imageMetadata?.size || null,
        imageWidth: imageMetadata?.width || null,
        imageHeight: imageMetadata?.height || null,
        format: imageMetadata?.format || null,
        isPublic: isPublic === "true" || isPublic === true,
        allowDownload: allowDownload === "true" || allowDownload === true,
        allowSharing: allowSharing === "true" || allowSharing === true,
        addWatermark: addWatermark === "true" || addWatermark === true,
        uploadedBy: userId,
        date: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      highlight,
    });
  } catch (error) {
    console.error("Create highlight error:", error);
    res.status(500).json({ error: "Failed to create highlight" });
  }
};

// Get all highlights with advanced filtering and pagination
exports.getHighlights = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      priority,
      tags,
      location,
      startDate,
      endDate,
      sortBy = "date",
      sortOrder = "desc",
      search,
      isPublic = true,
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {
      isPublic: isPublic === "true" || isPublic === true,
    };

    // Apply filters
    if (category) {
      where.category = {
        contains: category,
        mode: "insensitive",
      };
    }

    if (priority) {
      where.priority = priority.toUpperCase();
    }

    if (tags) {
      where.tags = {
        contains: tags,
        mode: "insensitive",
      };
    }

    if (location) {
      where.location = {
        contains: location,
        mode: "insensitive",
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { caption: { contains: search, mode: "insensitive" } },
        { tags: { contains: search, mode: "insensitive" } },
      ];
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.date = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where.date = {
        lte: new Date(endDate),
      };
    }

    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [highlights, total] = await Promise.all([
      prisma.highlight.findMany({
        where,
        orderBy,
        skip: offset,
        take: parseInt(limit),
        include: {
          uploader: {
            select: { name: true, email: true },
          },
        },
      }),
      prisma.highlight.count({ where }),
    ]);

    res.json({
      success: true,
      highlights,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get highlights error:", error);
    res.status(500).json({ error: "Failed to fetch highlights" });
  }
};

// Get single highlight with analytics
exports.getHighlight = async (req, res) => {
  try {
    const { id } = req.params;

    const highlight = await prisma.highlight.findUnique({
      where: { id },
      include: {
        uploader: {
          select: { name: true, email: true },
        },
      },
    });

    if (!highlight) {
      return res.status(404).json({ error: "Highlight not found" });
    }

    // Track view interaction
    await prisma.highlightInteraction.create({
      data: {
        highlightId: id,
        interactionType: "VIEW",
        platform: req.headers["user-agent"]?.includes("Mobile")
          ? "ANDROID"
          : "WEB",
        userAgent: req.headers["user-agent"],
        ipAddress: getClientIP(req),
        referrer: req.headers.referer,
        location: null, // Could be enhanced with IP geolocation
        deviceType: getDeviceType(req.headers["user-agent"]),
      },
    });

    // Update view count
    await prisma.highlight.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    res.json({
      success: true,
      highlight,
    });
  } catch (error) {
    console.error("Get highlight error:", error);
    res.status(500).json({ error: "Failed to fetch highlight" });
  }
};

// Track highlight interaction
exports.trackInteraction = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, platform, metadata = {} } = req.body;

    const interaction = await prisma.highlightInteraction.create({
      data: {
        highlightId: id,
        interactionType: type.toUpperCase(),
        platform: platform?.toUpperCase(),
        userAgent: req.headers["user-agent"],
        ipAddress: getClientIP(req),
        referrer: req.headers.referer,
        location: null,
        deviceType: getDeviceType(req.headers["user-agent"]),
        downloadFormat: metadata.downloadFormat,
        downloadType: metadata.downloadType,
      },
    });

    // Update highlight counters
    const updateData = {};
    switch (type.toUpperCase()) {
      case "VIEW":
        updateData.viewCount = { increment: 1 };
        break;
      case "DOWNLOAD":
        updateData.downloadCount = { increment: 1 };
        break;
      case "SHARE":
        updateData.shareCount = { increment: 1 };
        break;
      case "LIKE":
        updateData.likeCount = { increment: 1 };
        break;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.highlight.update({
        where: { id },
        data: updateData,
      });
    }

    res.json({
      success: true,
      interaction,
    });
  } catch (error) {
    console.error("Track interaction error:", error);
    res.status(500).json({ error: "Failed to track interaction" });
  }
};

// Download highlight with watermark
exports.downloadHighlight = async (req, res) => {
  try {
    const { id } = req.params;
    const { format = "original", type = "jpg" } = req.query;

    const highlight = await prisma.highlight.findUnique({
      where: { id },
    });

    if (!highlight) {
      return res.status(404).json({ error: "Highlight not found" });
    }

    // Track download interaction
    await prisma.highlightInteraction.create({
      data: {
        highlightId: id,
        interactionType: "DOWNLOAD",
        platform: "WEB",
        userAgent: req.headers["user-agent"],
        ipAddress: getClientIP(req),
        deviceType: getDeviceType(req.headers["user-agent"]),
        downloadFormat: format.toUpperCase(),
        downloadType: type.toUpperCase(),
      },
    });

    // Update download count
    await prisma.highlight.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
    });

    const imagePath = path.join(__dirname, "../../public", highlight.imageUrl);

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: "Image file not found" });
    }

    let processedImage;
    const sharpInstance = sharp(imagePath);

    // Apply size formatting
    switch (format) {
      case "large":
        processedImage = sharpInstance.resize(1280, 720, {
          fit: "inside",
          withoutEnlargement: true,
        });
        break;
      case "medium":
        processedImage = sharpInstance.resize(800, 450, {
          fit: "inside",
          withoutEnlargement: true,
        });
        break;
      case "small":
        processedImage = sharpInstance.resize(400, 225, {
          fit: "inside",
          withoutEnlargement: true,
        });
        break;
      default:
        processedImage = sharpInstance;
    }

    // Apply watermark if enabled
    if (highlight.addWatermark) {
      // Create watermark overlay
      const watermarkSvg = `
        <svg width="300" height="80" xmlns="http://www.w3.org/2000/svg">
          <rect width="300" height="80" fill="rgba(0,0,0,0.7)" rx="12"/>
          <text x="20" y="25" fill="white" font-family="Arial, sans-serif" font-size="16" font-weight="bold">THE CLIFF NEWS</text>
          <text x="20" y="45" fill="white" font-family="Arial, sans-serif" font-size="12">${highlight.title}</text>
          <text x="20" y="65" fill="white" font-family="Arial, sans-serif" font-size="10">Visit: thecliffnews.in</text>
        </svg>
      `;

      const watermarkBuffer = Buffer.from(watermarkSvg);

      processedImage = processedImage.composite([
        {
          input: watermarkBuffer,
          gravity: "southeast",
          blend: "over",
        },
      ]);
    }

    // Set content type based on requested format
    const contentType =
      type === "png"
        ? "image/png"
        : type === "webp"
        ? "image/webp"
        : "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${highlight.title.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}.${type}"`
    );

    const stream = processedImage.toFormat(type).pipe(res);
  } catch (error) {
    console.error("Download highlight error:", error);
    res.status(500).json({ error: "Failed to download highlight" });
  }
};

// Update highlight
exports.updateHighlight = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      caption,
      category,
      priority,
      tags,
      location,
      source,
      altText,
      isPublic,
      allowDownload,
      allowSharing,
      addWatermark,
    } = req.body;

    const file = req.file;

    const existingHighlight = await prisma.highlight.findUnique({
      where: { id },
    });

    if (!existingHighlight) {
      return res.status(404).json({ error: "Highlight not found" });
    }

    const updateData = {};
    if (title) updateData.title = title.trim();
    if (caption !== undefined) updateData.caption = caption?.trim() || null;
    if (category !== undefined) updateData.category = category?.trim() || null;
    if (priority) updateData.priority = priority.toUpperCase();
    if (tags !== undefined) updateData.tags = tags?.trim() || null;
    if (location !== undefined) updateData.location = location?.trim() || null;
    if (source !== undefined) updateData.source = source?.trim() || null;
    if (altText !== undefined) updateData.altText = altText?.trim() || null;
    if (isPublic !== undefined)
      updateData.isPublic = isPublic === "true" || isPublic === true;
    if (allowDownload !== undefined)
      updateData.allowDownload =
        allowDownload === "true" || allowDownload === true;
    if (allowSharing !== undefined)
      updateData.allowSharing =
        allowSharing === "true" || allowSharing === true;
    if (addWatermark !== undefined)
      updateData.addWatermark =
        addWatermark === "true" || addWatermark === true;

    // Update image if new file uploaded
    if (file) {
      const imageMetadata = await getImageMetadata(file.path);

      updateData.imageUrl =
        file.optimizedUrl ||
        file.originalUrl ||
        `/uploads/images/${file.filename}`;
      if (imageMetadata) {
        updateData.aspectRatio = imageMetadata.aspectRatio;
        updateData.fileSize = imageMetadata.size;
        updateData.imageWidth = imageMetadata.width;
        updateData.imageHeight = imageMetadata.height;
        updateData.format = imageMetadata.format;
      }

      // Delete old image file
      try {
        const oldImagePath = path.join(
          __dirname,
          "../../public",
          existingHighlight.imageUrl
        );
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      } catch (fileError) {
        console.error("Error deleting old image:", fileError);
      }
    }

    const highlight = await prisma.highlight.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      highlight,
    });
  } catch (error) {
    console.error("Update highlight error:", error);
    res.status(500).json({ error: "Failed to update highlight" });
  }
};

// Delete highlight
exports.deleteHighlight = async (req, res) => {
  try {
    const { id } = req.params;

    const highlight = await prisma.highlight.findUnique({
      where: { id },
    });

    if (!highlight) {
      return res.status(404).json({ error: "Highlight not found" });
    }

    // Delete image files
    try {
      const imagePath = path.join(
        __dirname,
        "../../public",
        highlight.imageUrl
      );
      const thumbnailPath = path.join(
        __dirname,
        "../../public",
        highlight.thumbnailUrl
      );

      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    } catch (fileError) {
      console.error("Error deleting image files:", fileError);
    }

    // Delete from database (cascade will handle interactions and shares)
    await prisma.highlight.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Highlight deleted successfully",
    });
  } catch (error) {
    console.error("Delete highlight error:", error);
    res.status(500).json({ error: "Failed to delete highlight" });
  }
};

// Bulk operations
exports.bulkOperation = async (req, res) => {
  try {
    const { action, highlightIds, data } = req.body;

    if (!action || !highlightIds || !Array.isArray(highlightIds)) {
      return res
        .status(400)
        .json({ error: "Invalid bulk operation parameters" });
    }

    let result;
    switch (action) {
      case "delete":
        result = await prisma.highlight.deleteMany({
          where: { id: { in: highlightIds } },
        });
        break;
      case "update_category":
        result = await prisma.highlight.updateMany({
          where: { id: { in: highlightIds } },
          data: { category: data.category },
        });
        break;
      case "update_priority":
        result = await prisma.highlight.updateMany({
          where: { id: { in: highlightIds } },
          data: { priority: data.priority },
        });
        break;
      case "toggle_public":
        result = await prisma.highlight.updateMany({
          where: { id: { in: highlightIds } },
          data: { isPublic: data.isPublic },
        });
        break;
      default:
        return res.status(400).json({ error: "Invalid bulk action" });
    }

    res.json({
      success: true,
      message: `Bulk ${action} completed`,
      affected: result.count,
    });
  } catch (error) {
    console.error("Bulk operation error:", error);
    res.status(500).json({ error: "Failed to perform bulk operation" });
  }
};

// Get highlight analytics
exports.getHighlightAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const { period = "30days" } = req.query;

    const highlight = await prisma.highlight.findUnique({
      where: { id },
    });

    if (!highlight) {
      return res.status(404).json({ error: "Highlight not found" });
    }

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case "7days":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30days":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90days":
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get interaction statistics
    const [interactions, shares] = await Promise.all([
      prisma.highlightInteraction.findMany({
        where: {
          highlightId: id,
          createdAt: { gte: startDate },
        },
      }),
      prisma.highlightShare.findMany({
        where: {
          highlightId: id,
          createdAt: { gte: startDate },
        },
      }),
    ]);

    // Calculate analytics
    const analytics = {
      totalViews: highlight.viewCount,
      totalDownloads: highlight.downloadCount,
      totalShares: highlight.shareCount,
      totalLikes: highlight.likeCount,
      periodStats: {
        views: interactions.filter((i) => i.interactionType === "VIEW").length,
        downloads: interactions.filter((i) => i.interactionType === "DOWNLOAD")
          .length,
        shares: interactions.filter((i) => i.interactionType === "SHARE")
          .length,
        likes: interactions.filter((i) => i.interactionType === "LIKE").length,
      },
      platformBreakdown: {
        web: interactions.filter((i) => i.platform === "WEB").length,
        mobile: interactions.filter(
          (i) => i.platform === "ANDROID" || i.platform === "IOS"
        ).length,
      },
      shareBreakdown: {
        facebook: shares.filter((s) => s.platform === "FACEBOOK").length,
        twitter: shares.filter((s) => s.platform === "TWITTER").length,
        whatsapp: shares.filter((s) => s.platform === "WHATSAPP").length,
        email: shares.filter((s) => s.platform === "EMAIL").length,
        linkedin: shares.filter((s) => s.platform === "LINKEDIN").length,
      },
      downloadFormats: {
        original: interactions.filter((i) => i.downloadFormat === "ORIGINAL")
          .length,
        large: interactions.filter((i) => i.downloadFormat === "LARGE").length,
        medium: interactions.filter((i) => i.downloadFormat === "MEDIUM")
          .length,
        small: interactions.filter((i) => i.downloadFormat === "SMALL").length,
      },
    };

    res.json({
      success: true,
      analytics,
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};

// Get highlights by category
exports.getHighlightsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;

    const highlights = await prisma.highlight.findMany({
      where: {
        category: {
          contains: category,
          mode: "insensitive",
        },
        isPublic: true,
      },
      orderBy: { date: "desc" },
      take: parseInt(limit),
    });

    res.json({
      success: true,
      highlights,
      category,
    });
  } catch (error) {
    console.error("Get highlights by category error:", error);
    res.status(500).json({ error: "Failed to fetch highlights by category" });
  }
};

// Get recent highlights for homepage
exports.getRecentHighlights = async (req, res) => {
  try {
    const { limit = 5, priority } = req.query;

    const where = { isPublic: true };
    if (priority) {
      where.priority = priority.toUpperCase();
    }

    const highlights = await prisma.highlight.findMany({
      where,
      orderBy: { date: "desc" },
      take: parseInt(limit),
    });

    res.json({
      success: true,
      highlights,
    });
  } catch (error) {
    console.error("Get recent highlights error:", error);
    res.status(500).json({ error: "Failed to fetch recent highlights" });
  }
};

// Get highlight categories
exports.getHighlightCategories = async (req, res) => {
  try {
    const categories = await prisma.highlight.findMany({
      where: {
        category: {
          not: null,
        },
        isPublic: true,
      },
      select: {
        category: true,
      },
      distinct: ["category"],
    });

    const categoryList = categories
      .map((item) => item.category)
      .filter(Boolean)
      .sort();

    res.json({
      success: true,
      categories: categoryList,
    });
  } catch (error) {
    console.error("Get highlight categories error:", error);
    res.status(500).json({ error: "Failed to fetch highlight categories" });
  }
};

// Get overall highlights analytics
exports.getHighlightsAnalytics = async (req, res) => {
  try {
    const { period = "30days" } = req.query;

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case "7days":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30days":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90days":
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    const [
      totalHighlights,
      totalViews,
      totalDownloads,
      totalShares,
      categoryStats,
      topHighlights,
    ] = await Promise.all([
      prisma.highlight.count({
        where: { createdAt: { gte: startDate } },
      }),
      prisma.highlight.aggregate({
        where: { createdAt: { gte: startDate } },
        _sum: { viewCount: true },
      }),
      prisma.highlight.aggregate({
        where: { createdAt: { gte: startDate } },
        _sum: { downloadCount: true },
      }),
      prisma.highlight.aggregate({
        where: { createdAt: { gte: startDate } },
        _sum: { shareCount: true },
      }),
      prisma.highlight.groupBy({
        by: ["category"],
        where: {
          createdAt: { gte: startDate },
          category: { not: null },
        },
        _sum: { viewCount: true },
        _count: { id: true },
      }),
      prisma.highlight.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { viewCount: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          category: true,
          viewCount: true,
          downloadCount: true,
          shareCount: true,
        },
      }),
    ]);

    res.json({
      success: true,
      analytics: {
        totalHighlights,
        totalViews: totalViews._sum.viewCount || 0,
        totalDownloads: totalDownloads._sum.downloadCount || 0,
        totalShares: totalShares._sum.shareCount || 0,
        categoryStats: categoryStats.map((cat) => ({
          category: cat.category,
          count: cat._count.id,
          views: cat._sum.viewCount || 0,
        })),
        topHighlights,
      },
    });
  } catch (error) {
    console.error("Get highlights analytics error:", error);
    res.status(500).json({ error: "Failed to fetch highlights analytics" });
  }
};
