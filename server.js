// server.js
require("dotenv").config();
const app = require("./src/app");
const prisma = require("./src/lib/prisma");
const PORT = process.env.PORT || 3000;

// Test database connection
async function connectDB() {
  try {
    const client = await prisma();
    await client.$connect();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🔄 Shutting down gracefully...");
  const client = await prisma();
  await client.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🔄 Shutting down gracefully...");
  const client = await prisma();
  await client.$disconnect();
  process.exit(0);
});

// Start server
async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 API: http://localhost:${PORT}/api`);
    console.log(`⚙️  CMS: http://localhost:${PORT}/cms`);
  });
}

startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
