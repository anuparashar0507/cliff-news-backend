// src/controllers/articles.js
const getPrismaClient = require("../lib/prisma");
const {
  generateQuickRead,
  generateSEOMetadata,
  generateTags,
  generateNewsFromContent,
  generateSEOOnly,
  regenerateWithFeedback,
  translateContent,
} = require("../services/geminiService");

// Helper function to get Prisma client
async function getPrisma() {
  return await getPrismaClient();
}
const {
  generateUniqueSlug,
  calculateReadingTime,
  generateExcerpt,
  sanitizeContent,
  validateExcerpt,
  truncateExcerpt,
} = require("../utils/slugify");

// Create new article
exports.createArticle = async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      categoryId,
      tags,
      featuredImage,
      isBreaking,
      isTopStory,
      language,
      metaTitle,
      metaDescription,
      status,
    } = req.body;

    // Validate required fields
    if (!title || !content || !categoryId) {
      return res.status(400).json({
        error: "Title, content, and category are required",
      });
    }

    // Verify category exists
    const prisma = await getPrisma();
    const category = await (
      await getPrisma()
    ).category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return res.status(400).json({ error: "Invalid category" });
    }

    // Sanitize content
    const sanitizedContent = sanitizeContent(content);

    // Generate unique slug
    const slug = await generateUniqueSlug(title, "article");

    // Generate SEO metadata if not provided
    let seoData = { metaTitle: title, metaDescription: excerpt || "" };
    if (!metaTitle || !metaDescription) {
      try {
        seoData = await generateSEOMetadata(title, sanitizedContent);
      } catch (error) {
        console.error("SEO generation failed:", error);
      }
    }

    // Calculate reading time
    const readTime = calculateReadingTime(sanitizedContent);

    // Generate or validate excerpt
    let articleExcerpt = excerpt || generateExcerpt(sanitizedContent);

    // Ensure excerpt meets word limit (25 words max)
    if (excerpt && !validateExcerpt(excerpt)) {
      articleExcerpt = truncateExcerpt(excerpt);
    }

    // Create article
    const article = await (
      await getPrisma()
    ).article.create({
      data: {
        title: title.trim(),
        slug,
        content: sanitizedContent,
        excerpt: articleExcerpt,
        featuredImage: featuredImage || null,
        metaTitle: metaTitle || seoData.metaTitle,
        metaDescription: metaDescription || seoData.metaDescription,
        ogImage: featuredImage || null,
        isBreaking: isBreaking || false,
        isTopStory: isTopStory || false,
        language: language || "ENGLISH",
        status: status || "DRAFT",
        readTime,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        authorId: req.user.id,
        categoryId,
      },
      include: {
        author: { select: { name: true, email: true } },
        category: true,
      },
    });

    // Tags are now handled as a direct field in the article creation

    // QuickRead is now handled as a direct field in the article creation

    // Fetch the complete article with relations
    const completeArticle = await (
      await getPrisma()
    ).article.findUnique({
      where: { id: article.id },
      include: {
        author: { select: { name: true, email: true } },
        category: true,
      },
    });

    res.status(201).json({
      success: true,
      article: completeArticle,
    });
  } catch (error) {
    console.error("Article creation error:", error);
    res.status(500).json({ error: "Failed to create article" });
  }
};

// Get articles with filtering and pagination
exports.getArticles = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      status,
      language,
      search,
      isBreaking,
      isTopStory,
      author,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Build filters
    if (category) where.categoryId = category;
    if (status) where.status = status;
    if (language) where.language = language;
    if (author) where.authorId = author;
    if (isBreaking !== undefined) where.isBreaking = isBreaking === "true";
    if (isTopStory !== undefined) where.isTopStory = isTopStory === "true";

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { excerpt: { contains: search, mode: "insensitive" } },
      ];
    }

    // For public API, only show published articles
    if (!req.user) {
      where.status = "PUBLISHED";
    }

    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [articles, total] = await Promise.all([
      (
        await getPrisma()
      ).article.findMany({
        where,
        include: {
          author: { select: { name: true } },
          category: { select: { name: true, slug: true, color: true } },
        },
        orderBy,
        skip: offset,
        take: parseInt(limit),
      }),
      (await getPrisma()).article.count({ where }),
    ]);

    res.json({
      success: true,
      articles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get articles error:", error);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
};

// Get single article by ID
exports.getArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await (
      await getPrisma()
    ).article.findUnique({
      where: { id },
      include: {
        author: { select: { name: true, email: true } },
        category: true,
      },
    });

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    // Check permissions for unpublished articles
    if (article.status !== "PUBLISHED" && !req.user) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({
      success: true,
      article,
    });
  } catch (error) {
    console.error("Get article error:", error);
    res.status(500).json({ error: "Failed to fetch article" });
  }
};

