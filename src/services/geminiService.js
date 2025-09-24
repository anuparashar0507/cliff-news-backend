// src/services/geminiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { truncateExcerpt } = require("../utils/slugify");

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to clean HTML entities and special characters
function cleanText(text) {
  if (!text) return text;
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Function to clean content while preserving HTML formatting
function cleanContent(content) {
  if (!content) return content;
  return content
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Helper function to parse JSON with error recovery
function parseGeminiJSON(text) {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      let jsonText = jsonMatch[0];

      // Try to fix common JSON issues
      jsonText = jsonText
        .replace(/,\s*}/g, "}") // Remove trailing commas
        .replace(/,\s*]/g, "]") // Remove trailing commas in arrays
        .replace(/\n/g, " ") // Replace newlines with spaces
        .replace(/\r/g, " ") // Replace carriage returns
        .replace(/\t/g, " ") // Replace tabs
        .replace(/\s+/g, " ") // Collapse multiple spaces
        .trim();

      return JSON.parse(jsonText);
    }
  } catch (error) {
    console.error("JSON parsing error:", error);
    console.error("JSON text:", text.substring(0, 500));
    return null;
  }
  return null;
}

// Generate SEO metadata using Gemini AI
exports.generateSEOMetadata = async (title, content, language = "ENGLISH") => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("Gemini API key not provided, using fallback");
      return generateFallbackSEO(title, content);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Clean content for processing
    const cleanContent = content.replace(/<[^>]*>/g, "").substring(0, 3000);

    const languageName = language === "HINDI" ? "Hindi" : "English";

    const prompt = `
    Generate SEO metadata for this news article in ${languageName}:
    
    Title: ${title}
    Content: ${cleanContent}
    
    Please provide a JSON response with:
    1. Meta title (maximum 60 characters)
    2. Meta description (maximum 155 characters)
    3. Open Graph title (maximum 60 characters)
    4. Open Graph description (maximum 155 characters)
    5. SEO keywords (comma-separated, maximum 10 keywords)
    
    Format your response as valid JSON only:
    {
      "metaTitle": "your meta title here",
      "metaDescription": "your meta description here",
      "openGraphTitle": "your open graph title here",
      "openGraphDescription": "your open graph description here",
      "keywords": "keyword1, keyword2, keyword3"
    }
    
    Focus on making it SEO-friendly and engaging for search engines.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Validate response
        if (parsed.metaTitle && parsed.metaDescription) {
          return {
            metaTitle: parsed.metaTitle.substring(0, 60),
            metaDescription: parsed.metaDescription.substring(0, 155),
            openGraphTitle:
              parsed.openGraphTitle?.substring(0, 60) ||
              parsed.metaTitle.substring(0, 60),
            openGraphDescription:
              parsed.openGraphDescription?.substring(0, 155) ||
              parsed.metaDescription.substring(0, 155),
            keywords: parsed.keywords || "",
          };
        }
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini SEO response:", parseError);
    }

    // Fallback if parsing fails
    return generateFallbackSEO(title, content);
  } catch (error) {
    console.error("Gemini SEO generation error:", error);
    return generateFallbackSEO(title, content);
  }
};

// Generate Quick Read content using Gemini AI
exports.generateQuickRead = async (title, content, language = "ENGLISH") => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("Gemini API key not provided, using fallback");
      return generateFallbackQuickRead(title, content);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Clean content for processing
    const cleanContent = content.replace(/<[^>]*>/g, "").substring(0, 3000);

    const languageName = language === "HINDI" ? "Hindi" : "English";

    const prompt = `
    Create a quick read summary for this news article in ${languageName}:
    
    Title: ${title}
    Content: ${cleanContent}
    
    Please provide a JSON response with:
    1. A catchy, short title (maximum 60 characters)
    2. A brief summary (maximum 25 words)
    3. Key points (3-5 bullet points, each maximum 100 characters)
    4. Estimated read time in minutes (1-3 minutes)
    
    Format your response as valid JSON only:
    {
      "title": "your catchy title here",
      "summary": "your brief summary here",
      "keyPoints": ["point 1", "point 2", "point 3"],
      "readTime": 2
    }
    
    Make it engaging and perfect for quick news consumption.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Validate response
        if (parsed.title && parsed.summary) {
          return {
            title: parsed.title.substring(0, 60),
            summary: parsed.summary.substring(0, 200),
            keyPoints: parsed.keyPoints || [],
            readTime: parsed.readTime || 2,
          };
        }
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini Quick Read response:", parseError);
    }

    // Fallback if parsing fails
    return generateFallbackQuickRead(title, content);
  } catch (error) {
    console.error("Gemini Quick Read generation error:", error);
    return generateFallbackQuickRead(title, content);
  }
};

