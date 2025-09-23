// src/controllers/youtube.js
const { getChannelShorts } = require("../services/youtubeService");

// Get YouTube Shorts
exports.getShorts = async (req, res) => {
  try {
    const { maxResults = 20, pageToken } = req.query;

    const result = await getChannelShorts(maxResults, pageToken);

    res.json({
      success: true,
      shorts: result.shorts,
      nextPageToken: result.nextPageToken,
      hasMore: !!result.nextPageToken,
    });
  } catch (error) {
    console.error("Get YouTube shorts error:", error);

    if (error.message.includes("credentials")) {
      return res.status(500).json({
        error: "YouTube API not configured. Please add API credentials.",
      });
    }

    res.status(500).json({
      error: "Failed to fetch YouTube shorts",
    });
  }
};
