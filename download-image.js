
const { createWriteStream } = require("fs");
const https = require("https");

const url = "https://images.unsplash.com/photo-1527004034785-9df99c5aa5c0?w=800&h=600&fit=crop";
const file = createWriteStream("test-real-image.jpg");

https.get(url, (response) => {
  response.pipe(file);
  file.on("finish", () => {
    file.close();
    console.log("Test image downloaded successfully!");
  });
}).on("error", (err) => {
  console.error("Error:", err.message);
});

