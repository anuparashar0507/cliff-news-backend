#!/usr/bin/env node

// Render Deployment Script
// This script runs database migrations automatically during deployment

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");

console.log("🚀 Starting Render deployment process...\n");

async function runMigrations() {
  try {
    console.log("📦 Generating Prisma client...");
    execSync("npx prisma generate", { stdio: "inherit" });
    console.log("✅ Prisma client generated");

    console.log("🔄 Running database migrations...");
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("✅ Database migrations completed");

    return true;
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    return false;
  }
}

async function testConnection() {
  try {
    console.log("🔍 Testing database connection...");
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log("✅ Database connection successful");
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
}

async function main() {
  console.log("🌐 Render Deployment Script");
  console.log("==========================\n");

  // Test database connection first
  const connected = await testConnection();
  if (!connected) {
    console.log("❌ Cannot proceed without database connection");
    process.exit(1);
  }

  // Run migrations
  const migrated = await runMigrations();
  if (!migrated) {
    console.log("❌ Migration failed");
    process.exit(1);
  }

  console.log("\n🎉 Deployment setup complete!");
  console.log("✅ Database is ready");
  console.log("✅ Application can start");
}

// Run the deployment script
main().catch((error) => {
  console.error("❌ Deployment script failed:", error);
  process.exit(1);
});
