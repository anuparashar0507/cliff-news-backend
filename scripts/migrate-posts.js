const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

// Default author for migrated posts
const DEFAULT_AUTHOR = {
  email: "migrated@thecliffnews.in",
  name: "Migrated Author",
  password: "migrated123", // This should be changed after migration
  role: "EDITOR",
};

// Default category for posts without categories
const DEFAULT_CATEGORY = {
  name: "General",
  slug: "general",
  description: "General news category for migrated posts",
  color: "#FFA500",
};

// Category mapping from WordPress category IDs to our categories
const CATEGORY_MAPPING = {
  54: "entertainment", // Most common category (10 posts)
  258: "sports", // Second most common (7 posts)
  51: "politics", // Third most common (4 posts)
  256: "business", // 3 posts
  257: "technology", // 2 posts
  259: "health", // 2 posts
  58: "lifestyle", // 1 post
};

// Tag mapping from WordPress tag IDs to our tags
const TAG_MAPPING = {
  219: "entertainment", // Most common tag (10 posts)
  120: "breaking-news", // Second most common (9 posts)
  224: "politics", // 2 posts
  214: "sports", // 2 posts
  218: "business", // 2 posts
  220: "technology", // 1 post
};

async function migratePosts() {
  try {
    console.log("Starting WordPress posts migration...");

    // Read the posts.json file
    const postsPath = path.join(__dirname, "../../posts.json");
    const postsData = JSON.parse(fs.readFileSync(postsPath, "utf8"));

    console.log(`Found ${postsData.length} posts to migrate`);

    // Create or get default author
    let defaultAuthor = await prisma.user.findUnique({
      where: { email: DEFAULT_AUTHOR.email },
    });

    if (!defaultAuthor) {
      defaultAuthor = await prisma.user.create({
        data: DEFAULT_AUTHOR,
      });
      console.log("Created default author for migrated posts");
    }

    // Create or get default category
    let defaultCategory = await prisma.category.findUnique({
      where: { slug: DEFAULT_CATEGORY.slug },
    });

    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: DEFAULT_CATEGORY,
      });
      console.log("Created default category for migrated posts");
    }

    // Process each post
    let successCount = 0;
    let errorCount = 0;

    for (const post of postsData) {
      try {
        // Skip if post is not published
        if (post.status !== "publish") {
          console.log(`Skipping unpublished post: ${post.title.rendered}`);
          continue;
        }

        // Extract post data
        const title = post.title.rendered;
        const slug = post.slug;
        const content = post.content.rendered;
        const excerpt = post.excerpt.rendered;
        const publishedAt = new Date(post.date);
        const modifiedAt = new Date(post.modified);

        // Check if article already exists
        const existingArticle = await prisma.article.findUnique({
          where: { slug },
        });

        if (existingArticle) {
          console.log(`Article already exists: ${title}`);
          continue;
        }

        // Determine category
        let categoryId = defaultCategory.id;
        if (post.categories && post.categories.length > 0) {
          // Try to map WordPress category to our category
          const wpCategoryId = post.categories[0]; // Use first category
          if (CATEGORY_MAPPING[wpCategoryId]) {
            const mappedCategory = await prisma.category.findUnique({
              where: { slug: CATEGORY_MAPPING[wpCategoryId] },
            });
            if (mappedCategory) {
              categoryId = mappedCategory.id;
            }
          }
        }

        // Create the article
        const article = await prisma.article.create({
          data: {
            title,
            slug,
            content,
            excerpt: excerpt ? excerpt.replace(/<[^>]*>/g, "") : null, // Strip HTML from excerpt
            status: "PUBLISHED",
            language: "ENGLISH", // Default to English, you can modify this logic
            publishedAt,
            createdAt: publishedAt,
            updatedAt: modifiedAt,
            authorId: defaultAuthor.id,
            categoryId,
            viewCount: 0,
            shareCount: 0,
            isBreaking: false,
            isTopStory: false,
            readTime: Math.ceil(content.split(" ").length / 200), // Estimate read time
          },
        });

        // Handle tags if they exist
        if (post.tags && post.tags.length > 0) {
          const tagNames = [];

          for (const wpTagId of post.tags) {
            if (TAG_MAPPING[wpTagId]) {
              tagNames.push(TAG_MAPPING[wpTagId]);
            }
          }

          // Create tags if they don't exist and link them to the article
          for (const tagName of tagNames) {
            let tag = await prisma.tag.findUnique({
              where: { name: tagName },
            });

            if (!tag) {
              tag = await prisma.tag.create({
                data: {
                  name: tagName,
                  slug: tagName
                    .toLowerCase()
                    .replace(/\s+/g, "-")
                    .replace(/[^a-z0-9-]/g, ""),
                },
              });
            }

            // Link tag to article
            await prisma.articleTag.create({
              data: {
                articleId: article.id,
                tagId: tag.id,
              },
            });
          }

          // Update article with comma-separated tags
          await prisma.article.update({
            where: { id: article.id },
            data: {
              tags: tagNames.join(", "),
            },
          });
        }

        successCount++;
        console.log(`Migrated: ${title}`);
      } catch (error) {
        errorCount++;
        console.error(
          `Error migrating post "${post.title.rendered}":`,
          error.message
        );
      }
    }

    console.log(`\nMigration completed!`);
    console.log(`Successfully migrated: ${successCount} posts`);
    console.log(`Errors: ${errorCount} posts`);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Function to create category mapping from WordPress data