// Generate tags using Gemini AI
exports.generateTags = async (title, content, language = "ENGLISH") => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("Gemini API key not provided, using fallback");
      return generateFallbackTags(title, content);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Clean content for processing
    const cleanContent = content.replace(/<[^>]*>/g, "").substring(0, 3000);

    const languageName = language === "HINDI" ? "Hindi" : "English";

    const prompt = `
    Generate relevant tags for this news article in ${languageName}:
    
    Title: ${title}
    Content: ${cleanContent}
    
    Please provide a JSON response with:
    1. An array of 5-10 relevant tags
    2. Each tag should be 1-3 words maximum
    3. Focus on topics, locations, people, and themes
    
    Format your response as valid JSON only:
    {
      "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
    }
    
    Make the tags relevant and searchable.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Validate response
        if (parsed.tags && Array.isArray(parsed.tags)) {
          return {
            tags: parsed.tags.slice(0, 10), // Limit to 10 tags
          };
        }
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini tags response:", parseError);
    }

    // Fallback if parsing fails
    return generateFallbackTags(title, content);
  } catch (error) {
    console.error("Gemini tags generation error:", error);
    return generateFallbackTags(title, content);
  }
};

// Generate Inshort content using Gemini AI
exports.generateInshortContent = async (
  title,
  content,
  language = "ENGLISH"
) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("Gemini API key not provided, using fallback");
      return generateFallbackInshort(title, content);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Clean content for processing
    const cleanContent = content.replace(/<[^>]*>/g, "").substring(0, 3000);

    const languageName = language === "HINDI" ? "Hindi" : "English";

    const prompt = `
    Convert this news article into a short, engaging Inshort-style news story in ${languageName}:
    
    Original Title: ${title}
    Original Content: ${cleanContent}
    
    Create a concise news story that:
    1. Captures the key points in 2-3 sentences
    2. Is engaging and easy to read
    3. Maintains the news value and impact
    4. Uses simple, clear language
    5. Is suitable for quick reading (under 60 seconds)
    
    Please provide a JSON response with:
    1. A catchy, short title (maximum 60 characters)
    2. The main story content (maximum 300 characters)
    3. Estimated read time in minutes (1-2 minutes)
    
    Format your response as valid JSON only:
    {
      "title": "your catchy title here",
      "content": "your short story content here",
      "readTime": 1
    }
    
    Make sure the content is engaging, informative, and perfect for quick news consumption.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON response
    const parsed = parseGeminiJSON(text);
    if (parsed && parsed.title && parsed.content) {
      return {
        title: parsed.title.substring(0, 60),
        content: parsed.content.substring(0, 300),
        readTime: parsed.readTime || 1,
      };
    }

    // Fallback if parsing fails
    return generateFallbackInshort(title, content);
  } catch (error) {
    console.error("Gemini Inshort generation error:", error);
    return generateFallbackInshort(title, content);
  }
};

