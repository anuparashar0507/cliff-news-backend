// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@thecliffnews.com" },
    update: {},
    create: {
      email: "admin@thecliffnews.com",
      password: adminPassword,
      name: "Admin User",
      role: "ADMIN",
    },
  });

  // Create editor user
  const editorPassword = await bcrypt.hash("editor123", 12);
  const editor = await prisma.user.upsert({
    where: { email: "editor@thecliffnews.com" },
    update: {},
    create: {
      email: "editor@thecliffnews.com",
      password: editorPassword,
      name: "Editor User",
      role: "EDITOR",
    },
  });

  console.log("👥 Users created:", {
    admin: admin.email,
    editor: editor.email,
  });

  console.log("✅ Demo users created successfully!");
  console.log("");
  console.log("🔑 Login Credentials:");
  console.log("Admin: admin@thecliffnews.com / admin123");
  console.log("Editor: editor@thecliffnews.com / editor123");
  console.log("");
  console.log("🌐 Access Points:");
  console.log("API: http://localhost:3000/api");
  console.log("CMS: http://localhost:3000/cms");

  // Create categories
  const categories = [
    {
      name: "National",
      slug: "national",
      description: "National news and politics",
      color: "#FFA500",
    },
    {
      name: "International",
      slug: "international",
      description: "World news and global affairs",
      color: "#14213D",
    },
    {
      name: "Business",
      slug: "business",
      description: "Business and economic news",
      color: "#386641",
    },
    {
      name: "Technology",
      slug: "technology",
      description: "Tech news and innovations",
      color: "#6B7280",
    },
    {
      name: "Sports",
      slug: "sports",
      description: "Sports news and updates",
      color: "#DC2626",
    },
    {
      name: "Entertainment",
      slug: "entertainment",
      description: "Entertainment and celebrity news",
      color: "#7C3AED",
    },
    {
      name: "Health",
      slug: "health",
      description: "Health and medical news",
      color: "#059669",
    },
    {
      name: "Science",
      slug: "science",
      description: "Science and research news",
      color: "#2563EB",
    },
    {
      name: "Education",
      slug: "education",
      description: "Education news and updates",
      color: "#EA580C",
    },
    {
      name: "Lifestyle",
      slug: "lifestyle",
      description: "Lifestyle and culture news",
      color: "#EC4899",
    },
  ];

  const createdCategories = [];
  for (const category of categories) {
    const created = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    });
    createdCategories.push(created);
  }

  console.log("📂 Categories created:", createdCategories.length);

  // Create sample tags
  const tags = [
    { name: "Breaking News", slug: "breaking-news" },
    { name: "Politics", slug: "politics" },
    { name: "Economy", slug: "economy" },
    { name: "Innovation", slug: "innovation" },
    { name: "COVID-19", slug: "covid-19" },
    { name: "Climate Change", slug: "climate-change" },
    { name: "Cryptocurrency", slug: "cryptocurrency" },
    { name: "AI", slug: "ai" },
    { name: "Elections", slug: "elections" },
    { name: "Healthcare", slug: "healthcare" },
  ];

  const createdTags = [];
  for (const tag of tags) {
    const created = await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: {},
      create: tag,
    });
    createdTags.push(created);
  }

  console.log("🏷️ Tags created:", createdTags.length);

  // Create sample articles
  const sampleArticles = [
    {
      title: "Technology Revolution Transforms Indian Startups",
      slug: "technology-revolution-transforms-indian-startups",
      excerpt:
        "Indian startups are leveraging cutting-edge technology to solve complex problems and scale globally.",
      content: `<p>The Indian startup ecosystem is experiencing a technological revolution that is transforming how businesses operate and scale. From artificial intelligence to blockchain technology, startups are adopting innovative solutions to address complex challenges.</p>
      
      <p>This transformation is being driven by several key factors including increased access to funding, government initiatives, and a growing pool of skilled talent. The result is a dynamic ecosystem that is not only solving local problems but also competing on a global scale.</p>
      
      <p>Industry experts predict that this trend will continue to accelerate, with more startups expected to achieve unicorn status in the coming years. The focus on technology adoption and innovation is positioning India as a major player in the global startup landscape.</p>`,
      categoryId: createdCategories.find((c) => c.slug === "technology").id,
      authorId: admin.id,
      status: "PUBLISHED",
      isTopStory: true,
      publishedAt: new Date(),
      readTime: 3,
    },
    {
      title: "Breaking: New Economic Policy Announced",
      slug: "breaking-new-economic-policy-announced",
      excerpt:
        "Government unveils comprehensive economic policy aimed at boosting growth and employment.",
      content: `<p>In a significant development, the government has announced a new comprehensive economic policy that aims to boost economic growth and create millions of new jobs across various sectors.</p>
      
      <p>The policy includes several key initiatives such as tax reforms, infrastructure development, and support for small and medium enterprises. These measures are expected to have a positive impact on the overall economic landscape.</p>
      
      <p>Finance Minister emphasized that this policy represents a major shift towards a more inclusive and sustainable economic model that will benefit all sections of society.</p>`,
      categoryId: createdCategories.find((c) => c.slug === "business").id,
      authorId: editor.id,
      status: "PUBLISHED",
      isBreaking: true,
      publishedAt: new Date(),
      readTime: 2,
    },
    {
      title: "Sports Championship Finals Draw Record Viewership",
      slug: "sports-championship-finals-draw-record-viewership",
      excerpt:
        "The championship finals attracted the highest viewership in tournament history.",
      content: `<p>The recent championship finals have set new records for viewership, with millions of fans tuning in to watch the exciting conclusion of this year's tournament.</p>
      
      <p>The high-stakes match featured exceptional performances from both teams, keeping viewers on the edge of their seats throughout the game. Social media platforms were buzzing with commentary and reactions from fans worldwide.</p>
      
      <p>Broadcasting networks reported that the viewership numbers exceeded all previous records, demonstrating the growing popularity of the sport and the effectiveness of digital streaming platforms in reaching global audiences.</p>`,
      categoryId: createdCategories.find((c) => c.slug === "sports").id,
      authorId: admin.id,
      status: "PUBLISHED",
      isTopStory: true,
      publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      readTime: 4,
    },
  ];

  const createdArticles = [];
  for (const article of sampleArticles) {
    const created = await prisma.article.upsert({
      where: { slug: article.slug },
      update: {},
      create: article,
    });
    createdArticles.push(created);
  }

  console.log("📰 Sample articles created:", createdArticles.length);

  // Create quick reads for published articles
  for (const article of createdArticles) {
    await prisma.quickRead.upsert({
      where: { articleId: article.id },
      update: {},
      create: {
        headline: article.title.substring(0, 80),
        summary: article.excerpt.substring(0, 200),
        sourceUrl: `${
          process.env.BASE_URL || "http://localhost:3000"
        }/article/${article.slug}`,
        articleId: article.id,
      },
    });
  }

  console.log("⚡ Quick reads created for all articles");

  // Create sample highlights
  const highlights = [
    {
      title: "Economic Growth Reaches New Heights",
      imageUrl: "/uploads/images/economic-growth.jpg",
      category: "Business",
    },
    {
      title: "Tech Innovation Summit 2024",
      imageUrl: "/uploads/images/tech-summit.jpg",
      category: "Technology",
    },
    {
      title: "Sports Championship Victory",
      imageUrl:
        "/uploads/images/screencapture-localhost-5173-testing-2025-07-29-13-43-57-1758553242290-728775148.png",
      category: "Sports",
    },
  ];

  const createdHighlights = [];
  for (const highlight of highlights) {
    const created = await prisma.highlight.create({
      data: highlight,
    });
    createdHighlights.push(created);
  }

  console.log("🌟 Highlights created:", createdHighlights.length);

  // Create sample NIT items
  const nitItems = [
    {
      title: "Daily Market Update",
      imageUrl:
        "/uploads/images/screencapture-localhost-5173-testing-2025-07-29-13-43-57-1758553242291-835243699.png",
      category: "Finance",
    },
    {
      title: "Weather Alert",
      imageUrl:
        "/uploads/images/screencapture-localhost-5173-testing-2025-07-29-13-43-57-1758553242292-690092191.png",
      category: "Weather",
    },
  ];

  const createdNIT = [];
  for (const nit of nitItems) {
    const created = await prisma.nIT.create({
      data: nit,
    });
    createdNIT.push(created);
  }

  console.log("📋 NIT items created:", createdNIT.length);

  // Create sample e-papers
  const epapers = [
    {
      title: "The Cliff News - English Edition",
      date: new Date(),
      language: "ENGLISH",
      pdfUrl: "/uploads/pdfs/cliff-news-english-today.pdf",
    },
    {
      title: "The Cliff News - Hindi Edition",
      date: new Date(),
      language: "HINDI",
      pdfUrl: "/uploads/pdfs/cliff-news-hindi-today.pdf",
    },
  ];

  const createdEpapers = [];
  for (const epaper of epapers) {
    const created = await prisma.ePaper.upsert({
      where: {
        date_language: {
          date: epaper.date,
          language: epaper.language,
        },
      },
      update: {},
      create: epaper,
    });
    createdEpapers.push(created);
  }

  console.log("📄 E-papers created:", createdEpapers.length);

  console.log("✅ Database seed completed successfully!");
  console.log("");
  console.log("🔑 Login Credentials:");
  console.log("Admin: admin@thecliffnews.com / admin123");
  console.log("Editor: editor@thecliffnews.com / editor123");
  console.log("");
  console.log("🌐 Access Points:");
  console.log("API: http://localhost:3000/api");
  console.log("CMS: http://localhost:3000/cms");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
