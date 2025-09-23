#!/usr/bin/env node

// Render Issues Fix Script
// This script fixes the database schema issues and CORS problems

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");

console.log("🔧 Fixing Render deployment issues...\n");

async function checkDatabaseSchema() {
  try {
    console.log("🔍 Checking database schema...");
    const prisma = new PrismaClient();
    await prisma.$connect();

    // Check if tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;

    console.log("✅ Database connection successful");
    console.log(`📋 Found ${tables.length} tables`);

    // Check specific columns that are missing
    const missingColumns = [];

    try {
      await prisma.$queryRaw`SELECT viewCount FROM epapers LIMIT 1`;
    } catch (error) {
      if (error.message.includes("viewCount")) {
        missingColumns.push("epapers.viewCount");
      }
    }

    try {
      await prisma.$queryRaw`SELECT caption FROM highlights LIMIT 1`;
    } catch (error) {
      if (error.message.includes("caption")) {
        missingColumns.push("highlights.caption");
      }
    }

    try {
      await prisma.$queryRaw`SELECT tags FROM articles LIMIT 1`;
    } catch (error) {
      if (error.message.includes("tags")) {
        missingColumns.push("articles.tags");
      }
    }

    if (missingColumns.length > 0) {
      console.log("❌ Missing columns found:");
      missingColumns.forEach((col) => console.log(`   - ${col}`));
      return false;
    } else {
      console.log("✅ All required columns exist");
      return true;
    }
  } catch (error) {
    console.log(`❌ Database schema check failed: ${error.message}`);
    return false;
  }
}

async function resetDatabase() {
  try {
    console.log("🔄 Resetting database...");
    execSync("npx prisma migrate reset --force", { stdio: "inherit" });
    console.log("✅ Database reset successful");
    return true;
  } catch (error) {
    console.log(`❌ Database reset failed: ${error.message}`);
    return false;
  }
}

async function runMigrations() {
  try {
    console.log("🔄 Running migrations...");
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("✅ Migrations completed");
    return true;
  } catch (error) {
    console.log(`❌ Migration failed: ${error.message}`);
    return false;
  }
}

async function generateClient() {
  try {
    console.log("📦 Generating Prisma client...");
    execSync("npx prisma generate", { stdio: "inherit" });
    console.log("✅ Prisma client generated");
    return true;
  } catch (error) {
    console.log(`❌ Client generation failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("🚀 Render Issues Fix Script");
  console.log("==========================\n");

  // Check current schema
  const schemaOk = await checkDatabaseSchema();

  if (!schemaOk) {
    console.log("\n🔧 Schema issues detected. Attempting to fix...\n");

    // Generate client first
    const clientOk = await generateClient();
    if (!clientOk) {
      console.log("❌ Cannot proceed without Prisma client");
      process.exit(1);
    }

    // Try to run migrations
    const migrated = await runMigrations();
    if (!migrated) {
      console.log("❌ Migration failed. Database schema is out of sync.");
      console.log(
        "💡 You may need to manually create the missing columns or reset the database."
      );
      process.exit(1);
    }

    // Check schema again
    const schemaOkAfter = await checkDatabaseSchema();
    if (!schemaOkAfter) {
      console.log("❌ Schema still has issues after migration");
      process.exit(1);
    }
  }

  console.log("\n✅ All issues resolved!");
  console.log("🎉 Your application should now work correctly");
}

// Run the fix script
main().catch((error) => {
  console.error("❌ Fix script failed:", error);
  process.exit(1);
});
