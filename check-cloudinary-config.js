require('dotenv').config();

console.log('=== Cloudinary Configuration Check ===\n');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? '✅ Set' : '❌ Not set');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? '✅ Set' : '❌ Not set');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Set (hidden)' : '❌ Not set');
console.log('CLOUDINARY_FOLDER:', process.env.CLOUDINARY_FOLDER || 'cliff-news (default)');

if (process.env.CLOUDINARY_CLOUD_NAME) {
  console.log('\nCloud Name value:', process.env.CLOUDINARY_CLOUD_NAME);
}

const { isConfigured } = require('./src/services/cloudinary');
console.log('\nCloudinary isConfigured():', isConfigured());