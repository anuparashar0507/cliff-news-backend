const { createCanvas, registerFont } = require('@napi-rs/canvas');
const fs = require('fs');

// Create a simple test image using pure JS
const width = 800;
const height = 600;

// Create the HTML content for a simple SVG
const svgContent = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#4a5568"/>
  <text x="${width/2}" y="${height/2}" font-family="Arial" font-size="48" fill="white" text-anchor="middle">
    Cloudinary Test Image
  </text>
  <text x="${width/2}" y="${height/2 + 60}" font-family="Arial" font-size="24" fill="#a0aec0" text-anchor="middle">
    The Cliff News
  </text>
</svg>
`;

// Convert SVG to data URL
const svgBase64 = Buffer.from(svgContent).toString('base64');
const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`;

// Create a simple gradient image using raw pixel data
const Jimp = require('jimp');

async function createTestImage() {
  try {
    const image = new Jimp(width, height, 0x4a5568ff);

    // Add some gradient effect
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const r = Math.floor((x / width) * 255);
        const g = Math.floor((y / height) * 255);
        const b = 128;
        const color = Jimp.rgbaToInt(r, g, b, 255);
        image.setPixelColor(color, x, y);
      }
    }

    // Write the image
    await image.writeAsync('real-test-image.jpg');
    console.log('✅ Test image created successfully!');

    const stats = fs.statSync('real-test-image.jpg');
    console.log('File size:', stats.size, 'bytes');
  } catch (error) {
    console.error('Error creating image:', error);
  }
}

createTestImage();