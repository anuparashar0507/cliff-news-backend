// Enhanced Highlights module for The Cliff News CMS
// Handles comprehensive highlights management with analytics and advanced features

// Prevent redeclaration
if (typeof highlightsModule === "undefined") {
  var highlightsModule = {
    // Initialize highlights module
    init: function () {
      console.log("🌟 Initializing highlights module...");
      this.loadHighlights();
      this.setupEventListeners();
    },

    // Setup event listeners
    setupEventListeners: function () {
      // Highlight form submission
      const highlightForm = document.getElementById("highlight-form");
      if (highlightForm) {
        highlightForm.addEventListener("submit", (e) => {
          e.preventDefault();
          this.handleCreateHighlight();
        });
      }

      // Image upload drag and drop
      const uploadArea = document.getElementById("highlight-upload-area");
      if (uploadArea) {
        uploadArea.addEventListener("dragover", (e) => {
          e.preventDefault();
          uploadArea.classList.add("dragover");
        });

        uploadArea.addEventListener("dragleave", (e) => {
          e.preventDefault();
          uploadArea.classList.remove("dragover");
        });

        uploadArea.addEventListener("drop", (e) => {
          e.preventDefault();
          uploadArea.classList.remove("dragover");
          const files = e.dataTransfer.files;
          if (files.length > 0) {
            this.handleImageSelect(files[0]);
          }
        });

        // Click to select file
        uploadArea.addEventListener("click", () => {
          const imageInput = document.getElementById("highlight-image");
          if (imageInput) {
            imageInput.click();
          }
        });
      }

      // Image input change handler
      const imageInput = document.getElementById("highlight-image");
      if (imageInput) {
        imageInput.addEventListener("change", (e) => {
          if (e.target.files.length > 0) {
            this.handleImageSelect(e.target.files[0]);
          }
        });
      }
    },

    // Load highlights list
    async loadHighlights() {
      try {
        showLoading("Loading highlights...");

        const data = await apiCall(
          "/highlights?limit=50&sort=createdAt&order=desc"
        );
        this.displayHighlights(data.highlights || []);

        console.log("✅ Highlights loaded successfully");
      } catch (error) {
        console.error("❌ Failed to load highlights:", error);
        showNotification("Failed to load highlights", "error");
      } finally {
        hideLoading();
      }
    },

    // Enhanced display with analytics
    displayHighlights: function (highlights) {
      const highlightsList = document.getElementById("highlights-list");
      if (!highlightsList) return;

      if (highlights.length === 0) {
        highlightsList.innerHTML = `
          <div class="text-center py-12">
            <i class="fas fa-images text-6xl text-gray-300 mb-4"></i>
            <h3 class="text-xl font-semibold text-gray-600 mb-2">No highlights found</h3>
            <p class="text-gray-500 mb-6">Start by uploading your first highlight</p>
          <button onclick="highlightsModule.showHighlightForm()" class="btn btn-primary">
              <i class="fas fa-plus mr-2"></i>Add Your First Highlight
          </button>
        </div>
      `;
        return;
      }

      highlightsList.innerHTML = highlights
        .map(
          (highlight) => `
        <div class="card hover:shadow-lg transition-shadow">
          <div class="relative group">
            <img src="${
              highlight.thumbnailUrl || highlight.imageUrl
            }" alt="Highlight" 
                 class="w-full h-48 object-cover rounded-lg">
            
            <!-- Priority Badge -->
            ${
              highlight.priority === "BREAKING"
                ? `
              <div class="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                🔥 BREAKING
              </div>
            `
                : highlight.priority === "HIGH"
                ? `
              <div class="absolute top-2 left-2 bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold">
                ⚡ HIGH
              </div>
            `
                : ""
            }
            
            <!-- Action Buttons Overlay -->
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
              <div class="flex items-center gap-2">
                <button onclick="highlightsModule.editHighlight('${
                  highlight.id
                }')" class="btn btn-sm btn-secondary">
                  <i class="fas fa-edit"></i>
                </button>
                <button onclick="highlightsModule.copyImageUrl('${
                  highlight.imageUrl
                }')" class="btn btn-sm btn-primary">
                  <i class="fas fa-copy"></i>
                </button>
                <button onclick="highlightsModule.deleteHighlight('${
                  highlight.id
                }')" class="btn btn-sm btn-danger">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
            
            <!-- Stats at bottom -->
            <div class="absolute bottom-2 left-2 right-2 bg-black bg-opacity-70 text-white text-xs rounded px-2 py-1">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-3">
                  <span><i class="fas fa-eye"></i> ${
                    highlight.viewCount || 0
                  }</span>
                  <span><i class="fas fa-download"></i> ${
                    highlight.downloadCount || 0
                  }</span>
                  <span><i class="fas fa-share"></i> ${
                    highlight.shareCount || 0
                  }</span>
                </div>
                ${
                  highlight.category
                    ? `<span class="badge badge-sm">${highlight.category}</span>`
                    : ""
                }
              </div>
            </div>
          </div>
        </div>
      `
        )
        .join("");
    },

    // Show highlight form
    showHighlightForm: function (highlightId = null) {
      const modal = document.getElementById("highlight-modal");
      const form = document.getElementById("highlight-form");

      if (!modal || !form) {
        console.error("Modal or form element not found!");
        return;
      }

      if (highlightId) {
        this.loadHighlightForEdit(highlightId);
      } else {
        form.reset();
        // Clear image preview
        const imagePreview = document.getElementById("image-preview");
        if (imagePreview) {
          imagePreview.innerHTML = "";
        }
      }

      // Show the modal
      modal.classList.remove("hidden");
      modal.style.display = "block";
    },

    // Load highlight for editing
    loadHighlightForEdit: async function (highlightId) {
      try {
        showLoading("Loading highlight...");

        const data = await apiCall(`/highlights/${highlightId}`);
        const highlight = data.highlight;

        // Populate form fields
        document.getElementById("highlight-title").value =
          highlight.title || "";
        document.getElementById("highlight-category").value =
          highlight.category || "";

        // Show current image
        const imagePreview = document.getElementById("image-preview");
        if (imagePreview) {
          imagePreview.innerHTML = `
          <img src="${highlight.imageUrl}" alt="Current image" class="w-32 h-32 object-cover rounded">
        `;
        }

        console.log("✅ Highlight loaded for editing");
      } catch (error) {
        console.error("❌ Failed to load highlight:", error);
        showNotification("Failed to load highlight for editing", "error");
      } finally {
        hideLoading();
      }
    },

    // Handle image selection
    handleImageSelect: function (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        showNotification("Please select an image file", "error");
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        showNotification("File size must be less than 10MB", "error");
        return;
      }

      // Update image input
      const imageInput = document.getElementById("highlight-image");
      if (imageInput) {
        // Create a new FileList-like object
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        imageInput.files = dataTransfer.files;
      }

      // Show image preview
      const reader = new FileReader();
      reader.onload = function (e) {
        const imagePreview = document.getElementById("image-preview");
        if (imagePreview) {
          imagePreview.innerHTML = `
          <img src="${e.target.result}" alt="Preview" class="w-32 h-32 object-cover rounded">
        `;
        }
      };
      reader.readAsDataURL(file);
    },

    // Handle create highlight
    handleCreateHighlight: async function () {
      try {
        showLoading("Creating highlight...");

        const formData = new FormData();
        const imageInput = document.getElementById("highlight-image");

        if (!imageInput.files[0]) {
          showNotification("Please select an image file", "error");
          return;
        }

        formData.append("image", imageInput.files[0]);

        // Get title or generate default from filename
        const titleInput = document.getElementById("highlight-title").value;
        const title =
          titleInput.trim() || `Highlight - ${new Date().toLocaleDateString()}`;

        formData.append("title", title);
        formData.append(
          "category",
          document.getElementById("highlight-category").value
        );

        const response = await fetch("/api/highlights", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData,
        });

        const data = await response.json();

        if (response.ok && data.success) {
          showNotification("Highlight created successfully!", "success");
          this.hideHighlightForm();
          this.loadHighlights();
        } else {
          showNotification(data.error || "Failed to create highlight", "error");
        }
      } catch (error) {
        console.error("❌ Failed to create highlight:", error);
        showNotification("Failed to create highlight", "error");
      } finally {
        hideLoading();
      }
    },

    // Hide highlight form
    hideHighlightForm: function () {
      const modal = document.getElementById("highlight-modal");
      if (modal) {
        modal.classList.add("hidden");
        modal.style.display = "none";
      }
    },

    // Copy image URL
    copyImageUrl: function (imageUrl) {
      this.copyToClipboard(imageUrl);
    },

    // Copy to clipboard utility
    copyToClipboard: function (text) {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(text)
          .then(() => {
            showNotification("URL copied to clipboard!", "success");
          })
          .catch(() => {
            this.fallbackCopyTextToClipboard(text);
          });
      } else {
        this.fallbackCopyTextToClipboard(text);
      }
    },

    // Fallback copy method
    fallbackCopyTextToClipboard: function (text) {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        const successful = document.execCommand("copy");
        if (successful) {
          showNotification("URL copied to clipboard!", "success");
        } else {
          showNotification("Failed to copy URL", "error");
        }
      } catch (err) {
        showNotification("Failed to copy URL", "error");
      }

      document.body.removeChild(textArea);
    },

    // Preview highlight
    previewHighlight: function (highlightId) {
      // Open highlight preview in new tab
      window.open(`/api/highlights/${highlightId}`, "_blank");
    },

    // Edit highlight
    editHighlight: function (highlightId) {
      this.showHighlightForm(highlightId);
    },

    // Delete highlight
    deleteHighlight: async function (highlightId) {
      if (
        !confirm(
          "Are you sure you want to delete this highlight? This action cannot be undone."
        )
      ) {
        return;
      }

      try {
        showLoading("Deleting highlight...");

        await apiCall(`/highlights/${highlightId}`, "DELETE");

        showNotification("Highlight deleted successfully", "success");
        this.loadHighlights();
      } catch (error) {
        console.error("❌ Failed to delete highlight:", error);
        showNotification("Failed to delete highlight", "error");
      } finally {
        hideLoading();
      }
    },

    // Get highlight statistics
    getHighlightStats: async function () {
      try {
        const data = await apiCall("/highlights?limit=1");
        return {
          total: data.pagination?.total || 0,
        };
      } catch (error) {
        console.error("Failed to get highlight stats:", error);
        return { total: 0 };
      }
    },

    // Get highlights by category
    getHighlightsByCategory: async function (category) {
      try {
        const data = await apiCall(`/highlights?category=${category}`);
        return data.highlights || [];
      } catch (error) {
        console.error("Failed to get highlights by category:", error);
        return [];
      }
    },

    // Get recent highlights
    getRecentHighlights: async function (limit = 10) {
      try {
        const data = await apiCall(
          `/highlights?limit=${limit}&sort=createdAt&order=desc`
        );
        return data.highlights || [];
      } catch (error) {
        console.error("Failed to get recent highlights:", error);
        return [];
      }
    },

    // Enhanced upload with drag & drop
    setupAdvancedUpload: function () {
      const uploadArea = document.getElementById("highlight-upload-area");
      if (!uploadArea) return;

      // Enhanced drag and drop
      uploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadArea.classList.add("dragover");
        uploadArea.innerHTML = `
          <div class="text-center">
            <i class="fas fa-cloud-upload-alt text-4xl text-primary mb-4"></i>
            <p class="text-lg font-semibold">Drop your image here</p>
            <p class="text-sm text-gray-500">Supports JPG, PNG, WebP • Max 10MB</p>
          </div>
        `;
      });

      uploadArea.addEventListener("dragleave", (e) => {
        e.preventDefault();
        uploadArea.classList.remove("dragover");
        uploadArea.innerHTML = `
          <div class="text-center">
            <i class="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
            <p class="text-lg font-semibold">Drop your image here or click to browse</p>
            <p class="text-sm text-gray-500">Supports JPG, PNG, WebP • Max 10MB</p>
          </div>
        `;
      });

      uploadArea.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadArea.classList.remove("dragover");
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          this.handleImageSelect(files[0]);
        }
      });
    },

    // Enhanced image selection with preview
    handleImageSelect: function (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        showNotification("Please select an image file", "error");
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        showNotification("File size must be less than 10MB", "error");
        return;
      }

      // Update image input
      const imageInput = document.getElementById("highlight-image");
      if (imageInput) {
        // Create a new FileList-like object
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        imageInput.files = dataTransfer.files;
      }

      // Show enhanced image preview with metadata
      const reader = new FileReader();
      reader.onload = function (e) {
        const imagePreview = document.getElementById("image-preview");
        if (imagePreview) {
          const img = new Image();
          img.onload = function () {
            const aspectRatio = (img.width / img.height).toFixed(2);
            const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

            imagePreview.innerHTML = `
              <div class="relative">
                <img src="${e.target.result}" alt="Preview" class="w-full h-64 object-cover rounded-lg">
                <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-75 text-white p-3 rounded-b-lg">
                  <div class="text-sm">
                    <div class="flex justify-between">
                      <span>${img.width} × ${img.height}</span>
                      <span>${fileSizeMB} MB</span>
                    </div>
                    <div class="text-xs text-gray-300">Aspect Ratio: ${aspectRatio}</div>
                  </div>
                </div>
              </div>
            `;
          };
          img.src = e.target.result;
        }
      };
      reader.readAsDataURL(file);
    },

    // View analytics for a highlight
    viewAnalytics: async function (highlightId) {
      try {
        showLoading("Loading analytics...");

        const data = await apiCall(`/highlights/${highlightId}/analytics`);

        // Show analytics modal
        this.showAnalyticsModal(data.analytics);
      } catch (error) {
        console.error("❌ Failed to load analytics:", error);
        showNotification("Failed to load analytics", "error");
      } finally {
        hideLoading();
      }
    },

    // Show analytics modal
    showAnalyticsModal: function (analytics) {
      const modal = document.getElementById("analytics-modal");
      if (!modal) return;

      modal.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-2xl font-bold">Highlight Analytics</h2>
              <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div class="bg-blue-50 p-4 rounded-lg">
                <div class="flex items-center">
                  <i class="fas fa-eye text-blue-500 text-2xl mr-3"></i>
                  <div>
                    <p class="text-sm text-gray-600">Total Views</p>
                    <p class="text-2xl font-bold text-blue-600">${analytics.totalViews}</p>
                  </div>
                </div>
              </div>
              
              <div class="bg-green-50 p-4 rounded-lg">
                <div class="flex items-center">
                  <i class="fas fa-download text-green-500 text-2xl mr-3"></i>
                  <div>
                    <p class="text-sm text-gray-600">Downloads</p>
                    <p class="text-2xl font-bold text-green-600">${analytics.totalDownloads}</p>
                  </div>
                </div>
              </div>
              
              <div class="bg-purple-50 p-4 rounded-lg">
                <div class="flex items-center">
                  <i class="fas fa-share text-purple-500 text-2xl mr-3"></i>
                  <div>
                    <p class="text-sm text-gray-600">Shares</p>
                    <p class="text-2xl font-bold text-purple-600">${analytics.totalShares}</p>
                  </div>
                </div>
              </div>
              
              <div class="bg-red-50 p-4 rounded-lg">
                <div class="flex items-center">
                  <i class="fas fa-heart text-red-500 text-2xl mr-3"></i>
                  <div>
                    <p class="text-sm text-gray-600">Likes</p>
                    <p class="text-2xl font-bold text-red-600">${analytics.totalLikes}</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 class="text-lg font-semibold mb-3">Platform Breakdown</h3>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span>Web</span>
                    <span class="font-semibold">${analytics.platformBreakdown.web}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Mobile</span>
                    <span class="font-semibold">${analytics.platformBreakdown.mobile}</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 class="text-lg font-semibold mb-3">Share Platforms</h3>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span>WhatsApp</span>
                    <span class="font-semibold">${analytics.shareBreakdown.whatsapp}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Facebook</span>
                    <span class="font-semibold">${analytics.shareBreakdown.facebook}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Twitter</span>
                    <span class="font-semibold">${analytics.shareBreakdown.twitter}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Email</span>
                    <span class="font-semibold">${analytics.shareBreakdown.email}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    },

    // Download highlight
    downloadHighlight: function (highlightId) {
      window.open(`/api/highlights/${highlightId}/download`, "_blank");
    },

    // Show analytics overview
    showAnalyticsOverview: async function () {
      try {
        showLoading("Loading analytics overview...");

        const data = await apiCall("/highlights/analytics/overview");

        // Show analytics overview modal
        this.showAnalyticsOverviewModal(data.analytics);
      } catch (error) {
        console.error("❌ Failed to load analytics overview:", error);
        showNotification("Failed to load analytics overview", "error");
      } finally {
        hideLoading();
      }
    },

    // Show analytics overview modal
    showAnalyticsOverviewModal: function (analytics) {
      const modal = document.getElementById("analytics-modal");
      if (!modal) return;

      modal.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div class="bg-white rounded-lg p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-2xl font-bold">Highlights Analytics Overview</h2>
              <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-times text-xl"></i>
              </button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div class="bg-blue-50 p-4 rounded-lg">
                <div class="flex items-center">
                  <i class="fas fa-images text-blue-500 text-2xl mr-3"></i>
                  <div>
                    <p class="text-sm text-gray-600">Total Highlights</p>
                    <p class="text-2xl font-bold text-blue-600">${
                      analytics.totalHighlights
                    }</p>
                  </div>
                </div>
              </div>
              
              <div class="bg-green-50 p-4 rounded-lg">
                <div class="flex items-center">
                  <i class="fas fa-eye text-green-500 text-2xl mr-3"></i>
                  <div>
                    <p class="text-sm text-gray-600">Total Views</p>
                    <p class="text-2xl font-bold text-green-600">${
                      analytics.totalViews
                    }</p>
                  </div>
                </div>
              </div>
              
              <div class="bg-purple-50 p-4 rounded-lg">
                <div class="flex items-center">
                  <i class="fas fa-download text-purple-500 text-2xl mr-3"></i>
                  <div>
                    <p class="text-sm text-gray-600">Downloads</p>
                    <p class="text-2xl font-bold text-purple-600">${
                      analytics.totalDownloads
                    }</p>
                  </div>
                </div>
              </div>
              
              <div class="bg-orange-50 p-4 rounded-lg">
                <div class="flex items-center">
                  <i class="fas fa-share text-orange-500 text-2xl mr-3"></i>
                  <div>
                    <p class="text-sm text-gray-600">Shares</p>
                    <p class="text-2xl font-bold text-orange-600">${
                      analytics.totalShares
                    }</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 class="text-lg font-semibold mb-3">Category Performance</h3>
                <div class="space-y-3">
                  ${analytics.categoryStats
                    .map(
                      (cat) => `
                    <div class="flex justify-between items-center">
                      <span>${cat.category}</span>
                      <div class="flex items-center gap-2">
                        <span class="font-semibold">${cat.count} highlights</span>
                        <span class="text-sm text-gray-500">${cat.views} views</span>
                      </div>
                    </div>
                  `
                    )
                    .join("")}
                </div>
              </div>

              <div>
                <h3 class="text-lg font-semibold mb-3">Top Performing Highlights</h3>
                <div class="space-y-3">
                  ${analytics.topHighlights
                    .map(
                      (highlight, index) => `
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div class="flex-1">
                        <p class="font-medium text-sm">${
                          highlight.title || "Untitled Highlight"
                        }</p>
                        <p class="text-xs text-gray-500">${
                          highlight.category
                        }</p>
                      </div>
                      <div class="text-right">
                        <div class="flex items-center gap-4 text-sm">
                          <span><i class="fas fa-eye"></i> ${
                            highlight.viewCount
                          }</span>
                          <span><i class="fas fa-download"></i> ${
                            highlight.downloadCount
                          }</span>
                          <span><i class="fas fa-share"></i> ${
                            highlight.shareCount
                          }</span>
                        </div>
                      </div>
                    </div>
                  `
                    )
                    .join("")}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    },
  };

  // Make module available globally
  window.highlightsModule = highlightsModule;
} // End of conditional declaration
