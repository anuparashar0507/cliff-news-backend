// src/controllers/nit.js
const { PrismaClient } = require("@prisma/client");
const path = require("path");
const fs = require("fs");

const prisma = new PrismaClient();

// Create new NIT item
exports.createNIT = async (req, res) => {
  try {
    const { title, category } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "Image file is required" });
    }

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const nit = await prisma.nIT.create({
      data: {
        title: title.trim(),
        imageUrl:
          file.optimizedUrl ||
          file.originalUrl ||
          `/uploads/images/${file.filename}`,
        category: category?.trim() || null,
        date: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      nit,
    });
  } catch (error) {
    console.error("Create NIT error:", error);
    res.status(500).json({ error: "Failed to create NIT item" });
  }
};

// Get all NIT items
exports.getNITs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      startDate,
      endDate,
      sortBy = "date",
      sortOrder = "desc",
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (category) {
      where.category = {
        contains: category,
        mode: "insensitive",
      };
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [nits, total] = await Promise.all([
      prisma.nIT.findMany({
        where,
        orderBy,
        skip: offset,
        take: parseInt(limit),
      }),
      prisma.nIT.count({ where }),
    ]);

    res.json({
      success: true,
      nits,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get NITs error:", error);
    res.status(500).json({ error: "Failed to fetch NIT items" });
  }
};

// Update NIT item
exports.updateNIT = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category } = req.body;
    const file = req.file;

    const existingNIT = await prisma.nIT.findUnique({
      where: { id },
    });

    if (!existingNIT) {
      return res.status(404).json({ error: "NIT item not found" });
    }

    const updateData = {};
    if (title) updateData.title = title.trim();
    if (category !== undefined) updateData.category = category?.trim() || null;

    if (file) {
      updateData.imageUrl =
        file.optimizedUrl ||
        file.originalUrl ||
        `/uploads/images/${file.filename}`;
    }

    const nit = await prisma.nIT.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      nit,
    });
  } catch (error) {
    console.error("Update NIT error:", error);
    res.status(500).json({ error: "Failed to update NIT item" });
  }
};

// Delete NIT item
exports.deleteNIT = async (req, res) => {
  try {
    const { id } = req.params;

    const nit = await prisma.nIT.findUnique({
      where: { id },
    });

    if (!nit) {
      return res.status(404).json({ error: "NIT item not found" });
    }

    await prisma.nIT.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "NIT item deleted successfully",
    });
  } catch (error) {
    console.error("Delete NIT error:", error);
    res.status(500).json({ error: "Failed to delete NIT item" });
  }
};

// =====================================
