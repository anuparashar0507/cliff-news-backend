// src/lib/prisma.js
// Centralized Prisma client configuration to prevent connection pool exhaustion
const { PrismaClient } = require("@prisma/client");

// Singleton pattern to ensure only one PrismaClient instance
let prisma = null;
let isConnecting = false;

async function getPrismaClient() {
  if (!prisma && !isConnecting) {
    isConnecting = true;
    console.log("🔧 Creating new Prisma client instance...");

    // Retry mechanism with exponential backoff
    let retryCount = 0;
    const maxRetries = 5;
    const baseDelay = 2000; // 2 seconds

    while (retryCount < maxRetries) {
      try {
        prisma = new PrismaClient({
          log:
            process.env.NODE_ENV === "development"
              ? ["error", "warn"]
              : ["error"],
          datasources: {
            db: {
              url: process.env.DATABASE_URL,
            },
          },
        });

        // Test the connection
        await prisma.$connect();
        console.log("✅ Prisma client connected successfully");
        break;
      } catch (error) {
        retryCount++;
        console.error(
          `❌ Failed to create Prisma client (attempt ${retryCount}/${maxRetries}):`,
          error.message
        );

        if (retryCount >= maxRetries) {
          console.error(
            "❌ Max retries reached. Database connection pool is exhausted."
          );
          prisma = null;
          isConnecting = false;
          throw error;
        }

        // Exponential backoff: 2s, 4s, 8s, 16s, 32s
        const delay = baseDelay * Math.pow(2, retryCount - 1);
        console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Reset prisma for retry
        prisma = null;
      }
    }

    if (prisma) {
      // Handle graceful shutdown
      process.on("beforeExit", async () => {
        if (prisma) {
          console.log("🔌 Disconnecting Prisma client...");
          await prisma.$disconnect();
        }
      });

      process.on("SIGINT", async () => {
        if (prisma) {
          console.log("🔌 Disconnecting Prisma client...");
          await prisma.$disconnect();
        }
        process.exit(0);
      });

      process.on("SIGTERM", async () => {
        if (prisma) {
          console.log("🔌 Disconnecting Prisma client...");
          await prisma.$disconnect();
        }
        process.exit(0);
      });
    }

    isConnecting = false;
  }

  if (!prisma) {
    throw new Error("Prisma client not initialized");
  }

  return prisma;
}

// Export the function that returns the client
module.exports = getPrismaClient;
