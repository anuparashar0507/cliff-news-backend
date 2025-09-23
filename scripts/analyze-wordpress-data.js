const fs = require("fs");
const path = require("path");

function analyzeWordPressData() {
  try {
    console.log("Analyzing WordPress posts data...\n");

    // Read the posts.json file
    const postsPath = path.join(__dirname, "../../posts.json");
    const postsData = JSON.parse(fs.readFileSync(postsPath, "utf8"));

    console.log(`Total posts: ${postsData.length}`);

    // Analyze categories
    const categoryIds = new Set();
    const categoryCounts = {};
    const categoryNames = {};

    // Analyze tags
    const tagIds = new Set();
    const tagCounts = {};
    const tagNames = {};

    // Analyze authors
    const authorIds = new Set();
    const authorCounts = {};

    // Analyze post status
    const statusCounts = {};

    // Analyze dates
    const dateRanges = {
      earliest: null,
      latest: null,
    };

    postsData.forEach((post, index) => {
      // Categories
      if (post.categories && Array.isArray(post.categories)) {
        post.categories.forEach((catId) => {
          categoryIds.add(catId);
          categoryCounts[catId] = (categoryCounts[catId] || 0) + 1;
        });
      }

      // Tags
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach((tagId) => {
          tagIds.add(tagId);
          tagCounts[tagId] = (tagCounts[tagId] || 0) + 1;
        });
      }

      // Authors
      if (post.author) {
        authorIds.add(post.author);
        authorCounts[post.author] = (authorCounts[post.author] || 0) + 1;
      }

      // Status
      statusCounts[post.status] = (statusCounts[post.status] || 0) + 1;

      // Dates
      const postDate = new Date(post.date);
      if (!dateRanges.earliest || postDate < dateRanges.earliest) {
        dateRanges.earliest = postDate;
      }
      if (!dateRanges.latest || postDate > dateRanges.latest) {
        dateRanges.latest = postDate;
      }
    });

    console.log("\n=== POST STATUS ANALYSIS ===");
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`${status}: ${count} posts`);
    });

    console.log("\n=== CATEGORY ANALYSIS ===");
    console.log(`Unique category IDs: ${categoryIds.size}`);
    const sortedCategories = Array.from(categoryIds).sort(
      (a, b) => categoryCounts[b] - categoryCounts[a]
    );
    console.log("Top categories by post count:");
    sortedCategories.slice(0, 10).forEach((catId) => {
      console.log(`  ID ${catId}: ${categoryCounts[catId]} posts`);
    });

    console.log("\n=== TAG ANALYSIS ===");
    console.log(`Unique tag IDs: ${tagIds.size}`);
    const sortedTags = Array.from(tagIds).sort(
      (a, b) => tagCounts[b] - tagCounts[a]
    );
    console.log("Top tags by post count:");
    sortedTags.slice(0, 10).forEach((tagId) => {
      console.log(`  ID ${tagId}: ${tagCounts[tagId]} posts`);
    });

    console.log("\n=== AUTHOR ANALYSIS ===");
    console.log(`Unique authors: ${authorIds.size}`);
    const sortedAuthors = Array.from(authorIds).sort(
      (a, b) => authorCounts[b] - authorCounts[a]
    );
    sortedAuthors.forEach((authorId) => {
      console.log(`  Author ID ${authorId}: ${authorCounts[authorId]} posts`);
    });

    console.log("\n=== DATE RANGE ===");
    console.log(`Earliest post: ${dateRanges.earliest}`);
    console.log(`Latest post: ${dateRanges.latest}`);

    // Generate mapping suggestions
    console.log("\n=== MAPPING SUGGESTIONS ===");
    console.log(
      "\nCategory mapping (update CATEGORY_MAPPING in migrate-posts.js):"
    );
    console.log("const CATEGORY_MAPPING = {");
    sortedCategories.slice(0, 10).forEach((catId) => {
      console.log(
        `  ${catId}: 'category-${catId}', // ${categoryCounts[catId]} posts`
      );
    });
    console.log("};");

    console.log("\nTag mapping (update TAG_MAPPING in migrate-posts.js):");
    console.log("const TAG_MAPPING = {");
    sortedTags.slice(0, 10).forEach((tagId) => {
      console.log(`  ${tagId}: 'tag-${tagId}', // ${tagCounts[tagId]} posts`);
    });
    console.log("};");

    // Sample posts for testing
    console.log("\n=== SAMPLE POSTS FOR TESTING ===");
    const publishedPosts = postsData.filter(
      (post) => post.status === "publish"
    );
    console.log(`Published posts: ${publishedPosts.length}`);

    if (publishedPosts.length > 0) {
      console.log("\nFirst 5 published posts:");
      publishedPosts.slice(0, 5).forEach((post, index) => {
        console.log(`${index + 1}. "${post.title.rendered}"`);
        console.log(`   Slug: ${post.slug}`);
        console.log(`   Date: ${post.date}`);
        console.log(
          `   Categories: ${
            post.categories ? post.categories.join(", ") : "None"
          }`
        );
        console.log(`   Tags: ${post.tags ? post.tags.join(", ") : "None"}`);
        console.log(`   Author: ${post.author}`);
        console.log("");
      });
    }

    // Generate migration statistics
    const migrationStats = {
      totalPosts: postsData.length,
      publishedPosts: publishedPosts.length,
      draftPosts: statusCounts.draft || 0,
      privatePosts: statusCounts.private || 0,
      uniqueCategories: categoryIds.size,
      uniqueTags: tagIds.size,
      uniqueAuthors: authorIds.size,
      dateRange: {
        earliest: dateRanges.earliest,
        latest: dateRanges.latest,
      },
    };

    // Save analysis to file
    const analysisPath = path.join(__dirname, "wordpress-analysis.json");
    fs.writeFileSync(analysisPath, JSON.stringify(migrationStats, null, 2));
    console.log(`\nAnalysis saved to: ${analysisPath}`);
  } catch (error) {
    console.error("Error analyzing WordPress data:", error);
  }
}

analyzeWordPressData();
