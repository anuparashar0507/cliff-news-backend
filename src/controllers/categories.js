// src/controllers/categories.js
const getPrismaClient = require("../lib/prisma");

// Helper function to get Prisma client
async function getPrisma() {
  return await getPrismaClient();
}
const { createSlug, generateUniqueSlug } = require("../utils/slugify");

// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const { active, withCount } = req.query;

    const where = {};
    if (active !== undefined) {
      where.isActive = active === "true";
    }

    const include = {};
    if (withCount === "true") {
      include._count = {
        select: {
          articles: {
            where: { status: "PUBLISHED" },
          },
        },
      };
    }

    const categories = await (
      await getPrisma()
    ).category.findMany({
      where,
      include,
      orderBy: { name: "asc" },
    });

    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};

// Get single category
exports.getCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await (
      await getPrisma()
    ).category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            articles: {
              where: { status: "PUBLISHED" },
            },
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Get category error:", error);
    res.status(500).json({ error: "Failed to fetch category" });
  }
};

// Get category by slug
exports.getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await (
      await getPrisma()
    ).category.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            articles: {
              where: { status: "PUBLISHED" },
            },
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Get category by slug error:", error);
    res.status(500).json({ error: "Failed to fetch category" });
  }
};

// Create new category
exports.createCategory = async (req, res) => {
  try {
    const { name, description, color = "#FFA500" } = req.body;

    // Validate input
    if (!name) {
      return res.status(400).json({ error: "Category name is required" });
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(name, "category");

    const category = await (
      await getPrisma()
    ).category.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim(),
        color,
      },
    });

    res.status(201).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Create category error:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Category name already exists" });
    }
    res.status(500).json({ error: "Failed to create category" });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, isActive } = req.body;

    // Check if category exists
    const existingCategory = await (
      await getPrisma()
    ).category.findUnique({
      where: { id },
    });

    if (!existingCategory) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Prepare update data
    const updateData = {};

    if (name && name !== existingCategory.name) {
      updateData.name = name.trim();
      updateData.slug = await generateUniqueSlug(name, "category", "slug", id);
    }

    if (description !== undefined) {
      updateData.description = description?.trim();
    }

    if (color) updateData.color = color;
    if (isActive !== undefined) updateData.isActive = isActive;

    const category = await (
      await getPrisma()
    ).category.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            articles: {
              where: { status: "PUBLISHED" },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Update category error:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Category name already exists" });
    }
    res.status(500).json({ error: "Failed to update category" });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists and has articles
    const category = await (
      await getPrisma()
    ).category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { articles: true },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    if (category._count.articles > 0) {
      return res.status(400).json({
        error:
          "Cannot delete category with articles. Move articles to another category first.",
      });
    }

    await (
      await getPrisma()
    ).category.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
};

// Get categories with article counts for dashboard
exports.getCategoriesStats = async (req, res) => {
  try {
    const categories = await (
      await getPrisma()
    ).category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            articles: {
              where: {
                status: "PUBLISHED",
                publishedAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                },
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Calculate total articles per category
    const categoriesWithStats = await Promise.all(
      categories.map(async (category) => {
        const totalArticles = await (
          await getPrisma()
        ).article.count({
          where: {
            categoryId: category.id,
            status: "PUBLISHED",
          },
        });

        return {
          ...category,
          totalArticles,
          recentArticles: category._count.articles,
        };
      })
    );

    res.json({
      success: true,
      categories: categoriesWithStats,
    });
  } catch (error) {
    console.error("Get categories stats error:", error);
    res.status(500).json({ error: "Failed to fetch categories statistics" });
  }
};
