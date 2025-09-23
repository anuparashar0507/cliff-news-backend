const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function testMigration() {
  try {
    console.log("Testing migration with first 3 posts...\n");

    // Read the posts.json file
    const postsPath = path.join(__dirname, "../../posts.json");
    const postsData = JSON.parse(fs.readFileSync(postsPath, "utf8"));

    // Take only first 3 posts for testing
    const testPosts = postsData.slice(0, 3);

    console.log(`Testing with ${testPosts.length} posts:`);
    testPosts.forEach((post, index) => {
      console.log(`${index + 1}. "${post.title.rendered}"`);
    });

    // Check if default author exists
    let defaultAuthor = await prisma.user.findUnique({
      where: { email: "migrated@thecliffnews.in" },
    });

    if (!defaultAuthor) {
      console.log("\nCreating default author...");
      defaultAuthor = await prisma.user.create({
        data: {
          email: "migrated@thecliffnews.in",
          name: "Migrated Author",
          password: "migrated123",
          role: "EDITOR",
        },
      });
      console.log("✅ Default author created");
    } else {
      console.log("✅ Default author already exists");
    }

    // Check if default category exists
    let defaultCategory = await prisma.category.findUnique({
      where: { slug: "general" },
    });

    if (!defaultCategory) {
      console.log("\nCreating default category...");
      defaultCategory = await prisma.category.create({
        data: {
          name: "General",
          slug: "general",
          description: "General news category for migrated posts",
          color: "#FFA500",
        },
      });
      console.log("✅ Default category created");
    } else {
      console.log("✅ Default category already exists");
    }

    // Test migration logic for first post
    const testPost = testPosts[0];
    console.log(`\nTesting migration logic for: "${testPost.title.rendered}"`);

    // Check if article already exists
    const existingArticle = await prisma.article.findUnique({
      where: { slug: testPost.slug },
    });

    if (existingArticle) {
      console.log("⚠️  Article already exists, skipping...");
    } else {
      console.log("✅ Article does not exist, ready for migration");
    }

    // Test category mapping
    const CATEGORY_MAPPING = {
      54: "entertainment",
      258: "sports",
      51: "politics",
      256: "business",
      257: "technology",
      259: "health",
      58: "lifestyle",
    };

    if (testPost.categories && testPost.categories.length > 0) {
      const wpCategoryId = testPost.categories[0];
      const mappedSlug = CATEGORY_MAPPING[wpCategoryId];

      if (mappedSlug) {
        const mappedCategory = await prisma.category.findUnique({
          where: { slug: mappedSlug },
        });

        if (mappedCategory) {
          console.log(
            `✅ Category mapping: ${wpCategoryId} -> ${mappedCategory.name}`
          );
        } else {
          console.log(`⚠️  Category ${mappedSlug} not found, will use default`);
        }
      } else {
        console.log(
          `⚠️  No mapping for category ${wpCategoryId}, will use default`
        );
      }
    }

    // Test tag mapping
    const TAG_MAPPING = {
      219: "entertainment",
      120: "breaking-news",
      224: "politics",
      214: "sports",
      218: "business",
      220: "technology",
    };

    if (testPost.tags && testPost.tags.length > 0) {
      console.log("Tag mappings:");
      testPost.tags.forEach((tagId) => {
        const mappedTag = TAG_MAPPING[tagId];
        if (mappedTag) {
          console.log(`  ${tagId} -> ${mappedTag}`);
        } else {
          console.log(`  ${tagId} -> (no mapping)`);
        }
      });
    }

    console.log("\n✅ Test completed successfully!");
    console.log("\nNext steps:");
    console.log("1. Run: node setup-categories-tags.js");
    console.log("2. Run: node migrate-posts.js migrate");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testMigration();