// Generate SEO metadata for Inshorts using Gemini AI
exports.generateInshortSEO = async (title, content, language = "ENGLISH") => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return generateFallbackInshortSEO(title, content);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const languageName = language === "HINDI" ? "Hindi" : "English";

    const prompt = `
    Generate SEO-friendly metadata for this Inshort news story in ${languageName}:
    
    Title: ${title}
    Content: ${content}
    
    Please provide a JSON response with:
    1. Meta title (maximum 60 characters)
    2. Meta description (maximum 155 characters)
    3. Open Graph title (maximum 60 characters)
    4. Open Graph description (maximum 155 characters)
    5. SEO keywords (comma-separated, maximum 10 keywords)

    Format your response as valid JSON only:
    {
      "metaTitle": "your meta title here",
      "metaDescription": "your meta description here",
      "openGraphTitle": "your open graph title here",
      "openGraphDescription": "your open graph description here",
      "keywords": "keyword1, keyword2, keyword3"
    }
    
    Focus on making it SEO-friendly for quick news consumption and social media sharing.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Validate response
        if (parsed.metaTitle && parsed.metaDescription) {
          return {
            metaTitle: parsed.metaTitle.substring(0, 60),
            metaDescription: parsed.metaDescription.substring(0, 155),
            openGraphTitle:
              parsed.openGraphTitle?.substring(0, 60) ||
              parsed.metaTitle.substring(0, 60),
            openGraphDescription:
              parsed.openGraphDescription?.substring(0, 155) ||
              parsed.metaDescription.substring(0, 155),
            keywords: parsed.keywords || "",
          };
        }
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini Inshort SEO response:", parseError);
    }

    // Fallback if parsing fails
    return generateFallbackInshortSEO(title, content);
  } catch (error) {
    console.error("Gemini Inshort SEO generation error:", error);
    return generateFallbackInshortSEO(title, content);
  }
};

// Generate complete news article from content
exports.generateNewsFromContent = async (content, language = "ENGLISH") => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("Gemini API key not provided, using fallback");
      return generateFallbackNewsFromContent(content);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const languageName = language === "HINDI" ? "Hindi" : "English";

    const prompt = `
    You are a professional news editor. Create a high-quality, engaging news article from the provided content in ${languageName}.
    
    Content: ${content}
    
    CRITICAL REQUIREMENTS:
    - ONLY use the information provided in the content above
    - DO NOT add any external information, facts, or details not mentioned in the provided content
    - DO NOT reference other sources or make assumptions
    - DO NOT add dates, names, or facts that are not explicitly stated in the provided content
    - DO NOT hallucinate or create information that doesn't exist in the source
    - Work ONLY with the facts and information given in the provided content
    - If the content is incomplete, do not fill in gaps with external knowledge
    - Maintain factual accuracy by sticking strictly to the provided content
    
    Additional Requirements:
    - Write a compelling, accurate news article
    - Use clear, professional language
    - Make it factual and well-structured
    - Ensure the content flows naturally
    - Format content for TinyMCE editor with proper HTML structure
    - Create ORIGINAL, UNIQUE content that is not plagiarized from other sources
    - Use your own words and writing style
    - Provide fresh perspective and analysis
    - Avoid copying phrases or sentences from other news outlets
    
    Please provide a JSON response with:
    1. A catchy, engaging title (maximum 100 characters) - based ONLY on the provided content. DO NOT use placeholder text like "AI Generated Title" or generic titles.
    2. A brief excerpt/summary (maximum 25 words) - summarizing ONLY the provided content
    3. The main article content (properly formatted HTML with paragraphs, headings, lists, emphasis) - based ONLY on the provided content
    4. Meta title for SEO (maximum 60 characters)
    5. Meta description for SEO (maximum 155 characters)
    6. SEO keywords (comma-separated, maximum 10 keywords)
    7. Estimated read time in minutes (1-10 minutes)
    8. Quick read summary (maximum 20 words) - for social media previews
    9. Suggested tags (comma-separated, maximum 8 tags) - relevant to the content
    10. Content category suggestion (one of: National, International, Sports, Technology, Business, Entertainment, Health, Science)
    
    For the content field, use proper HTML formatting:
    - Use <p> tags for paragraphs
    - Use <h2>, <h3> for subheadings
    - Use <strong> for bold text, <em> for italic
    - Use <ul> and <li> for lists
    - Use <blockquote> for quotes
    - Use proper line breaks and spacing
    
    Format your response as valid JSON only:
    {
      "title": "your catchy title here",
      "excerpt": "your brief summary here", 
      "content": "<p>Your properly formatted HTML content here with paragraphs, headings, and emphasis.</p>",
      "metaTitle": "your SEO meta title here",
      "metaDescription": "your SEO meta description here",
      "keywords": "keyword1, keyword2, keyword3",
      "readTime": 3,
      "quickRead": "your quick read summary here",
      "tags": "tag1, tag2, tag3",
      "categorySuggestion": "National"
    }
    
    IMPORTANT: 
    - Use proper HTML formatting for the content field
    - Make it production-ready for a news website
    - Ensure 100% original content with no plagiarism
    - Write in a unique voice and style
    - Provide fresh insights and analysis
    - CRITICAL: Do not add any information not present in the provided content
    - Do not make assumptions or fill in gaps with external knowledge
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON response
    const parsed = parseGeminiJSON(text);
    if (parsed && parsed.title && parsed.content) {
      return {
        title: cleanText(parsed.title).substring(0, 100),
        excerpt: truncateExcerpt(cleanText(parsed.excerpt || "")),
        content: cleanContent(parsed.content), // Use cleanContent to preserve HTML formatting
        metaTitle: cleanText(parsed.metaTitle || parsed.title).substring(0, 60),
        metaDescription: cleanText(
          parsed.metaDescription || parsed.excerpt || ""
        ).substring(0, 155),
        keywords: cleanText(parsed.keywords || ""),
        readTime: parsed.readTime || 3,
        quickRead: cleanText(parsed.quickRead || "").substring(0, 150),
        tags: cleanText(parsed.tags || ""),
        categorySuggestion: cleanText(parsed.categorySuggestion || ""),
        language: language,
      };
    }

    // Fallback if parsing fails
    return generateFallbackNewsFromContent(content);
  } catch (error) {
    console.error("Gemini news generation error:", error);
    return generateFallbackNewsFromContent(content);
  }
};