async function analyzeCategories() {
  try {
    const postsPath = path.join(__dirname, "../../posts.json");
    const postsData = JSON.parse(fs.readFileSync(postsPath, "utf8"));

    const categoryIds = new Set();
    const tagIds = new Set();

    postsData.forEach((post) => {
      if (post.categories) {
        post.categories.forEach((id) => categoryIds.add(id));
      }
      if (post.tags) {
        post.tags.forEach((id) => tagIds.add(id));
      }
    });

    console.log(
      "WordPress Category IDs found:",
      Array.from(categoryIds).sort()
    );
    console.log("WordPress Tag IDs found:", Array.from(tagIds).sort());

    console.log(
      "\nYou need to manually map these WordPress IDs to your database categories and tags."
    );
    console.log(
      "Update the CATEGORY_MAPPING and TAG_MAPPING objects in the script."
    );
  } catch (error) {
    console.error("Error analyzing categories:", error);
  }
}

// Function to create a sample category and tag mapping
async function createSampleMapping() {
  try {
    // Create some sample categories
    const sampleCategories = [
      {
        name: "Politics",
        slug: "politics",
        description: "Political news",
        color: "#FF6B6B",
      },
      {
        name: "Entertainment",
        slug: "entertainment",
        description: "Entertainment news",
        color: "#4ECDC4",
      },
      {
        name: "Sports",
        slug: "sports",
        description: "Sports news",
        color: "#45B7D1",
      },
      {
        name: "Technology",
        slug: "technology",
        description: "Technology news",
        color: "#96CEB4",
      },
      {
        name: "Business",
        slug: "business",
        description: "Business news",
        color: "#FFEAA7",
      },
    ];

    for (const category of sampleCategories) {
      await prisma.category.upsert({
        where: { slug: category.slug },
        update: category,
        create: category,
      });
    }

    console.log("Created sample categories");

    // Create some sample tags
    const sampleTags = [
      { name: "Breaking News", slug: "breaking-news" },
      { name: "Entertainment", slug: "entertainment" },
      { name: "Politics", slug: "politics" },
      { name: "Sports", slug: "sports" },
      { name: "Technology", slug: "technology" },
    ];

    for (const tag of sampleTags) {
      await prisma.tag.upsert({
        where: { name: tag.name },
        update: tag,
        create: tag,
      });
    }

    console.log("Created sample tags");
  } catch (error) {
    console.error("Error creating sample mapping:", error);
  }
}

// Main execution
async function main() {
  const command = process.argv[2];

  switch (command) {
    case "analyze":
      await analyzeCategories();
      break;
    case "create-mapping":
      await createSampleMapping();
      break;
    case "migrate":
      await migratePosts();
      break;
    default:
      console.log("Usage:");
      console.log(
        "  node migrate-posts.js analyze        - Analyze WordPress categories and tags"
      );
      console.log(
        "  node migrate-posts.js create-mapping  - Create sample categories and tags"
      );
      console.log(
        "  node migrate-posts.js migrate         - Migrate posts to database"
      );
      break;
  }
}

main().catch(console.error);
