
const fs = require("fs");
const { createCanvas } = require("canvas");

// Create a simple test image
const canvas = createCanvas(800, 600);
const ctx = canvas.getContext("2d");

// Fill with gradient
const gradient = ctx.createLinearGradient(0, 0, 800, 600);
gradient.addColorStop(0, "#FF6B6B");
gradient.addColorStop(1, "#4ECDC4");
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 800, 600);

// Add text
ctx.fillStyle = "white";
ctx.font = "bold 48px Arial";
ctx.textAlign = "center";
ctx.fillText("Cloudinary Test Image", 400, 300);

// Save image
const buffer = canvas.toBuffer("image/jpeg");
fs.writeFileSync("test-image.jpg", buffer);
console.log("Test image created!");

