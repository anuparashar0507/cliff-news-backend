// src/controllers/notifications.js
const getPrismaClient = require("../lib/prisma");

// Helper function to get Prisma client
async function getPrisma() {
  return await getPrismaClient();
}
const OneSignal = require("onesignal-node");

// Initialize OneSignal client (optional)
let client = null;
if (
  process.env.ONESIGNAL_USER_AUTH_KEY &&
  process.env.ONESIGNAL_APP_AUTH_KEY &&
  process.env.ONESIGNAL_APP_ID
) {
  try {
    client = new OneSignal.Client({
      userAuthKey: process.env.ONESIGNAL_USER_AUTH_KEY,
      app: {
        appAuthKey: process.env.ONESIGNAL_APP_AUTH_KEY,
        appId: process.env.ONESIGNAL_APP_ID,
      },
    });
    console.log("✅ OneSignal client initialized");
  } catch (error) {
    console.warn("⚠️ OneSignal client initialization failed:", error.message);
  }
} else {
  console.warn(
    "⚠️ OneSignal environment variables not set - notifications will be saved but not sent"
  );
}

// Create notification
exports.createNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      type = "GENERAL",
      targetAudience = "all",
      scheduledAt,
      articleId,
    } = req.body;

    // Validate required fields
    if (!title || !message) {
      return res.status(400).json({
        error: "Title and message are required",
      });
    }

    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type,
        targetAudience,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        articleId,
        createdBy: req.user.id,
        status: scheduledAt ? "SCHEDULED" : "DRAFT",
      },
    });

    res.status(201).json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Create notification error:", error);
    res.status(500).json({ error: "Failed to create notification" });
  }
};

// Get all notifications
exports.getNotifications = async (req, res) => {
  try {
    const { limit = 50, offset = 0, status, type } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.notification.count({ where });

    res.json({
      success: true,
      notifications,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total,
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// Get single notification
exports.getNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Get notification error:", error);
    res.status(500).json({ error: "Failed to fetch notification" });
  }
};

// Update notification
exports.updateNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message, type, targetAudience, scheduledAt, status } =
      req.body;

    const notification = await prisma.notification.update({
      where: { id },
      data: {
        title,
        message,
        type,
        targetAudience,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error("Update notification error:", error);
    res.status(500).json({ error: "Failed to update notification" });
  }
};

// Delete notification
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.notification.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({ error: "Failed to delete notification" });
  }
};

// Send notification
exports.sendNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.status === "SENT") {
      return res.status(400).json({ error: "Notification already sent" });
    }

    // Prepare OneSignal notification
    const oneSignalNotification = {
      contents: { en: notification.message },
      headings: { en: notification.title },
      included_segments:
        notification.targetAudience === "all" ? ["All"] : undefined,
      web_buttons: [
        {
          id: "read-more",
          text: "Read More",
          icon: "https://yourdomain.com/icon.png",
          url: "https://yourdomain.com",
        },
      ],
    };

    // Send via OneSignal (if configured)
    let oneSignalResponse = null;
    if (client) {
      try {
        oneSignalResponse = await client.createNotification(
          oneSignalNotification
        );
      } catch (error) {
        console.warn("⚠️ OneSignal notification failed:", error.message);
      }
    }

    // Update notification in database
    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        onesignalId: oneSignalResponse?.id || null,
      },
    });

    res.json({
      success: true,
      notification: updatedNotification,
      oneSignalResponse,
    });
  } catch (error) {
    console.error("Send notification error:", error);

    // Update status to failed
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { status: "FAILED" },
    });

    res.status(500).json({ error: "Failed to send notification" });
  }
};

// Get notification statistics
exports.getNotificationStats = async (req, res) => {
  try {
    const stats = await prisma.notification.groupBy({
      by: ["status"],
      _count: {
        status: true,
      },
    });

    const totalDelivered = await prisma.notification.aggregate({
      where: { status: "SENT" },
      _sum: {
        deliveredCount: true,
      },
    });

    const totalClicks = await prisma.notification.aggregate({
      where: { status: "SENT" },
      _sum: {
        clickedCount: true,
      },
    });

    res.json({
      success: true,
      stats: {
        byStatus: stats,
        totalDelivered: totalDelivered._sum.deliveredCount || 0,
        totalClicks: totalClicks._sum.clickedCount || 0,
      },
    });
  } catch (error) {
    console.error("Get notification stats error:", error);
    res.status(500).json({ error: "Failed to fetch notification statistics" });
  }
};

// Subscribe user to notifications
exports.subscribeUser = async (req, res) => {
  try {
    const { onesignalPlayerId, platform = "web" } = req.body;

    if (!onesignalPlayerId) {
      return res.status(400).json({ error: "OneSignal player ID is required" });
    }

    // Check if user is already subscribed
    const existingSubscription = await prisma.userSubscription.findUnique({
      where: { onesignalPlayerId },
    });

    if (existingSubscription) {
      // Update existing subscription
      const subscription = await prisma.userSubscription.update({
        where: { onesignalPlayerId },
        data: {
          isActive: true,
          lastActive: new Date(),
        },
      });

      return res.json({
        success: true,
        subscription,
      });
    }

    // Create new subscription
    const subscription = await prisma.userSubscription.create({
      data: {
        onesignalPlayerId,
        platform,
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error("Subscribe user error:", error);
    res.status(500).json({ error: "Failed to subscribe user" });
  }
};

// Unsubscribe user from notifications
exports.unsubscribeUser = async (req, res) => {
  try {
    const { onesignalPlayerId } = req.body;

    if (!onesignalPlayerId) {
      return res.status(400).json({ error: "OneSignal player ID is required" });
    }

    await prisma.userSubscription.update({
      where: { onesignalPlayerId },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: "User unsubscribed successfully",
    });
  } catch (error) {
    console.error("Unsubscribe user error:", error);
    res.status(500).json({ error: "Failed to unsubscribe user" });
  }
};

// Send breaking news notification
exports.sendBreakingNews = async (req, res) => {
  try {
    const { articleId } = req.body;

    if (!articleId) {
      return res.status(400).json({ error: "Article ID is required" });
    }

    // Get article details
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: {
        author: true,
        category: true,
      },
    });

    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    // Create breaking news notification
    const notification = await prisma.notification.create({
      data: {
        title: `🚨 BREAKING: ${article.title}`,
        message: article.excerpt || article.title,
        type: "BREAKING",
        targetAudience: "all",
        articleId,
        createdBy: req.user.id,
        status: "DRAFT",
      },
    });

    // Send immediately
    const oneSignalNotification = {
      contents: { en: notification.message },
      headings: { en: notification.title },
      included_segments: ["All"],
      web_buttons: [
        {
          id: "read-more",
          text: "Read Full Story",
          icon: "https://yourdomain.com/icon.png",
          url: `https://yourdomain.com/articles/${article.slug}`,
        },
      ],
    };

    let oneSignalResponse = null;
    if (client) {
      try {
        oneSignalResponse = await client.createNotification(
          oneSignalNotification
        );
      } catch (error) {
        console.warn("⚠️ OneSignal notification failed:", error.message);
      }
    }

    // Update notification
    const updatedNotification = await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        onesignalId: oneSignalResponse?.id || null,
      },
    });

    res.json({
      success: true,
      notification: updatedNotification,
      oneSignalResponse,
    });
  } catch (error) {
    console.error("Send breaking news error:", error);
    res
      .status(500)
      .json({ error: "Failed to send breaking news notification" });
  }
};