// Generate SEO metadata only
exports.generateSEOOnly = async (title, content, language = "ENGLISH") => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return generateFallbackSEOOnly(title, content);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const languageName = language === "HINDI" ? "Hindi" : "English";

    const prompt = `
    Generate SEO metadata for this news article in ${languageName}:
    
    Title: ${title}
    Content: ${content}
    
    CRITICAL REQUIREMENTS:
    - ONLY use the information provided in the title and content above
    - DO NOT add any external information, facts, or details not mentioned in the provided content
    - DO NOT reference other sources or make assumptions
    - DO NOT add dates, names, or facts that are not explicitly stated in the provided content
    - DO NOT hallucinate or create information that doesn't exist in the source
    - Work ONLY with the facts and information given in the provided content
    - If the content is incomplete, do not fill in gaps with external knowledge
    - Maintain factual accuracy by sticking strictly to the provided content
    
    Please provide a JSON response with:
    1. Meta title (maximum 60 characters) - based ONLY on the provided title and content
    2. Meta description (maximum 155 characters) - based ONLY on the provided content
    3. SEO keywords (comma-separated, maximum 10 keywords) - based ONLY on the provided content
    
    Format your response as valid JSON only:
    {
      "metaTitle": "your meta title here",
      "metaDescription": "your meta description here",
      "keywords": "keyword1, keyword2, keyword3"
    }
    
    Focus on making it SEO-friendly and engaging for search engines.
    CRITICAL: Do not add any information not present in the provided content.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Validate response
        if (parsed.metaTitle && parsed.metaDescription) {
          return {
            metaTitle: parsed.metaTitle.substring(0, 60),
            metaDescription: parsed.metaDescription.substring(0, 155),
            keywords: parsed.keywords || "",
          };
        }
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini SEO response:", parseError);
    }

    // Fallback if parsing fails
    return generateFallbackSEOOnly(title, content);
  } catch (error) {
    console.error("Gemini SEO generation error:", error);
    return generateFallbackSEOOnly(title, content);
  }
};

// Regenerate content with feedback
exports.regenerateWithFeedback = async (
  title,
  content,
  feedback,
  language = "ENGLISH"
) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return generateFallbackRegenerate(title, content, feedback);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const languageName = language === "HINDI" ? "Hindi" : "English";

    const prompt = `
    Regenerate this news article based on the feedback provided in ${languageName}:
    
    Original Title: ${title}
    Original Content: ${content}
    Feedback: ${feedback}
    
    CRITICAL REQUIREMENTS:
    - ONLY work with the information provided in the original content above
    - DO NOT add any external information, facts, or details not mentioned in the original content
    - DO NOT reference other sources or make assumptions
    - DO NOT add dates, names, or facts that are not explicitly stated in the original content
    - DO NOT hallucinate or create information that doesn't exist in the source
    - Work ONLY with the facts and information given in the original content
    - If the content is incomplete, do not fill in gaps with external knowledge
    - Maintain factual accuracy by sticking strictly to the original content
    
    Additional Requirements:
    - Address the feedback while maintaining originality
    - Create fresh, unique content that is not plagiarized
    - Use your own words and writing style
    - Provide new insights and perspectives
    - Ensure the content is completely original
    
    Please provide a JSON response with:
    1. Updated title (if needed) - based ONLY on the original content and feedback
    2. Updated content (if needed) - based ONLY on the original content with proper HTML formatting
    3. Updated meta title (if needed)
    4. Updated meta description (if needed)
    
    For content, use proper HTML formatting:
    - Use <p> tags for paragraphs
    - Use <h2>, <h3> for subheadings
    - Use <strong> for bold text, <em> for italic
    - Use <ul> and <li> for lists
    - Use <blockquote> for quotes
    
    Format your response as valid JSON only:
    {
      "title": "updated title here",
      "content": "<p>Your properly formatted HTML content here with paragraphs, headings, and emphasis.</p>",
      "metaTitle": "updated meta title here",
      "metaDescription": "updated meta description here"
    }
    
    IMPORTANT:
    - Only include fields that need to be updated based on the feedback
    - Ensure 100% original content with no plagiarism
    - Write in a unique voice and style
    - Provide fresh insights and analysis
    - CRITICAL: Do not add any information not present in the original content
    - Do not make assumptions or fill in gaps with external knowledge
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: cleanText(parsed.title || title),
          content: cleanContent(parsed.content || content), // Use cleanContent to preserve HTML formatting
          metaTitle: cleanText(parsed.metaTitle || ""),
          metaDescription: cleanText(parsed.metaDescription || ""),
        };
      }
    } catch (parseError) {
      console.error(
        "Failed to parse Gemini regeneration response:",
        parseError
      );
    }

    // Fallback if parsing fails
    return generateFallbackRegenerate(title, content, feedback);
  } catch (error) {
    console.error("Gemini regeneration error:", error);
    return generateFallbackRegenerate(title, content, feedback);
  }
};

