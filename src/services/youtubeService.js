// src/services/youtubeService.js
const { google } = require("googleapis");

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

// Get YouTube Shorts from channel
exports.getChannelShorts = async (maxResults = 20, pageToken = null) => {
  try {
    if (!process.env.YOUTUBE_API_KEY || !process.env.YOUTUBE_CHANNEL_ID) {
      throw new Error("YouTube API credentials not configured");
    }

    // Get channel's uploads playlist
    const channelResponse = await youtube.channels.list({
      part: "contentDetails",
      id: process.env.YOUTUBE_CHANNEL_ID,
    });

    if (!channelResponse.data.items.length) {
      throw new Error("Channel not found");
    }

    const uploadsPlaylistId =
      channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

    // Get videos from uploads playlist
    const playlistResponse = await youtube.playlistItems.list({
      part: "snippet",
      playlistId: uploadsPlaylistId,
      maxResults: parseInt(maxResults),
      pageToken: pageToken || undefined,
    });

    const videoIds = playlistResponse.data.items.map(
      (item) => item.snippet.resourceId.videoId
    );

    if (videoIds.length === 0) {
      return { shorts: [], nextPageToken: null };
    }

    // Get detailed video information
    const videosResponse = await youtube.videos.list({
      part: "snippet,statistics,contentDetails",
      id: videoIds.join(","),
    });

    // Filter for shorts (videos under 60 seconds)
    const shorts = videosResponse.data.items
      .filter((video) => {
        const duration = video.contentDetails.duration;
        // Parse ISO 8601 duration
        const match = duration.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return false;

        const minutes = parseInt(match[1] || 0);
        const seconds = parseInt(match[2] || 0);
        const totalSeconds = minutes * 60 + seconds;

        return totalSeconds <= 60;
      })
      .map((video) => ({
        id: video.id,
        title: video.snippet.title,
        description: video.snippet.description,
        thumbnail:
          video.snippet.thumbnails.high?.url ||
          video.snippet.thumbnails.default.url,
        publishedAt: video.snippet.publishedAt,
        viewCount: parseInt(video.statistics.viewCount || 0),
        likeCount: parseInt(video.statistics.likeCount || 0),
        duration: video.contentDetails.duration,
        hashtags: extractHashtags(video.snippet.description),
        youtubeUrl: `https://www.youtube.com/watch?v=${video.id}`,
      }));

    return {
      shorts,
      nextPageToken: playlistResponse.data.nextPageToken || null,
    };
  } catch (error) {
    console.error("YouTube API error:", error);
    throw error;
  }
};

// Extract hashtags from description
function extractHashtags(description) {
  if (!description) return [];
  const hashtagRegex = /#[\w]+/g;
  const matches = description.match(hashtagRegex);
  return matches ? matches.map((tag) => tag.substring(1)) : [];
}
