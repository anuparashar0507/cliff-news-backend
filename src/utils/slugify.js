// src/utils/slugify.js

// Create URL-friendly slug from text
exports.createSlug = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
};

// Generate unique slug by checking database
exports.generateUniqueSlug = async (
  text,
  model,
  field = "slug",
  excludeId = null
) => {
  const prisma = require("../lib/prisma");

  let baseSlug = this.createSlug(text);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const where = { [field]: slug };
    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existing = await prisma[model].findFirst({ where });

    if (!existing) {
      break;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

// Extract reading time from content (words per minute)
exports.calculateReadingTime = (content, wordsPerMinute = 200) => {
  // Remove HTML tags and count words
  const text = content.replace(/<[^>]*>/g, "");
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
};

// Generate excerpt from content with word limit
exports.generateExcerpt = (content, maxWords = 25) => {
  // Remove HTML tags
  const text = content.replace(/<[^>]*>/g, "").trim();

  if (!text) return "";

  const words = text.split(/\s+/);

  if (words.length <= maxWords) {
    return text;
  }

  // Take only the first maxWords and add ellipsis
  return words.slice(0, maxWords).join(" ") + "...";
};

// Validate excerpt word count
exports.validateExcerpt = (excerpt, maxWords = 25) => {
  if (!excerpt || typeof excerpt !== "string") return false;

  const words = excerpt.trim().split(/\s+/);
  return words.length <= maxWords;
};

// Truncate excerpt to word limit if needed
exports.truncateExcerpt = (excerpt, maxWords = 25) => {
  if (!excerpt || typeof excerpt !== "string") return "";

  const words = excerpt.trim().split(/\s+/);

  if (words.length <= maxWords) {
    return excerpt;
  }

  return words.slice(0, maxWords).join(" ") + "...";
};

// Validate and sanitize HTML content
exports.sanitizeContent = (content) => {
  // Basic HTML sanitization - you can enhance this with a library like DOMPurify
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Remove scripts
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "") // Remove iframes
    .replace(/on\w+="[^"]*"/gi, "") // Remove event handlers
    .replace(/javascript:/gi, ""); // Remove javascript: URLs
};

// Format date for display
exports.formatDate = (date, format = "long") => {
  const options = {
    short: {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
    long: {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
    time: {
      hour: "2-digit",
      minute: "2-digit",
    },
  };

  return new Date(date).toLocaleDateString(
    "en-US",
    options[format] || options.long
  );
};

// Generate SEO-friendly meta description
exports.generateMetaDescription = (content, maxLength = 160) => {
  const text = content.replace(/<[^>]*>/g, "");

  if (text.length <= maxLength) {
    return text;
  }

  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  return lastSpace > 0
    ? truncated.substring(0, lastSpace) + "..."
    : truncated + "...";
};

// Extract hashtags from text
exports.extractHashtags = (text) => {
  const hashtagRegex = /#[\w]+/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map((tag) => tag.substring(1)) : [];
};

// Pagination helper
exports.getPaginationData = (page, limit, total) => {
  const currentPage = parseInt(page) || 1;
  const itemsPerPage = parseInt(limit) || 10;
  const totalItems = parseInt(total) || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const offset = (currentPage - 1) * itemsPerPage;

  return {
    page: currentPage,
    limit: itemsPerPage,
    total: totalItems,
    pages: totalPages,
    offset,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
};
