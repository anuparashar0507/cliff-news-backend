const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Categories to create
const categories = [
  {
    name: "Entertainment",
    slug: "entertainment",
    description: "Entertainment news and updates",
    color: "#FF6B6B",
  },
  {
    name: "Sports",
    slug: "sports",
    description: "Sports news and updates",
    color: "#4ECDC4",
  },
  {
    name: "Politics",
    slug: "politics",
    description: "Political news and updates",
    color: "#45B7D1",
  },
  {
    name: "Business",
    slug: "business",
    description: "Business and economic news",
    color: "#96CEB4",
  },
  {
    name: "Technology",
    slug: "technology",
    description: "Technology news and updates",
    color: "#FFEAA7",
  },
  {
    name: "Health",
    slug: "health",
    description: "Health and medical news",
    color: "#DDA0DD",
  },
  {
    name: "Lifestyle",
    slug: "lifestyle",
    description: "Lifestyle and culture news",
    color: "#F0E68C",
  },
  {
    name: "General",
    slug: "general",
    description: "General news category for migrated posts",
    color: "#FFA500",
  },
];

// Tags to create
const tags = [
  { name: "Entertainment", slug: "entertainment" },
  { name: "Breaking News", slug: "breaking-news" },
  { name: "Politics", slug: "politics" },
  { name: "Sports", slug: "sports" },
  { name: "Business", slug: "business" },
  { name: "Technology", slug: "technology" },
];

async function setupCategoriesAndTags() {
  try {
    console.log("Setting up categories and tags...\n");

    // Create categories
    console.log("Creating categories...");
    for (const category of categories) {
      const existingCategory = await prisma.category.findUnique({
        where: { slug: category.slug },
      });

      if (existingCategory) {
        console.log(`Category "${category.name}" already exists`);
      } else {
        const newCategory = await prisma.category.create({
          data: category,
        });
        console.log(
          `Created category: ${newCategory.name} (${newCategory.slug})`
        );
      }
    }

    // Create tags
    console.log("\nCreating tags...");
    for (const tag of tags) {
      const existingTag = await prisma.tag.findUnique({
        where: { name: tag.name },
      });

      if (existingTag) {
        console.log(`Tag "${tag.name}" already exists`);
      } else {
        const newTag = await prisma.tag.create({
          data: tag,
        });
        console.log(`Created tag: ${newTag.name} (${newTag.slug})`);
      }
    }

    console.log("\n✅ Categories and tags setup completed!");
  } catch (error) {
    console.error("Error setting up categories and tags:", error);
  } finally {
    await prisma.$disconnect();
  }
}

setupCategoriesAndTags();