// Translate content to another language
exports.translateContent = async (title, content, targetLanguage = "HINDI") => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return generateFallbackTranslation(title, content, targetLanguage);
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const targetLanguageName = targetLanguage === "HINDI" ? "Hindi" : "English";

    const prompt = `
    Translate this news article to ${targetLanguageName}:
    
    Title: ${title}
    Content: ${content}
    
    CRITICAL REQUIREMENTS:
    - ONLY translate the provided content, do not add any external information
    - DO NOT add facts, dates, names, or details not present in the original content
    - DO NOT reference other sources or make assumptions
    - DO NOT hallucinate or create information that doesn't exist in the source
    - Work ONLY with the facts and information given in the provided content
    - If the content is incomplete, do not fill in gaps with external knowledge
    - Maintain factual accuracy by sticking strictly to the provided content
    
    Please provide a JSON response with:
    1. Translated title - based ONLY on the provided title
    2. Translated excerpt (if any) - based ONLY on the provided content
    3. Translated content (properly formatted HTML with paragraphs, headings, lists, emphasis) - based ONLY on the provided content
    4. Translated meta title
    5. Translated meta description
    6. Translated keywords
    
    For the content field, use proper HTML formatting:
    - Use <p> tags for paragraphs
    - Use <h2>, <h3> for subheadings
    - Use <strong> for bold text, <em> for italic
    - Use <ul> and <li> for lists
    - Use <blockquote> for quotes
    - Use proper line breaks and spacing
    
    Format your response as valid JSON only:
    {
      "title": "translated title here",
      "excerpt": "translated excerpt here",
      "content": "<p>Your properly formatted HTML content here with paragraphs, headings, and emphasis.</p>",
      "metaTitle": "translated meta title here",
      "metaDescription": "translated meta description here",
      "keywords": "translated keywords here"
    }
    
    IMPORTANT:
    - Maintain the same tone and style as the original while translating accurately
    - Use proper HTML formatting for production-ready content
    - Ensure the translation is natural and original in the target language
    - Avoid literal translations that sound awkward
    - Use culturally appropriate language and expressions
    - Make it sound like it was originally written in ${targetLanguageName}
    - CRITICAL: Do not add any information not present in the provided content
    - Do not make assumptions or fill in gaps with external knowledge
  `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to parse JSON response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: cleanText(parsed.title || title),
          excerpt: cleanText(parsed.excerpt || ""),
          content: cleanContent(parsed.content || content), // Use cleanContent to preserve HTML formatting
          metaTitle: cleanText(parsed.metaTitle || ""),
          metaDescription: cleanText(parsed.metaDescription || ""),
          keywords: cleanText(parsed.keywords || ""),
        };
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini translation response:", parseError);
    }

    // Fallback if parsing fails
    return generateFallbackTranslation(title, content, targetLanguage);
  } catch (error) {
    console.error("Gemini translation error:", error);
    return generateFallbackTranslation(title, content, targetLanguage);
  }
};

