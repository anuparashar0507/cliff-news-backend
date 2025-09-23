const { execSync } = require("child_process");
const path = require("path");

function runCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    execSync(command, { stdio: "inherit", cwd: path.join(__dirname) });
    console.log(`✅ ${description} completed`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

async function runFullMigration() {
  console.log("🚀 Starting WordPress Posts Migration Process\n");
  console.log("This will:");
  console.log("1. Analyze your WordPress data");
  console.log("2. Set up categories and tags");
  console.log("3. Test the migration process");
  console.log("4. Run the full migration");
  console.log("\nPress Ctrl+C to cancel, or wait 5 seconds to continue...\n");

  // Wait 5 seconds
  await new Promise((resolve) => setTimeout(resolve, 5000));

  try {
    // Step 1: Analyze WordPress data
    runCommand("node analyze-wordpress-data.js", "Analyzing WordPress data");

    // Step 2: Set up categories and tags
    runCommand(
      "node setup-categories-tags.js",
      "Setting up categories and tags"
    );

    // Step 3: Test migration
    runCommand("node test-migration.js", "Testing migration process");

    // Step 4: Run full migration
    console.log("\n🎯 Ready to run full migration!");
    console.log("This will migrate all your WordPress posts to the database.");
    console.log("Press Ctrl+C to cancel, or wait 3 seconds to continue...\n");

    await new Promise((resolve) => setTimeout(resolve, 3000));

    runCommand("node migrate-posts.js migrate", "Running full migration");

    console.log("\n🎉 Migration completed successfully!");
    console.log("\nNext steps:");
    console.log("1. Check your database to verify the migrated posts");
    console.log("2. Update the default author password");
    console.log("3. Review and adjust category/tag mappings if needed");
    console.log("4. Test your website to ensure posts display correctly");
  } catch (error) {
    console.error("\n❌ Migration process failed:", error.message);
    console.log("\nTroubleshooting:");
    console.log("1. Ensure your database is running and accessible");
    console.log("2. Check that posts.json is in the correct location");
    console.log("3. Verify Prisma is properly configured");
    console.log("4. Run individual scripts to identify the issue");
  }
}

runFullMigration();
