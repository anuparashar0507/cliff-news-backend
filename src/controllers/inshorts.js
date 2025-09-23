// src/controllers/inshorts.js
const { PrismaClient } = require("@prisma/client");
const {
  generateInshortContent,
  generateInshortSEO,
} = require("../services/geminiService");
const { createSlug } = require("../utils/slugify");

const prisma = new PrismaClient();

// Generate Inshort from Article
exports.generateInshort = async (req, res) => {
  try {
    const { articleId } = req.params;
    const { language = "ENGLISH" } = req.body;

    // Get the source article
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: {
        author: true,
        category: true,
      },
    });

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    // Generate Inshort content using Gemini AI
    const inshortContent = await generateInshortContent(
      article.title,
      article.content,
      language
    );

    // Generate SEO metadata for Inshort
    const seoData = await generateInshortSEO(
      inshortContent.title,
      inshortContent.content,
      language
    );

    // Create the Inshort
    const inshort = await prisma.inshort.create({
      data: {
        title: inshortContent.title,
        slug: createSlug(inshortContent.title),
        content: inshortContent.content,
        featuredImage: article.featuredImage, // Use same featured image
        metaTitle: seoData.metaTitle,
        metaDescription: seoData.metaDescription,
        ogImage: article.ogImage,
        language: language,
        readTime: inshortContent.readTime || 1,
        status: "PUBLISHED",
        publishedAt: new Date(),
        sourceArticleId: articleId,
        authorId: article.authorId,
        categoryId: article.categoryId,
        tags: article.tags || null,
      },
      include: {
        author: true,
        category: true,
      },
    });

    res.status(201).json({
      success: true,
      inshort,
      message: "Inshort generated and published successfully",
    });
  } catch (error) {
    console.error("Generate Inshort error:", error);
    res.status(500).json({ error: "Failed to generate Inshort" });
  }
};

// Get all Inshorts
exports.getInshorts = async (req, res) => {
  try {
    const {
      limit = 50,
      offset = 0,
      status,
      language,
      category,
      search,
      sort = "createdAt",
      order = "desc",
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (language) where.language = language;
    if (category) where.categoryId = category;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    const inshorts = await prisma.inshort.findMany({
      where,
      include: {
        sourceArticle: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: { [sort]: order },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.inshort.count({ where });

    res.json({
      success: true,
      inshorts,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get Inshorts error:", error);
    res.status(500).json({ error: "Failed to fetch Inshorts" });
  }
};

// Get single Inshort
exports.getInshort = async (req, res) => {
  try {
    const { id } = req.params;

    const inshort = await prisma.inshort.findUnique({
      where: { id },
      include: {
        sourceArticle: {
          select: {
            id: true,
            title: true,
            slug: true,
            content: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    if (!inshort) {
      return res.status(404).json({ error: "Inshort not found" });
    }

    res.json({
      success: true,
      inshort,
    });
  } catch (error) {
    console.error("Get Inshort error:", error);
    res.status(500).json({ error: "Failed to fetch Inshort" });
  }
};

// Update Inshort
exports.updateInshort = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      metaTitle,
      metaDescription,
      status,
      language,
      tags,
    } = req.body;

    // Check if Inshort exists
    const existingInshort = await prisma.inshort.findUnique({
      where: { id },
    });

    if (!existingInshort) {
      return res.status(404).json({ error: "Inshort not found" });
    }

    const updateData = {};
    if (title) {
      updateData.title = title;
      updateData.slug = createSlug(title);
    }
    if (content) updateData.content = content;
    if (metaTitle) updateData.metaTitle = metaTitle;
    if (metaDescription) updateData.metaDescription = metaDescription;
    if (status) {
      updateData.status = status;
      if (status === "PUBLISHED" && existingInshort.status !== "PUBLISHED") {
        updateData.publishedAt = new Date();
      }
    }
    if (language) updateData.language = language;

    // Update tags if provided
    if (tags !== undefined) {
      updateData.tags = tags;
    }

    const inshort = await prisma.inshort.update({
      where: { id },
      data: updateData,
      include: {
        sourceArticle: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    res.json({
      success: true,
      inshort,
      message: "Inshort updated successfully",
    });
  } catch (error) {
    console.error("Update Inshort error:", error);
    res.status(500).json({ error: "Failed to update Inshort" });
  }
};

// Delete Inshort
exports.deleteInshort = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if Inshort exists
    const inshort = await prisma.inshort.findUnique({
      where: { id },
    });

    if (!inshort) {
      return res.status(404).json({ error: "Inshort not found" });
    }

    // Delete associated tags first
    await prisma.inshortTag.deleteMany({
      where: { inshortId: id },
    });

    // Delete the Inshort
    await prisma.inshort.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Inshort deleted successfully",
    });
  } catch (error) {
    console.error("Delete Inshort error:", error);
    res.status(500).json({ error: "Failed to delete Inshort" });
  }
};

// Get Inshorts by Article
exports.getInshortsByArticle = async (req, res) => {
  try {
    const { articleId } = req.params;

    const inshorts = await prisma.inshort.findMany({
      where: { sourceArticleId: articleId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      inshorts,
    });
  } catch (error) {
    console.error("Get Inshorts by Article error:", error);
    res.status(500).json({ error: "Failed to fetch Inshorts" });
  }
};

// Publish Inshort
exports.publishInshort = async (req, res) => {
  try {
    const { id } = req.params;

    const inshort = await prisma.inshort.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
      },
      include: {
        sourceArticle: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    res.json({
      success: true,
      inshort,
      message: "Inshort published successfully",
    });
  } catch (error) {
    console.error("Publish Inshort error:", error);
    res.status(500).json({ error: "Failed to publish Inshort" });
  }
};