// Get article by slug (public endpoint)
exports.getArticleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const article = await (
      await getPrisma()
    ).article.findUnique({
      where: { slug },
      include: {
        author: { select: { name: true } },
        category: { select: { name: true, slug: true, color: true } },
      },
    });

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    // Only show published articles to public
    if (article.status !== "PUBLISHED" && !req.user) {
      return res.status(404).json({ error: "Article not found" });
    }

    // Increment view count
    await (
      await getPrisma()
    ).article.update({
      where: { id: article.id },
      data: { viewCount: { increment: 1 } },
    });

    res.json({
      success: true,
      article,
    });
  } catch (error) {
    console.error("Get article by slug error:", error);
    res.status(500).json({ error: "Failed to fetch article" });
  }
};

// Update article
exports.updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      excerpt,
      categoryId,
      tags,
      featuredImage,
      isBreaking,
      isTopStory,
      language,
      metaTitle,
      metaDescription,
      status,
    } = req.body;

    // Check if article exists
    const existingArticle = await (
      await getPrisma()
    ).article.findUnique({
      where: { id },
    });

    if (!existingArticle) {
      return res.status(404).json({ error: "Article not found" });
    }

    // Check permissions (authors can only edit their own articles unless admin)
    if (req.user.role !== "ADMIN" && existingArticle.authorId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Prepare update data
    const updateData = {};

    if (title) {
      updateData.title = title.trim();
      if (title !== existingArticle.title) {
        updateData.slug = await generateUniqueSlug(
          title,
          "article",
          "slug",
          id
        );
      }
    }

    if (content) {
      updateData.content = sanitizeContent(content);
      updateData.readTime = calculateReadingTime(updateData.content);
    }

    if (excerpt !== undefined) {
      // Validate and truncate excerpt if needed
      if (excerpt && !validateExcerpt(excerpt)) {
        updateData.excerpt = truncateExcerpt(excerpt);
      } else {
        updateData.excerpt = excerpt;
      }
    }
    if (categoryId) updateData.categoryId = categoryId;
    if (featuredImage !== undefined) updateData.featuredImage = featuredImage;
    if (isBreaking !== undefined) updateData.isBreaking = isBreaking;
    if (isTopStory !== undefined) updateData.isTopStory = isTopStory;
    if (language) updateData.language = language;
    if (metaTitle !== undefined) updateData.metaTitle = metaTitle;
    if (metaDescription !== undefined)
      updateData.metaDescription = metaDescription;

    if (status) {
      updateData.status = status;
      if (status === "PUBLISHED" && existingArticle.status !== "PUBLISHED") {
        updateData.publishedAt = new Date();
      }
    }

    // Update article
    const article = await (
      await getPrisma()
    ).article.update({
      where: { id },
      data: updateData,
      include: {
        author: { select: { name: true, email: true } },
        category: true,
      },
    });

    // Tags are now handled as a direct field in the updateData

    // QuickRead is now handled as a direct field in the updateData

    res.json({
      success: true,
      article,
    });
  } catch (error) {
    console.error("Update article error:", error);
    res.status(500).json({ error: "Failed to update article" });
  }
};

