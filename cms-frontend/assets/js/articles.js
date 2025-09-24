// Articles module for The Cliff News CMS
// Handles article management, creation, editing, and publishing

// Prevent redeclaration
if (typeof articlesModule === "undefined") {
  var articlesModule = {
    // Initialize articles module
    init: function () {
      console.log("📰 Initializing articles module...");
      this.loadArticles();
      this.setupEventListeners();
      // TinyMCE will be initialized when article editor is shown
    },

    // Setup event listeners
    setupEventListeners: function () {
      // Search functionality
      const searchInput = document.getElementById("articles-search");
      if (searchInput) {
        searchInput.addEventListener(
          "input",
          debounce((e) => {
            this.searchArticles(e.target.value);
          }, 300)
        );
      }

      // Filter functionality
      const filterSelect = document.getElementById("articles-filter");
      if (filterSelect) {
        filterSelect.addEventListener("change", (e) => {
          this.filterArticles(e.target.value);
        });
      }

      // Article form submission
      const articleForm = document.getElementById("article-form");
      if (articleForm) {
        articleForm.addEventListener("submit", (e) => {
          e.preventDefault();
          this.handleArticleSubmit();
        });
      }

      // Featured image upload functionality
      this.setupFeaturedImageUpload();

      // AI Content Generation functionality
      this.setupAIContentGeneration();

      // Excerpt word count validation
      this.setupExcerptValidation();

      // Auto-save functionality
      this.setupAutoSave();
    },

    // Load articles list
    async loadArticles() {
      try {
        showLoading("Loading articles...");

        const data = await apiCall(
          "/articles?limit=50&sort=createdAt&order=desc"
        );
        this.displayArticles(data.articles || []);

        console.log("✅ Articles loaded successfully");
      } catch (error) {
        console.error("❌ Failed to load articles:", error);
        showNotification("Failed to load articles", "error");
      } finally {
        hideLoading();
      }
    },

    // Display articles in the list
    displayArticles: function (articles) {
      const articlesList = document.getElementById("articles-list");
      if (!articlesList) return;

      if (articles.length === 0) {
        articlesList.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-500 mb-4">No articles found</p>
          <button onclick="articlesModule.showArticleEditor()" class="btn btn-primary">
            Create Your First Article
          </button>
        </div>
      `;
        return;
      }

      articlesList.innerHTML = articles
        .map(
          (article) => `
      <div class="card">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="font-semibold text-lg">${article.title}</h3>
              <span class="badge ${getStatusColor(article.status)}">${
            article.status
          }</span>
              ${
                article.isBreaking
                  ? '<span class="badge badge-error">BREAKING</span>'
                  : ""
              }
              ${
                article.isTopStory
                  ? '<span class="badge badge-warning">TOP STORY</span>'
                  : ""
              }
            </div>
            <p class="text-gray-600 text-sm mb-2">${
              article.excerpt || "No excerpt available"
            }</p>
            <div class="flex items-center gap-4 text-sm text-gray-500">
              <span>by ${article.author?.name || "Unknown"}</span>
              <span>in ${article.category?.name || "Uncategorized"}</span>
              <span>${formatDate(article.createdAt)}</span>
              <span>${article.readTime || 0} min read</span>
              <span>${article.viewCount || 0} views</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="articlesModule.editArticle('${
              article.id
            }')" class="btn btn-sm btn-secondary">
              Edit
            </button>
            <button onclick="articlesModule.previewArticle('${
              article.id
            }')" class="btn btn-sm">
              Preview
            </button>
            <button onclick="articlesModule.generateInshort('${
              article.id
            }')" class="btn btn-sm btn-primary generate-inshort-btn" data-article-id="${
            article.id
          }">
              📱 Generate Inshort
            </button>
            <button onclick="articlesModule.deleteArticle('${
              article.id
            }')" class="btn btn-sm btn-danger">
              Delete
            </button>
          </div>
        </div>
      </div>
    `
        )
        .join("");
    },

    // Search articles
    searchArticles: function (query) {
      const articles = document.querySelectorAll("#articles-list .card");
      const searchTerm = query.toLowerCase();

      articles.forEach((article) => {
        const title = article.querySelector("h3").textContent.toLowerCase();
        const excerpt = article.querySelector("p").textContent.toLowerCase();
        const author = article.querySelector("span").textContent.toLowerCase();

        const matches =
          title.includes(searchTerm) ||
          excerpt.includes(searchTerm) ||
          author.includes(searchTerm);

        article.style.display = matches ? "block" : "none";
      });
    },

    // Filter articles by status
    filterArticles: function (status) {
      const articles = document.querySelectorAll("#articles-list .card");

      articles.forEach((article) => {
        const badge = article.querySelector(".badge");
        const articleStatus = badge.textContent.trim();

        if (status === "" || articleStatus === status) {
          article.style.display = "block";
        } else {
          article.style.display = "none";
        }
      });
    },

    // Show article editor
    showArticleEditor: function (articleId = null) {
      // Stop any existing auto-save
      this.stopAutoSave();

      currentEditingArticle = articleId;

      // Update editor title
      const editorTitle = document.getElementById("editor-title");
      if (editorTitle) {
        editorTitle.textContent = articleId
          ? "Edit Article"
          : "Create New Article";
      }

      // Load categories for dropdown
      this.loadCategoriesForForm();

      // Show editor section
      CMS.showSection("article-editor");

      // Initialize TinyMCE after showing the editor
      setTimeout(() => {
        console.log("🕐 Initializing TinyMCE in article editor...");
        this.initializeTinyMCE();
      }, 500);

      if (articleId) {
        this.loadArticleForEdit(articleId);
      } else {
        this.clearArticleForm();
        // Show buttons for new articles (default to ENGLISH)
        this.updateLanguageButtons("ENGLISH");
      }

      // Setup auto-save for editing
      this.setupAutoSave();
    },

    // Load categories for article form
    async loadCategoriesForForm() {
      try {
        const data = await apiCall("/categories");
        const select = document.getElementById("article-category");
        if (!select) return;

        select.innerHTML = '<option value="">Select Category</option>';

        if (data.categories) {
          data.categories.forEach((category) => {
            select.innerHTML += `<option value="${category.id}">${category.name}</option>`;
          });
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    },

    // Load article for editing
    loadArticleForEdit: async function (articleId) {
      try {
        showLoading("Loading article...");

        const data = await apiCall(`/articles/${articleId}`);
        const article = data.article;

        // Populate form fields
        document.getElementById("article-title").value = article.title || "";
        document.getElementById("article-excerpt").value =
          article.excerpt || "";
        document.getElementById("article-category").value =
          article.categoryId || "";
        document.getElementById("article-image").value =
          article.featuredImage || "";
        document.getElementById("article-language").value =
          article.language || "ENGLISH";

        // Handle featured image preview
        if (article.featuredImage) {
          this.showFeaturedImagePreview(article.featuredImage);
        } else {
          this.removeFeaturedImage();
        }
        document.getElementById("article-meta-title").value =
          article.metaTitle || "";
        document.getElementById("article-meta-description").value =
          article.metaDescription || "";
        document.getElementById("article-breaking").checked =
          article.isBreaking || false;
        document.getElementById("article-top-story").checked =
          article.isTopStory || false;

        // Set TinyMCE content with delay to ensure editor is fully ready
        setTimeout(() => {
          this.setTinyMCEContent(article.content || "");
        }, 800);

        // Show language-specific buttons after loading the article
        this.updateLanguageButtons(article.language || "ENGLISH");

        console.log("✅ Article loaded for editing");
      } catch (error) {
        console.error("❌ Failed to load article:", error);
        showNotification("Failed to load article for editing", "error");
      } finally {
        hideLoading();
      }
    },

    // Clear article form
    clearArticleForm: function () {
      const form = document.getElementById("article-form");
      if (form) {
        form.reset();
      }

      // Reset featured image
      this.removeFeaturedImage();

      // Clear TinyMCE content
      if (window.tinymce && tinymce.get("article-content")) {
        tinymce.get("article-content").setContent("");
      }
    },

    // Handle article form submission
    handleArticleSubmit: async function () {
      try {
        showLoading("Saving article...");

        const formData = this.getArticleFormData();

        const url = currentEditingArticle
          ? `/articles/${currentEditingArticle}`
          : "/articles";
        const method = currentEditingArticle ? "PUT" : "POST";

        const response = await apiCall(url, method, formData);

        if (response.success) {
          showNotification(
            `Article ${
              currentEditingArticle ? "updated" : "created"
            } successfully!`,
            "success"
          );
          CMS.showSection("articles");
          this.loadArticles(); // Refresh the list
        } else {
          showNotification("Failed to save article", "error");
        }
      } catch (error) {
        console.error("❌ Failed to save article:", error);
        showNotification("Failed to save article", "error");
      } finally {
        hideLoading();
      }
    },

    // Get article form data
    getArticleFormData: function () {
      const content =
        window.tinymce && tinymce.get("article-content")
          ? tinymce.get("article-content").getContent()
          : document.getElementById("article-content").value;

      return {
        title: document.getElementById("article-title").value,
        content: content,
        excerpt: document.getElementById("article-excerpt").value,
        categoryId: document.getElementById("article-category").value,
        featuredImage: document.getElementById("article-image").value,
        language: document.getElementById("article-language").value,
        metaTitle: document.getElementById("article-meta-title").value,
        metaDescription: document.getElementById("article-meta-description")
          .value,
        tags: document.getElementById("article-tags").value,
        quickRead: document.getElementById("article-quick-read").value,
        isBreaking: document.getElementById("article-breaking").checked,
        isTopStory: document.getElementById("article-top-story").checked,
        status: "DRAFT", // Default to draft, user can publish later
      };
    },

    // Validate article form data
    validateArticleForm: function (formData) {
      const errors = [];

      if (!formData.title || formData.title.trim() === "") {
        errors.push("Title is required");
      }

      if (!formData.content || formData.content.trim() === "") {
        errors.push("Content is required");
      }

      if (!formData.categoryId || formData.categoryId === "") {
        errors.push("Category is required");
      }

      return errors;
    },

    // Save article with specific status
    saveArticle: async function (status) {
      try {
        showLoading(
          `${status === "PUBLISHED" ? "Publishing" : "Saving"} article...`
        );

        const formData = this.getArticleFormData();
        formData.status = status;

        // Validate form data
        const validationErrors = this.validateArticleForm(formData);
        if (validationErrors.length > 0) {
          hideLoading();
          CMS.showNotification(
            `Please fix the following errors: ${validationErrors.join(", ")}`,
            "error"
          );
          return;
        }

        const url = currentEditingArticle
          ? `/articles/${currentEditingArticle}`
          : "/articles";
        const method = currentEditingArticle ? "PUT" : "POST";

        const response = await apiCall(url, method, formData);

        if (response.success) {
          showNotification(
            `News ${status.toLowerCase()} successfully!`,
            "success"
          );
          CMS.showSection("articles");
          this.loadArticles();
        } else {
          showNotification("Failed to save article", "error");
        }
      } catch (error) {
        console.error("❌ Failed to save article:", error);
        showNotification("Failed to save article", "error");
      } finally {
        hideLoading();
      }
    },

    // Edit article
    editArticle: function (articleId) {
      this.showArticleEditor(articleId);
    },

    // Preview article
    previewArticle: function (articleId) {
      // Open article preview in new tab
      window.open(`/api/articles/${articleId}`, "_blank");
    },

    // Delete article
    deleteArticle: async function (articleId) {
      if (
        !confirm(
          "Are you sure you want to delete this article? This action cannot be undone."
        )
      ) {
        return;
      }

      try {
        showLoading("Deleting article...");

        await apiCall(`/articles/${articleId}`, "DELETE");

        // Stop auto-save if this was the article being edited
        if (currentEditingArticle === articleId) {
          this.stopAutoSave();
        }

        showNotification("News deleted successfully", "success");
        this.loadArticles(); // Refresh the list
      } catch (error) {
        console.error("❌ Failed to delete article:", error);
        showNotification("Failed to delete news", "error");
      } finally {
        hideLoading();
      }
    },

    // Initialize TinyMCE editor
    initializeTinyMCE: function () {
      console.log("🔧 Attempting to initialize TinyMCE...");
      console.log("TinyMCE available:", typeof tinymce !== "undefined");

      if (typeof tinymce === "undefined") {
        console.warn("❌ TinyMCE not loaded, skipping initialization");
        return;
      }

      console.log("✅ TinyMCE is available, proceeding with initialization...");

      // Check if the target element exists
      const targetElement = document.getElementById("article-content");
      console.log("Target element exists:", !!targetElement);
      if (!targetElement) {
        console.warn("❌ Target element #article-content not found");
        return;
      }

      console.log("🎯 Starting TinyMCE initialization...");

      try {
        tinymce.init({
          selector: "#article-content",
          height: 500,
          base_url: "/cms/assets/tinymce/js/tinymce",
          suffix: ".min",
          menubar: false,
          plugins: [
            "advlist",
            "autolink",
            "lists",
            "link",
            "image",
            "charmap",
            "preview",
            "anchor",
            "searchreplace",
            "visualblocks",
            "code",
            "fullscreen",
            "insertdatetime",
            "media",
            "table",
            "help",
            "wordcount",
          ],
          toolbar:
            "undo redo | blocks | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table | code preview fullscreen | help",
          content_style:
            'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.6; }',
          images_upload_handler: function (blobInfo) {
            console.log("📤 Uploading image via TinyMCE...");
            return new Promise((resolve, reject) => {
              articlesModule.uploadImage(blobInfo.blob(), resolve, reject);
            });
          },
          images_upload_url: "/api/upload/image",
          automatic_uploads: true,
          file_picker_types: "image",
          // Use GPL license for community edition
          license_key: "gpl",
          // Disable external plugins completely
          external_plugins: {},
          // Add callback for successful initialization
          init_instance_callback: function (editor) {
            console.log("✅ TinyMCE editor initialized successfully");
          },
          // Add error handling
          setup: function (editor) {
            editor.on("change", function () {
              // Auto-save functionality - DISABLED
              // articlesModule.autoSave();
              console.log("📝 Content changed (auto-save disabled)");
            });

            editor.on("init", function () {
              console.log("🎉 TinyMCE editor is ready!");
            });
          },
        });

        console.log("📤 TinyMCE init() called");
      } catch (error) {
        console.error("❌ TinyMCE initialization failed:", error);
      }
    },

    // Upload image to server
    uploadImage: async function (file, resolve, reject) {
      try {
        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch("/api/upload/image", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData,
        });

        const data = await response.json();

        if (data.success && data.file && data.file.url) {
          resolve(data.file.url);
        } else {
          reject(data.error || "Upload failed");
        }
      } catch (error) {
        console.error("Image upload failed:", error);
        reject("Upload failed");
      }
    },

    // Setup auto-save functionality
    setupAutoSave: function () {
      // DISABLED: Auto-save is causing rate limiting issues
      // Clear any existing interval
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = null;
      }

      console.log("⚠️ Auto-save disabled to prevent rate limiting");
      // Auto-save every 30 seconds - DISABLED
      // this.autoSaveInterval = setInterval(() => {
      //   if (
      //     currentEditingArticle &&
      //     document.getElementById("article-title").value
      //   ) {
      //     this.autoSave();
      //   }
      // }, 30000);
    },

    // Auto-save draft
    autoSave: async function () {
      if (!currentEditingArticle) return;

      try {
        const formData = this.getArticleFormData();
        formData.status = "DRAFT";

        await apiCall(`/articles/${currentEditingArticle}`, "PUT", formData);
        console.log("💾 Auto-saved article");
      } catch (error) {
        console.error("Auto-save failed:", error);
        // If article not found or rate limited, stop auto-saving
        if (
          error.message.includes("not found") ||
          error.message.includes("404") ||
          error.message.includes("429") ||
          error.message.includes("rate limit")
        ) {
          console.log("🛑 Stopping auto-save - error detected");
          this.stopAutoSave();
        }
      }
    },

    // Stop auto-save
    stopAutoSave: function () {
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = null;
        currentEditingArticle = null;
      }
    },

    // Get article statistics
    getArticleStats: async function () {
      try {
        const data = await apiCall("/articles?limit=1");
        return {
          total: data.pagination?.total || 0,
          published: 0, // Would need separate API call
          drafts: 0,
          views: 0,
        };
      } catch (error) {
        console.error("Failed to get article stats:", error);
        return { total: 0, published: 0, drafts: 0, views: 0 };
      }
    },

    // Generate Inshort from Article
    generateInshort: async function (articleId) {
      try {
        CMS.showNotification("Generating Inshort...", "info");

        const response = await CMS.apiCall(
          `/inshorts/generate/${articleId}`,
          "POST",
          {
            language: "ENGLISH",
          }
        );

        if (response.success) {
          CMS.showNotification("Inshort generated successfully!", "success");
          // Optionally navigate to inshorts section
          // CMS.showSection('inshorts');
        }
      } catch (error) {
        console.error("Failed to generate inshort:", error);
        CMS.showNotification("Failed to generate Inshort", "error");
      }
    },

    // Setup featured image upload functionality
    setupFeaturedImageUpload: function () {
      const uploadArea = document.getElementById("featured-image-upload-area");
      const fileInput = document.getElementById("featured-image-input");
      const preview = document.getElementById("featured-image-preview");
      const previewImg = document.getElementById("featured-image-preview-img");
      const removeBtn = document.getElementById("remove-featured-image");
      const changeBtn = document.getElementById("change-featured-image");

      if (!uploadArea || !fileInput) return;

      // Click to upload
      uploadArea.addEventListener("click", () => {
        fileInput.click();
      });

      // File input change
      fileInput.addEventListener("change", (e) => {
        if (e.target.files[0]) {
          this.handleFeaturedImageUpload(e.target.files[0]);
        }
      });

      // Remove image
      if (removeBtn) {
        removeBtn.addEventListener("click", () => {
          this.removeFeaturedImage();
        });
      }

      // Change image
      if (changeBtn) {
        changeBtn.addEventListener("click", () => {
          fileInput.click();
        });
      }

      // Drag and drop
      uploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadArea.classList.add("border-indigo-500", "bg-indigo-50");
      });

      uploadArea.addEventListener("dragleave", (e) => {
        e.preventDefault();
        uploadArea.classList.remove("border-indigo-500", "bg-indigo-50");
      });

      uploadArea.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadArea.classList.remove("border-indigo-500", "bg-indigo-50");
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith("image/")) {
          this.handleFeaturedImageUpload(files[0]);
        }
      });
    },

    // Handle featured image upload
    handleFeaturedImageUpload: async function (file) {
      try {
        console.log("📤 Uploading featured image...");
        CMS.showNotification("Uploading featured image...", "info");

        const formData = new FormData();
        formData.append("image", file);

        const response = await fetch("/api/upload/image", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          // Update the image URL field
          document.getElementById("article-image").value = data.file.url;

          // Show preview
          this.showFeaturedImagePreview(data.file.url);

          CMS.showNotification(
            "Featured image uploaded successfully!",
            "success"
          );
        } else {
          throw new Error(data.error || "Upload failed");
        }
      } catch (error) {
        console.error("Featured image upload failed:", error);
        CMS.showNotification("Failed to upload featured image", "error");
      }
    },

    // Show featured image preview
    showFeaturedImagePreview: function (imageUrl) {
      const preview = document.getElementById("featured-image-preview");
      const previewImg = document.getElementById("featured-image-preview-img");
      const uploadArea = document.getElementById("featured-image-upload-area");
      const removeBtn = document.getElementById("remove-featured-image");
      const changeBtn = document.getElementById("change-featured-image");

      if (preview && previewImg) {
        previewImg.src = imageUrl;
        preview.classList.remove("hidden");
        uploadArea.classList.add("hidden");

        if (removeBtn) removeBtn.classList.remove("hidden");
        if (changeBtn) changeBtn.classList.remove("hidden");
      }
    },

    // Remove featured image
    removeFeaturedImage: function () {
      const preview = document.getElementById("featured-image-preview");
      const uploadArea = document.getElementById("featured-image-upload-area");
      const removeBtn = document.getElementById("remove-featured-image");
      const changeBtn = document.getElementById("change-featured-image");
      const fileInput = document.getElementById("featured-image-input");

      // Clear the image URL field
      document.getElementById("article-image").value = "";

      // Reset UI
      if (preview) preview.classList.add("hidden");
      if (uploadArea) uploadArea.classList.remove("hidden");
      if (removeBtn) removeBtn.classList.add("hidden");
      if (changeBtn) changeBtn.classList.add("hidden");
      if (fileInput) fileInput.value = "";

      CMS.showNotification("Featured image removed", "info");
    },

    // Setup AI Content Generation functionality
    setupAIContentGeneration: function () {
      // Create News from Pasted Content
      const createNewsBtn = document.getElementById("create-news-from-content");
      if (createNewsBtn) {
        // Remove existing event listeners to prevent duplicates
        createNewsBtn.replaceWith(createNewsBtn.cloneNode(true));
        const newCreateNewsBtn = document.getElementById(
          "create-news-from-content"
        );
        newCreateNewsBtn.addEventListener("click", () => {
          this.createNewsFromContent();
        });
      }

      // Generate SEO with AI
      const generateSEOBtn = document.getElementById("generate-seo-ai");
      if (generateSEOBtn) {
        // Remove existing event listeners to prevent duplicates
        generateSEOBtn.replaceWith(generateSEOBtn.cloneNode(true));
        const newGenerateSEOBtn = document.getElementById("generate-seo-ai");
        newGenerateSEOBtn.addEventListener("click", () => {
          this.generateSEOWithAI();
        });
      }

      // Regenerate Content
      const regenerateBtn = document.getElementById("regenerate-content");
      if (regenerateBtn) {
        // Remove existing event listeners to prevent duplicates
        regenerateBtn.replaceWith(regenerateBtn.cloneNode(true));
        const newRegenerateBtn = document.getElementById("regenerate-content");
        newRegenerateBtn.addEventListener("click", () => {
          this.showFeedbackSection();
        });
      }

      // Translate to Hindi
      const translateHindiBtn = document.getElementById("translate-to-hindi");
      if (translateHindiBtn) {
        // Remove existing event listeners to prevent duplicates
        translateHindiBtn.replaceWith(translateHindiBtn.cloneNode(true));
        const newTranslateHindiBtn =
          document.getElementById("translate-to-hindi");
        newTranslateHindiBtn.addEventListener("click", () => {
          this.translateToHindi();
        });
      }

      // Translate to English
      const translateEnglishBtn = document.getElementById(
        "translate-to-english"
      );
      if (translateEnglishBtn) {
        // Remove existing event listeners to prevent duplicates
        translateEnglishBtn.replaceWith(translateEnglishBtn.cloneNode(true));
        const newTranslateEnglishBtn = document.getElementById(
          "translate-to-english"
        );
        newTranslateEnglishBtn.addEventListener("click", () => {
          this.translateToEnglish();
        });
      }

      // Create Hindi Article
      const createHindiBtn = document.getElementById("create-hindi-article");
      if (createHindiBtn) {
        // Remove existing event listeners to prevent duplicates
        createHindiBtn.replaceWith(createHindiBtn.cloneNode(true));
        const newCreateHindiBtn = document.getElementById(
          "create-hindi-article"
        );
        newCreateHindiBtn.addEventListener("click", () => {
          this.createHindiArticle();
        });
      }

      // Create English Article
      const createEnglishBtn = document.getElementById(
        "create-english-article"
      );
      if (createEnglishBtn) {
        // Remove existing event listeners to prevent duplicates
        createEnglishBtn.replaceWith(createEnglishBtn.cloneNode(true));
        const newCreateEnglishBtn = document.getElementById(
          "create-english-article"
        );
        newCreateEnglishBtn.addEventListener("click", () => {
          this.createEnglishArticle();
        });
      }

      // Feedback system
      const applyFeedbackBtn = document.getElementById("apply-feedback");
      if (applyFeedbackBtn) {
        // Remove existing event listeners to prevent duplicates
        applyFeedbackBtn.replaceWith(applyFeedbackBtn.cloneNode(true));
        const newApplyFeedbackBtn = document.getElementById("apply-feedback");
        newApplyFeedbackBtn.addEventListener("click", () => {
          this.applyFeedbackAndRegenerate();
        });
      }

      const cancelFeedbackBtn = document.getElementById("cancel-feedback");
      if (cancelFeedbackBtn) {
        // Remove existing event listeners to prevent duplicates
        cancelFeedbackBtn.replaceWith(cancelFeedbackBtn.cloneNode(true));
        const newCancelFeedbackBtn = document.getElementById("cancel-feedback");
        newCancelFeedbackBtn.addEventListener("click", () => {
          this.hideFeedbackSection();
        });
      }

      // Character counters for SEO fields
      this.setupSEOCharacterCounters();
    },

    // Setup SEO character counters
    setupSEOCharacterCounters: function () {
      const metaTitleInput = document.getElementById("article-meta-title");
      const metaDescriptionInput = document.getElementById(
        "article-meta-description"
      );
      const titleCounter = document.getElementById("meta-title-count");
      const descriptionCounter = document.getElementById(
        "meta-description-count"
      );

      if (metaTitleInput && titleCounter) {
        metaTitleInput.addEventListener("input", () => {
          titleCounter.textContent = metaTitleInput.value.length;
          if (metaTitleInput.value.length > 60) {
            titleCounter.classList.add("text-red-500");
          } else {
            titleCounter.classList.remove("text-red-500");
          }
        });
      }

      if (metaDescriptionInput && descriptionCounter) {
        metaDescriptionInput.addEventListener("input", () => {
          descriptionCounter.textContent = metaDescriptionInput.value.length;
          if (metaDescriptionInput.value.length > 155) {
            descriptionCounter.classList.add("text-red-500");
          } else {
            descriptionCounter.classList.remove("text-red-500");
          }
        });
      }

      // Quick read counter
      const quickReadInput = document.getElementById("article-quick-read");
      const quickReadCounter = document.getElementById("quick-read-count");
      if (quickReadInput && quickReadCounter) {
        quickReadInput.addEventListener("input", () => {
          quickReadCounter.textContent = quickReadInput.value.length;
          if (quickReadInput.value.length > 150) {
            quickReadCounter.classList.add("text-red-500");
          } else {
            quickReadCounter.classList.remove("text-red-500");
          }
        });
      }
    },

    // Create News from Pasted Content
    createNewsFromContent: async function () {
      try {
        const content = this.getTinyMCEContent();
        if (!content || content.trim().length < 50) {
          CMS.showNotification(
            "Please paste some content in the editor first",
            "warning"
          );
          return;
        }

        CMS.showNotification(
          "🤖 Creating news article from content...",
          "info"
        );

        const response = await CMS.apiCall(
          "/articles/generate-from-content",
          "POST",
          {
            content: content,
            language: document.getElementById("article-language").value,
          }
        );

        if (response.success) {
          const data = response.data;

          // Populate all fields
          document.getElementById("article-title").value = data.title || "";
          document.getElementById("article-excerpt").value = data.excerpt || "";
          document.getElementById("article-meta-title").value =
            data.metaTitle || "";
          document.getElementById("article-meta-description").value =
            data.metaDescription || "";
          document.getElementById("article-keywords").value =
            data.keywords || "";
          document.getElementById("article-read-time").value =
            data.readTime || "";
          document.getElementById("article-tags").value = data.tags || "";
          document.getElementById("article-quick-read").value =
            data.quickRead || "";

          // Update content in TinyMCE
          if (window.tinymce && tinymce.get("article-content")) {
            tinymce.get("article-content").setContent(data.content || content);
          }

          // Set a default category if none is selected
          const categorySelect = document.getElementById("article-category");
          if (categorySelect && !categorySelect.value) {
            // Set to first available category or show a warning
            if (categorySelect.options.length > 1) {
              categorySelect.value = categorySelect.options[1].value; // Skip the empty option
              CMS.showNotification(
                "⚠️ Please select a category before saving",
                "warning"
              );
            } else {
              CMS.showNotification("⚠️ Please add a category first", "warning");
            }
          }

          // Show language-specific buttons
          this.updateLanguageButtons(data.language);

          // Update character counters
          this.updateCharacterCounters();

          CMS.showNotification("✅ News created successfully!", "success");
        }
      } catch (error) {
        console.error("Failed to create news from content:", error);
        CMS.showNotification("Failed to create news", "error");
      }
    },

    // Generate SEO with AI
    generateSEOWithAI: async function () {
      try {
        const title = document.getElementById("article-title").value;
        const content = this.getTinyMCEContent();

        if (!title && !content) {
          CMS.showNotification(
            "Please add a title or content first",
            "warning"
          );
          return;
        }

        CMS.showNotification("🔍 Generating SEO metadata...", "info");

        const response = await CMS.apiCall("/articles/generate-seo", "POST", {
          title: title,
          content: content,
          language: document.getElementById("article-language").value,
        });

        if (response.success) {
          const data = response.data;

          // Update SEO fields only
          document.getElementById("article-meta-title").value =
            data.metaTitle || "";
          document.getElementById("article-meta-description").value =
            data.metaDescription || "";
          document.getElementById("article-keywords").value =
            data.keywords || "";

          // Update character counters
          this.updateCharacterCounters();

          CMS.showNotification(
            "✅ SEO metadata generated successfully!",
            "success"
          );
        }
      } catch (error) {
        console.error("Failed to generate SEO:", error);
        CMS.showNotification("Failed to generate SEO metadata", "error");
      }
    },

    // Show feedback section for regeneration
    showFeedbackSection: function () {
      const feedbackSection = document.getElementById("ai-feedback-section");
      if (feedbackSection) {
        feedbackSection.classList.remove("hidden");
        document.getElementById("ai-feedback-input").focus();
      }
    },

    // Hide feedback section
    hideFeedbackSection: function () {
      const feedbackSection = document.getElementById("ai-feedback-section");
      if (feedbackSection) {
        feedbackSection.classList.add("hidden");
        document.getElementById("ai-feedback-input").value = "";
      }
    },

    // Apply feedback and regenerate
    applyFeedbackAndRegenerate: async function () {
      try {
        const feedback = document.getElementById("ai-feedback-input").value;
        if (!feedback.trim()) {
          CMS.showNotification("Please provide feedback", "warning");
          return;
        }

        const currentContent = this.getTinyMCEContent();
        const currentTitle = document.getElementById("article-title").value;

        CMS.showNotification(
          "🔄 Regenerating content with feedback...",
          "info"
        );

        const response = await CMS.apiCall(
          "/articles/regenerate-with-feedback",
          "POST",
          {
            title: currentTitle,
            content: currentContent,
            feedback: feedback,
            language: document.getElementById("article-language").value,
          }
        );

        if (response.success) {
          const data = response.data;

          // Update content
          if (data.title) {
            document.getElementById("article-title").value = data.title;
          }
          if (data.content) {
            if (window.tinymce && tinymce.get("article-content")) {
              tinymce.get("article-content").setContent(data.content);
            }
          }
          if (data.metaTitle) {
            document.getElementById("article-meta-title").value =
              data.metaTitle;
          }
          if (data.metaDescription) {
            document.getElementById("article-meta-description").value =
              data.metaDescription;
          }

          this.hideFeedbackSection();
          this.updateCharacterCounters();
          CMS.showNotification(
            "✅ Content regenerated successfully!",
            "success"
          );
        }
      } catch (error) {
        console.error("Failed to regenerate content:", error);
        CMS.showNotification("Failed to regenerate content", "error");
      }
    },

    // Translate to Hindi
    translateToHindi: async function () {
      try {
        const title = document.getElementById("article-title").value;
        const content = this.getTinyMCEContent();

        if (!title && !content) {
          CMS.showNotification("Please add content to translate", "warning");
          return;
        }

        CMS.showNotification("🇮🇳 Translating to Hindi...", "info");

        const response = await CMS.apiCall("/articles/translate", "POST", {
          title: title,
          content: content,
          targetLanguage: "HINDI",
        });

        if (response.success) {
          const data = response.data;

          // Update all fields with Hindi content
          document.getElementById("article-title").value = data.title || "";
          document.getElementById("article-excerpt").value = data.excerpt || "";
          document.getElementById("article-meta-title").value =
            data.metaTitle || "";
          document.getElementById("article-meta-description").value =
            data.metaDescription || "";
          document.getElementById("article-keywords").value =
            data.keywords || "";
          document.getElementById("article-language").value = "HINDI";

          // Update content in TinyMCE
          if (window.tinymce && tinymce.get("article-content")) {
            tinymce.get("article-content").setContent(data.content || content);
          }

          // Update language buttons
          this.updateLanguageButtons("HINDI");
          this.updateCharacterCounters();

          CMS.showNotification(
            "✅ Content translated to Hindi successfully!",
            "success"
          );
        }
      } catch (error) {
        console.error("Failed to translate to Hindi:", error);
        CMS.showNotification("Failed to translate to Hindi", "error");
      }
    },

    // Translate to English
    translateToEnglish: async function () {
      try {
        const title = document.getElementById("article-title").value;
        const content = this.getTinyMCEContent();

        if (!title && !content) {
          CMS.showNotification("Please add content to translate", "warning");
          return;
        }

        CMS.showNotification("🇺🇸 Translating to English...", "info");

        const response = await CMS.apiCall("/articles/translate", "POST", {
          title: title,
          content: content,
          targetLanguage: "ENGLISH",
        });

        if (response.success) {
          const data = response.data;

          // Update all fields with English content
          document.getElementById("article-title").value = data.title || "";
          document.getElementById("article-excerpt").value = data.excerpt || "";
          document.getElementById("article-meta-title").value =
            data.metaTitle || "";
          document.getElementById("article-meta-description").value =
            data.metaDescription || "";
          document.getElementById("article-keywords").value =
            data.keywords || "";
          document.getElementById("article-language").value = "ENGLISH";

          // Update content in TinyMCE
          if (window.tinymce && tinymce.get("article-content")) {
            tinymce.get("article-content").setContent(data.content || content);
          }

          // Update language buttons
          this.updateLanguageButtons("ENGLISH");
          this.updateCharacterCounters();

          CMS.showNotification(
            "✅ Content translated to English successfully!",
            "success"
          );
        }
      } catch (error) {
        console.error("Failed to translate to English:", error);
        CMS.showNotification("Failed to translate to English", "error");
      }
    },

    // Update language-specific buttons
    updateLanguageButtons: function (currentLanguage) {
      const regenerateBtn = document.getElementById("regenerate-content");
      const translateHindiBtn = document.getElementById("translate-to-hindi");
      const translateEnglishBtn = document.getElementById(
        "translate-to-english"
      );
      const createHindiBtn = document.getElementById("create-hindi-article");
      const createEnglishBtn = document.getElementById(
        "create-english-article"
      );

      // Show regenerate button
      if (regenerateBtn) {
        regenerateBtn.classList.remove("hidden");
      }

      // Show appropriate translation and create buttons
      if (currentLanguage === "ENGLISH") {
        if (translateHindiBtn) translateHindiBtn.classList.remove("hidden");
        if (translateEnglishBtn) translateEnglishBtn.classList.add("hidden");
        if (createHindiBtn) createHindiBtn.classList.remove("hidden");
        if (createEnglishBtn) createEnglishBtn.classList.add("hidden");
      } else if (currentLanguage === "HINDI") {
        if (translateHindiBtn) translateHindiBtn.classList.add("hidden");
        if (translateEnglishBtn) translateEnglishBtn.classList.remove("hidden");
        if (createHindiBtn) createHindiBtn.classList.add("hidden");
        if (createEnglishBtn) createEnglishBtn.classList.remove("hidden");
      }
    },

    // Update character counters
    updateCharacterCounters: function () {
      const metaTitleInput = document.getElementById("article-meta-title");
      const metaDescriptionInput = document.getElementById(
        "article-meta-description"
      );
      const quickReadInput = document.getElementById("article-quick-read");
      const titleCounter = document.getElementById("meta-title-count");
      const descriptionCounter = document.getElementById(
        "meta-description-count"
      );
      const quickReadCounter = document.getElementById("quick-read-count");

      if (metaTitleInput && titleCounter) {
        titleCounter.textContent = metaTitleInput.value.length;
      }
      if (metaDescriptionInput && descriptionCounter) {
        descriptionCounter.textContent = metaDescriptionInput.value.length;
      }
      if (quickReadInput && quickReadCounter) {
        quickReadCounter.textContent = quickReadInput.value.length;
      }
    },

    // Get TinyMCE content
    getTinyMCEContent: function () {
      if (window.tinymce && tinymce.get("article-content")) {
        return tinymce.get("article-content").getContent();
      }
      return document.getElementById("article-content").value || "";
    },

    // Set TinyMCE content with retry mechanism and error handling
    setTinyMCEContent: function (content, maxRetries = 10) {
      console.log("🔄 setTinyMCEContent called with content length:", content.length);
      console.log("📝 Content preview:", content.substring(0, 100) + "...");

      // Sanitize content for TinyMCE
      const sanitizeContent = (html) => {
        if (!html) return "";

        // Basic sanitization to prevent TinyMCE parsing errors
        return html
          .replace(/\u0000/g, "") // Remove null characters
          .replace(/\ufeff/g, "") // Remove BOM characters
          .trim();
      };

      const attemptSetContent = (retryCount = 0) => {
        if (window.tinymce && tinymce.get("article-content")) {
          try {
            const sanitizedContent = sanitizeContent(content);
            tinymce.get("article-content").setContent(sanitizedContent);
            console.log("✅ TinyMCE content set successfully");

            // Verify content was actually set
            setTimeout(() => {
              try {
                const currentContent = tinymce.get("article-content").getContent();
                console.log("🔍 Verification - Content in editor length:", currentContent.length);
                if (currentContent.length === 0 && content.length > 0) {
                  console.warn("⚠️ Content was cleared after setting! Something else is clearing it.");
                }
              } catch (verifyError) {
                console.error("Error during content verification:", verifyError);
              }
            }, 100);
            return;
          } catch (error) {
            console.error("❌ TinyMCE setContent failed:", error);
            console.log("🔄 Attempting fallback to textarea...");

            // Fallback to textarea
            const textarea = document.getElementById("article-content");
            if (textarea) {
              textarea.value = content;
              console.log("✅ Content set in textarea as fallback");
            }
            return;
          }
        }

        if (retryCount < maxRetries) {
          console.log(`⏳ TinyMCE not ready, retrying... (${retryCount + 1}/${maxRetries})`);
          setTimeout(() => attemptSetContent(retryCount + 1), 200);
        } else {
          console.warn("❌ Failed to set TinyMCE content after retries, falling back to textarea");
          const textarea = document.getElementById("article-content");
          if (textarea) {
            textarea.value = content;
          }
        }
      };

      attemptSetContent();
    },

    // Setup excerpt word count validation
    setupExcerptValidation: function () {
      const excerptTextarea = document.getElementById("article-excerpt");
      const wordCountElement = document.getElementById("excerpt-word-count");

      if (excerptTextarea && wordCountElement) {
        // Function to count words
        const countWords = (text) => {
          return text
            .trim()
            .split(/\s+/)
            .filter((word) => word.length > 0).length;
        };

        // Function to update word count display
        const updateWordCount = () => {
          const text = excerptTextarea.value;
          const wordCount = text.trim() ? countWords(text) : 0;
          const maxWords = 25;

          wordCountElement.textContent = `${wordCount}/${maxWords} words`;

          // Change color based on word count
          if (wordCount > maxWords) {
            wordCountElement.style.color = "#ef4444"; // red
            excerptTextarea.style.borderColor = "#ef4444";
          } else if (wordCount > maxWords * 0.8) {
            wordCountElement.style.color = "#f59e0b"; // amber
            excerptTextarea.style.borderColor = "#f59e0b";
          } else {
            wordCountElement.style.color = "#6b7280"; // gray
            excerptTextarea.style.borderColor = "";
          }
        };

        // Add event listeners
        excerptTextarea.addEventListener("input", updateWordCount);
        excerptTextarea.addEventListener("paste", () => {
          setTimeout(updateWordCount, 0); // Delay to allow paste to complete
        });

        // Initial count
        updateWordCount();

        // Validation on form submit
        const articleForm = document.getElementById("article-form");
        if (articleForm) {
          articleForm.addEventListener("submit", (e) => {
            const wordCount = excerptTextarea.value.trim()
              ? countWords(excerptTextarea.value)
              : 0;
            if (wordCount > 25) {
              e.preventDefault();
              alert(
                "Excerpt must be 25 words or less. Current count: " +
                  wordCount +
                  " words."
              );
              excerptTextarea.focus();
              return false;
            }
          });
        }
      }
    },

    // Create new Hindi article from current content
    createHindiArticle: async function () {
      const articleId = this.getCurrentArticleId();
      if (!articleId) {
        CMS.showNotification("Please save the article first", "warning");
        return;
      }

      try {
        CMS.showNotification("🇮🇳 Creating new Hindi article...", "info");

        const response = await CMS.apiCall(
          "/articles/translate-and-create",
          "POST",
          {
            articleId: articleId,
            targetLanguage: "HINDI",
          }
        );

        if (response.success) {
          CMS.showNotification(
            "✅ New Hindi article created successfully! Opening in editor...",
            "success"
          );

          // Open the translated article as a separate article (redirect to edit it)
          setTimeout(() => {
            window.location.href = `/cms/?section=article-editor&id=${response.data.translatedArticle.id}`;
          }, 1500);
        }
      } catch (error) {
        console.error("Failed to create Hindi article:", error);
        CMS.showNotification("Failed to create Hindi article", "error");
      }
    },

    // Create new English article from current content
    createEnglishArticle: async function () {
      const articleId = this.getCurrentArticleId();
      if (!articleId) {
        CMS.showNotification("Please save the article first", "warning");
        return;
      }

      try {
        CMS.showNotification("🇺🇸 Creating new English article...", "info");

        const response = await CMS.apiCall(
          "/articles/translate-and-create",
          "POST",
          {
            articleId: articleId,
            targetLanguage: "ENGLISH",
          }
        );

        if (response.success) {
          CMS.showNotification(
            "✅ New English article created successfully! Opening in editor...",
            "success"
          );

          // Open the translated article as a separate article (redirect to edit it)
          setTimeout(() => {
            window.location.href = `/cms/?section=article-editor&id=${response.data.translatedArticle.id}`;
          }, 1500);
        }
      } catch (error) {
        console.error("Failed to create English article:", error);
        CMS.showNotification("Failed to create English article", "error");
      }
    },

    // Get current article ID from URL or form
    getCurrentArticleId: function () {
      // First check if we have a current editing article in memory
      if (currentEditingArticle) {
        return currentEditingArticle;
      }

      // Fallback to URL parameters for direct navigation
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get("id");
    },
  };

  // Make module available globally
  window.articlesModule = articlesModule;
} // End of conditional declaration
