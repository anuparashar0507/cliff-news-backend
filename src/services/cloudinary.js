// src/services/cloudinary.js
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param {string} filePath - Local file path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
exports.uploadImage = async (filePath, options = {}) => {
  try {
    const uploadOptions = {
      folder: `${process.env.CLOUDINARY_FOLDER || 'cliff-news'}/images`,
      resource_type: 'image',
      transformation: [
        { width: 1200, height: 800, crop: 'limit', quality: 'auto:good' },
        { format: 'auto' } // Auto format selection (WebP, AVIF, etc.)
      ],
      ...options,
    };

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      thumbnailUrl: cloudinary.url(result.public_id, {
        width: 400,
        height: 300,
        crop: 'fill',
        quality: 'auto:good',
        format: 'auto'
      })
    };
  } catch (error) {
    console.error('Cloudinary image upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Upload PDF to Cloudinary
 * @param {string} filePath - Local file path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
exports.uploadPDF = async (filePath, options = {}) => {
  try {
    const uploadOptions = {
      folder: `${process.env.CLOUDINARY_FOLDER || 'cliff-news'}/pdfs`,
      resource_type: 'raw', // Use 'raw' for PDF files
      ...options,
    };

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
      // Generate thumbnail for PDF (first page as image)
      thumbnailUrl: cloudinary.url(result.public_id, {
        resource_type: 'image',
        page: 1,
        width: 400,
        height: 600,
        crop: 'fill',
        quality: 'auto:good',
        format: 'jpg'
      })
    };
  } catch (error) {
    console.error('Cloudinary PDF upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Upload highlight image to Cloudinary (for masonry layout)
 * @param {string} filePath - Local file path
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Upload result
 */
exports.uploadHighlight = async (filePath, options = {}) => {
  try {
    const uploadOptions = {
      folder: `${process.env.CLOUDINARY_FOLDER || 'cliff-news'}/highlights`,
      resource_type: 'image',
      transformation: [
        { quality: 'auto:good' }, // Keep original dimensions for masonry
        { format: 'auto' }
      ],
      ...options,
    };

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);

    // Generate multiple sizes for masonry layout
    const sizes = {
      original: result.secure_url,
      large: cloudinary.url(result.public_id, { width: 800, crop: 'limit', quality: 'auto:good', format: 'auto' }),
      medium: cloudinary.url(result.public_id, { width: 600, crop: 'limit', quality: 'auto:good', format: 'auto' }),
      small: cloudinary.url(result.public_id, { width: 400, crop: 'limit', quality: 'auto:good', format: 'auto' }),
      thumbnail: cloudinary.url(result.public_id, { width: 200, height: 200, crop: 'fill', quality: 'auto:good', format: 'auto' })
    };

    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      aspectRatio: `${result.width}:${result.height}`,
      sizes,
      thumbnailUrl: sizes.thumbnail
    };
  } catch (error) {
    console.error('Cloudinary highlight upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete file from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - Resource type (image, raw, video)
 * @returns {Promise<Object>} Delete result
 */
exports.deleteFile = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });

    return {
      success: result.result === 'ok',
      result: result.result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate image transformations for different use cases
 * @param {string} publicId - Cloudinary public ID
 * @param {Object} transformation - Transformation options
 * @returns {string} Transformed URL
 */
exports.getTransformedUrl = (publicId, transformation = {}) => {
  return cloudinary.url(publicId, {
    quality: 'auto:good',
    format: 'auto',
    ...transformation
  });
};

/**
 * Check if Cloudinary is configured
 * @returns {boolean} Configuration status
 */
exports.isConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

// Keep named exports as they are
// Don't override with default export