// Fallback functions
function generateFallbackSEO(title, content) {
  const cleanContent = content.replace(/<[^>]*>/g, "").substring(0, 155);
  return {
    metaTitle: title.substring(0, 60),
    metaDescription: cleanContent.substring(0, 155),
    openGraphTitle: title.substring(0, 60),
    openGraphDescription: cleanContent.substring(0, 155),
    openGraphImage: null,
  };
}

function generateFallbackQuickRead(title, content) {
  const cleanContent = content.replace(/<[^>]*>/g, "").substring(0, 200);
  return {
    title: title.substring(0, 60),
    summary: cleanContent.substring(0, 200),
    keyPoints: [cleanContent.substring(0, 100)],
    readTime: 2,
  };
}

function generateFallbackTags(title, content) {
  return {
    tags: ["news", "article", "general"],
  };
}

function generateFallbackInshort(title, content) {
  const cleanContent = content.replace(/<[^>]*>/g, "").substring(0, 200);
  return {
    title: title.substring(0, 60),
    content: cleanContent.substring(0, 300),
    readTime: 1,
  };
}

function generateFallbackInshortSEO(title, content) {
  const cleanContent = content.replace(/<[^>]*>/g, "").substring(0, 155);
  return {
    metaTitle: title.substring(0, 60),
    metaDescription: cleanContent.substring(0, 155),
    openGraphTitle: title.substring(0, 60),
    openGraphDescription: cleanContent.substring(0, 155),
    keywords: "",
  };
}

function generateFallbackNewsFromContent(content) {
  const cleanContent = content.replace(/<[^>]*>/g, "").substring(0, 500);

  // Generate a more meaningful title from the content
  const firstSentence = cleanContent.split(".")[0].trim();
  const fallbackTitle =
    firstSentence.length > 0 && firstSentence.length <= 100
      ? firstSentence
      : cleanContent.substring(0, 80).trim() + "...";

  return {
    title: fallbackTitle,
    excerpt: truncateExcerpt(cleanContent),
    content: cleanContent,
    metaTitle: fallbackTitle.substring(0, 60),
    metaDescription: cleanContent.substring(0, 155),
    keywords: "news, article, breaking news",
    readTime: 3,
    language: "ENGLISH",
  };
}

function generateFallbackSEOOnly(title, content) {
  const cleanContent = content.replace(/<[^>]*>/g, "").substring(0, 155);
  return {
    metaTitle: title.substring(0, 60),
    metaDescription: cleanContent.substring(0, 155),
    keywords: "news, article",
  };
}

function generateFallbackRegenerate(title, content, feedback) {
  return {
    title: title,
    content: content,
    metaTitle: "",
    metaDescription: "",
  };
}

function generateFallbackTranslation(title, content, targetLanguage) {
  return {
    title: title,
    excerpt: "",
    content: content,
    metaTitle: "",
    metaDescription: "",
    keywords: "",
  };
}