// Delete article
exports.deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;

    const article = await (
      await getPrisma()
    ).article.findUnique({
      where: { id },
    });

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    // Check permissions
    if (req.user.role !== "ADMIN" && article.authorId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Delete all related records first to avoid foreign key constraint violations
    await (
      await getPrisma()
    ).inshort.deleteMany({
      where: { sourceArticleId: id },
    });

    await (
      await getPrisma()
    ).quickRead.deleteMany({
      where: { articleId: id },
    });

    await (
      await getPrisma()
    ).articleTag.deleteMany({
      where: { articleId: id },
    });

    // Now delete the article
    await (
      await getPrisma()
    ).article.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Article deleted successfully",
    });
  } catch (error) {
    console.error("Delete article error:", error);
    res.status(500).json({ error: "Failed to delete article" });
  }
};

// Get quick reads for Inshorts-like feature
exports.getQuickReads = async (req, res) => {
  try {
    const { page = 1, limit = 20, category } = req.query;
    const offset = (page - 1) * limit;

    const where = {
      article: {
        status: "PUBLISHED",
      },
    };

    if (category) {
      where.article.categoryId = category;
    }

    const quickReads = await (
      await getPrisma()
    ).quickRead.findMany({
      where,
      include: {
        article: {
          select: {
            id: true,
            slug: true,
            title: true,
            featuredImage: true,
            publishedAt: true,
            viewCount: true,
            shareCount: true,
            category: { select: { name: true, color: true, slug: true } },
            author: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: parseInt(limit),
    });

    res.json({
      success: true,
      quickReads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: quickReads.length === parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get quick reads error:", error);
    res.status(500).json({ error: "Failed to fetch quick reads" });
  }
};

// Get breaking news
exports.getBreakingNews = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const breakingNews = await (
      await getPrisma()
    ).article.findMany({
      where: {
        status: "PUBLISHED",
        isBreaking: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
        category: { select: { name: true, color: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: parseInt(limit),
    });

    res.json({
      success: true,
      breakingNews,
    });
  } catch (error) {
    console.error("Get breaking news error:", error);
    res.status(500).json({ error: "Failed to fetch breaking news" });
  }
};

// Get top stories
exports.getTopStories = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const topStories = await (
      await getPrisma()
    ).article.findMany({
      where: {
        status: "PUBLISHED",
        isTopStory: true,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        featuredImage: true,
        publishedAt: true,
        readTime: true,
        viewCount: true,
        category: { select: { name: true, color: true, slug: true } },
        author: { select: { name: true } },
      },
      orderBy: { publishedAt: "desc" },
      take: parseInt(limit),
    });

    res.json({
      success: true,
      topStories,
    });
  } catch (error) {
    console.error("Get top stories error:", error);
    res.status(500).json({ error: "Failed to fetch top stories" });
  }
};

// AI Content Generation Endpoints

// Generate complete news article from content
exports.generateNewsFromContent = async (req, res) => {
  try {
    const { content, language = "ENGLISH" } = req.body;

    if (!content || content.trim().length < 50) {
      return res.status(400).json({
        error: "Content must be at least 50 characters long",
      });
    }

    const generatedContent = await generateNewsFromContent(content, language);

    res.json({
      success: true,
      data: generatedContent,
    });
  } catch (error) {
    console.error("Generate news from content error:", error);
    res.status(500).json({ error: "Failed to generate news article" });
  }
};

// Generate SEO metadata only
exports.generateSEOOnly = async (req, res) => {
  try {
    const { title, content, language = "ENGLISH" } = req.body;

    if (!title && !content) {
      return res.status(400).json({
        error: "Title or content is required",
      });
    }

    const seoData = await generateSEOOnly(title, content, language);

    res.json({
      success: true,
      data: seoData,
    });
  } catch (error) {
    console.error("Generate SEO error:", error);
    res.status(500).json({ error: "Failed to generate SEO metadata" });
  }
};

// Regenerate content with feedback
exports.regenerateWithFeedback = async (req, res) => {
  try {
    const { title, content, feedback, language = "ENGLISH" } = req.body;

    if (!feedback || feedback.trim().length < 10) {
      return res.status(400).json({
        error: "Feedback must be at least 10 characters long",
      });
    }

    const regeneratedContent = await regenerateWithFeedback(
      title,
      content,
      feedback,
      language
    );

    res.json({
      success: true,
      data: regeneratedContent,
    });
  } catch (error) {
    console.error("Regenerate with feedback error:", error);
    res.status(500).json({ error: "Failed to regenerate content" });
  }
};

// Translate content to another language
exports.translateContent = async (req, res) => {
  try {
    const { title, content, targetLanguage = "HINDI" } = req.body;

    if (!title && !content) {
      return res.status(400).json({
        error: "Title or content is required for translation",
      });
    }

    const translatedContent = await translateContent(
      title,
      content,
      targetLanguage
    );

    res.json({
      success: true,
      data: translatedContent,
    });
  } catch (error) {
    console.error("Translate content error:", error);
    res.status(500).json({ error: "Failed to translate content" });
  }
};

// Translate article and create new article in target language
exports.translateAndCreateArticle = async (req, res) => {
  try {
    const { articleId, targetLanguage = "HINDI" } = req.body;

    if (!articleId) {
      return res.status(400).json({
        error: "Article ID is required",
      });
    }

    // Get the original article
    const originalArticle = await (
      await getPrisma()
    ).article.findUnique({
      where: { id: articleId },
      include: {
        category: true,
        author: true,
      },
    });

    if (!originalArticle) {
      return res.status(404).json({ error: "Article not found" });
    }

    // Check permissions
    if (req.user.role !== "ADMIN" && originalArticle.authorId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Translate the content
    const translatedContent = await translateContent(
      originalArticle.title,
      originalArticle.content,
      targetLanguage
    );

    // Generate unique slug for translated article
    const translatedSlug = await generateUniqueSlug(
      translatedContent.title,
      "article"
    );

    // Calculate reading time for translated content
    const readTime = calculateReadingTime(translatedContent.content);

    // Create new article with translated content
    const newArticle = await (
      await getPrisma()
    ).article.create({
      data: {
        title: translatedContent.title,
        slug: translatedSlug,
        content: translatedContent.content,
        excerpt: truncateExcerpt(translatedContent.excerpt),
        featuredImage: originalArticle.featuredImage,
        metaTitle: translatedContent.metaTitle || translatedContent.title,
        metaDescription:
          translatedContent.metaDescription || translatedContent.excerpt,
        ogImage: originalArticle.ogImage,
        isBreaking: originalArticle.isBreaking,
        isTopStory: originalArticle.isTopStory,
        language: targetLanguage,
        status: "DRAFT", // Always create as draft
        readTime,
        authorId: req.user.id,
        categoryId: originalArticle.categoryId,
      },
      include: {
        author: { select: { name: true, email: true } },
        category: true,
      },
    });

    // Update original article to draft if it was published
    if (originalArticle.status === "PUBLISHED") {
      await (
        await getPrisma()
      ).article.update({
        where: { id: articleId },
        data: { status: "DRAFT" },
      });
    }

    res.json({
      success: true,
      data: {
        originalArticle: {
          id: originalArticle.id,
          status: "DRAFT",
        },
        translatedArticle: newArticle,
      },
    });
  } catch (error) {
    console.error("Translate and create article error:", error);
    res.status(500).json({ error: "Failed to translate and create article" });
  }
};

// Get articles by category slug
exports.getArticlesByCategory = async (req, res) => {
  try {
    const { slug } = req.params;
    const { page = 1, limit = 12, language } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // First, get the category by slug
    const category = await (await getPrisma()).category.findUnique({
      where: { slug },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Build where clause
    const where = {
      status: "PUBLISHED",
      categoryId: category.id,
    };

    if (language) {
      where.language = language;
    }

    // Get articles with pagination
    const [articles, totalCount] = await Promise.all([
      (await getPrisma()).article.findMany({
        where,
        include: {
          category: { select: { name: true, slug: true, color: true } },
        },
        orderBy: { publishedAt: "desc" },
        skip: offset,
        take: parseInt(limit),
      }),
      (await getPrisma()).article.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.json({
      success: true,
      articles,
      totalPages,
      currentPage: parseInt(page),
      totalCount,
      category,
    });
  } catch (error) {
    console.error("Get articles by category error:", error);
    res.status(500).json({ error: "Failed to fetch articles by category" });
  }
};
