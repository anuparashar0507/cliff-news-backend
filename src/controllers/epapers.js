// src/controllers/epapers.js
const { PrismaClient } = require("@prisma/client");
const path = require("path");
const fs = require("fs");

const prisma = new PrismaClient();

// Upload e-paper
exports.uploadEPaper = async (req, res) => {
  try {
    const { title, date, language, description } = req.body;
    const file = req.file;
    const userId = req.user.id; // From auth middleware

    if (!file) {
      return res.status(400).json({ error: "PDF file is required" });
    }

    if (!title || !date || !language) {
      return res.status(400).json({
        error: "Title, date, and language are required",
      });
    }

    // Validate language
    if (!["ENGLISH", "HINDI"].includes(language.toUpperCase())) {
      return res
        .status(400)
        .json({ error: "Language must be ENGLISH or HINDI" });
    }

    // Check if e-paper already exists for this date and language
    const existingEPaper = await prisma.ePaper.findFirst({
      where: {
        date: new Date(date),
        language: language.toUpperCase(),
      },
    });

    if (existingEPaper) {
      return res.status(400).json({
        error: "E-paper already exists for this date and language",
      });
    }

    // Archive all other e-papers (set status to ARCHIVED)
    await prisma.ePaper.updateMany({
      where: {
        status: "ACTIVE",
      },
      data: {
        status: "ARCHIVED",
      },
    });

    // Create organized file path
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    const languageLower = language.toLowerCase();

    // Create directory structure: /uploads/pdfs/language/year/month/
    const uploadDir = path.join(
      __dirname,
      "../../public/uploads/pdfs",
      languageLower,
      year.toString(),
      month
    );
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Generate filename: YYYY-MM-DD-language.pdf
    const filename = `${year}-${month}-${day}-${languageLower}.pdf`;
    const filePath = path.join(uploadDir, filename);
    const relativePath = `/uploads/pdfs/${languageLower}/${year}/${month}/${filename}`;

    // Move uploaded file to organized location
    fs.renameSync(file.path, filePath);

    // Create e-paper record
    const epaper = await prisma.ePaper.create({
      data: {
        title: title.trim(),
        date: new Date(date),
        language: language.toUpperCase(),
        pdfUrl: relativePath,
        fileSize: file.size,
        pageCount: 1, // You can extract this from PDF metadata later
        status: "ACTIVE",
        description: description?.trim(),
        uploadedBy: userId,
      },
    });

    res.status(201).json({
      success: true,
      epaper,
    });
  } catch (error) {
    console.error("E-paper upload error:", error);
    res.status(500).json({ error: "Failed to upload e-paper" });
  }
};

// Get all e-papers with pagination and filtering
exports.getEPapers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      language,
      status,
      startDate,
      endDate,
      sortBy = "date",
      sortOrder = "desc",
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (language) {
      where.language = language.toUpperCase();
    }

    if (status) {
      where.status = status.toUpperCase();
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

    const [epapers, total] = await Promise.all([
      prisma.ePaper.findMany({
        where,
        orderBy,
        skip: offset,
        take: parseInt(limit),
        include: {
          uploader: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.ePaper.count({ where }),
    ]);

    res.json({
      success: true,
      epapers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get e-papers error:", error);
    res.status(500).json({ error: "Failed to fetch e-papers" });
  }
};

// Get today's e-paper (or latest if none today)
exports.getTodayEPaper = async (req, res) => {
  try {
    const { language = "ENGLISH" } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // First try to get today's ACTIVE e-paper
    let epaper = await prisma.ePaper.findFirst({
      where: {
        language: language.toUpperCase(),
        status: "ACTIVE",
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // If no paper for today, get the latest ACTIVE paper
    if (!epaper) {
      epaper = await prisma.ePaper.findFirst({
        where: {
          language: language.toUpperCase(),
          status: "ACTIVE",
        },
        orderBy: { date: "desc" },
      });
    }

    if (!epaper) {
      return res.status(404).json({
        error: `No active e-paper found for ${language} language`,
      });
    }

    // Increment view count
    await prisma.ePaper.update({
      where: { id: epaper.id },
      data: { viewCount: { increment: 1 } },
    });

    res.json({
      success: true,
      epaper,
      isToday: epaper.date >= today && epaper.date < tomorrow,
    });
  } catch (error) {
    console.error("Get today e-paper error:", error);
    res.status(500).json({ error: "Failed to fetch today's e-paper" });
  }
};

// Get e-paper by specific date
exports.getEPaperByDate = async (req, res) => {
  try {
    const { date, language = "ENGLISH" } = req.params;
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const epaper = await prisma.ePaper.findFirst({
      where: {
        language: language.toUpperCase(),
        date: {
          gte: targetDate,
          lt: nextDay,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!epaper) {
      return res.status(404).json({
        error: "E-paper not found for this date and language",
      });
    }

    // Increment download count
    await prisma.ePaper.update({
      where: { id: epaper.id },
      data: { downloadCount: { increment: 1 } },
    });

    res.json({
      success: true,
      epaper,
    });
  } catch (error) {
    console.error("Get e-paper by date error:", error);
    res.status(500).json({ error: "Failed to fetch e-paper" });
  }
};

// Get single e-paper by ID
exports.getEPaper = async (req, res) => {
  try {
    const { id } = req.params;

    const epaper = await prisma.ePaper.findUnique({
      where: { id },
    });

    if (!epaper) {
      return res.status(404).json({ error: "E-paper not found" });
    }

    res.json({
      success: true,
      epaper,
    });
  } catch (error) {
    console.error("Get e-paper error:", error);
    res.status(500).json({ error: "Failed to fetch e-paper" });
  }
};

// Update e-paper
exports.updateEPaper = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, date, language } = req.body;

    const epaper = await prisma.ePaper.findUnique({
      where: { id },
    });

    if (!epaper) {
      return res.status(404).json({ error: "E-paper not found" });
    }

    const updateData = {};
    if (title) updateData.title = title.trim();
    if (date) updateData.date = new Date(date);
    if (language && ["ENGLISH", "HINDI"].includes(language.toUpperCase())) {
      updateData.language = language.toUpperCase();
    }

    const updatedEPaper = await prisma.ePaper.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      epaper: updatedEPaper,
    });
  } catch (error) {
    console.error("Update e-paper error:", error);
    res.status(500).json({ error: "Failed to update e-paper" });
  }
};

// Delete e-paper
exports.deleteEPaper = async (req, res) => {
  try {
    const { id } = req.params;

    const epaper = await prisma.ePaper.findUnique({
      where: { id },
    });

    if (!epaper) {
      return res.status(404).json({ error: "E-paper not found" });
    }

    // Delete the file from filesystem
    try {
      const pdfPath = path.join(__dirname, "../../public", epaper.pdfUrl);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
      }
    } catch (fileError) {
      console.error("Error deleting PDF file:", fileError);
    }

    // Delete from database
    await prisma.ePaper.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "E-paper deleted successfully",
    });
  } catch (error) {
    console.error("Delete e-paper error:", error);
    res.status(500).json({ error: "Failed to delete e-paper" });
  }
};

// Get e-papers calendar (dates with available papers)
exports.getEPapersCalendar = async (req, res) => {
  try {
    const { language, year, month } = req.query;
    const where = {};

    if (language) {
      where.language = language.toUpperCase();
    }

    // Filter by year and month if provided
    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const epapers = await prisma.ePaper.findMany({
      where,
      select: {
        id: true,
        date: true,
        language: true,
        title: true,
      },
      orderBy: { date: "desc" },
    });

    // Group by date
    const calendar = epapers.reduce((acc, epaper) => {
      const dateKey = epaper.date.toISOString().split("T")[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(epaper);
      return acc;
    }, {});

    res.json({
      success: true,
      calendar,
      availableDates: Object.keys(calendar).sort().reverse(),
    });
  } catch (error) {
    console.error("Get e-papers calendar error:", error);
    res.status(500).json({ error: "Failed to fetch e-papers calendar" });
  }
};

// Get e-paper analytics
exports.getEPaperAnalytics = async (req, res) => {
  try {
    const { period = "month" } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const [
      totalEpapers,
      activeEpapers,
      archivedEpapers,
      totalDownloads,
      totalViews,
      popularEpapers,
      languageStats,
      recentEpapers,
    ] = await Promise.all([
      prisma.ePaper.count(),
      prisma.ePaper.count({ where: { status: "ACTIVE" } }),
      prisma.ePaper.count({ where: { status: "ARCHIVED" } }),
      prisma.ePaper.aggregate({
        _sum: { downloadCount: true },
      }),
      prisma.ePaper.aggregate({
        _sum: { viewCount: true },
      }),
      prisma.ePaper.findMany({
        where: {
          date: { gte: startDate },
        },
        orderBy: { downloadCount: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          date: true,
          language: true,
          downloadCount: true,
          viewCount: true,
        },
      }),
      prisma.ePaper.groupBy({
        by: ["language"],
        _count: { language: true },
        where: { date: { gte: startDate } },
      }),
      prisma.ePaper.findMany({
        where: { date: { gte: startDate } },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          title: true,
          date: true,
          language: true,
          status: true,
          downloadCount: true,
          viewCount: true,
        },
      }),
    ]);

    res.json({
      success: true,
      analytics: {
        total: {
          epapers: totalEpapers,
          active: activeEpapers,
          archived: archivedEpapers,
          downloads: totalDownloads._sum.downloadCount || 0,
          views: totalViews._sum.viewCount || 0,
        },
        popular: popularEpapers,
        languageDistribution: languageStats,
        recent: recentEpapers,
        period: period,
      },
    });
  } catch (error) {
    console.error("Get e-paper analytics error:", error);
    res.status(500).json({ error: "Failed to fetch e-paper analytics" });
  }
};
