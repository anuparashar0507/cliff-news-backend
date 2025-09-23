// NIT module for The Cliff News CMS
// Handles NIT (News in Transit) management

// Prevent redeclaration
if (typeof nitModule === "undefined") {
  var nitModule = {
    // Initialize NIT module
    init: function () {
      console.log("📋 Initializing NIT module...");
      this.loadNITItems();
      this.setupEventListeners();
      this.setupFilters();
    },

    // Setup event listeners
    setupEventListeners: function () {
      // NIT form submission
      const nitForm = document.getElementById("nit-form");
      if (nitForm) {
        nitForm.addEventListener("submit", (e) => {
          e.preventDefault();
          this.handleCreateNIT();
        });
      }

      // Image upload drag and drop
      const uploadArea = document.getElementById("nit-upload-area");
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
          const imageInput = document.getElementById("nit-image");
          if (imageInput) {
            imageInput.click();
          }
        });
      }

      // Image input change
      const imageInput = document.getElementById("nit-image");
      if (imageInput) {
        imageInput.addEventListener("change", (e) => {
          if (e.target.files.length > 0) {
            this.handleImageSelect(e.target.files[0]);
          }
        });
      }
    },

    // Load NIT items list
    async loadNITItems() {
      try {
        showLoading("Loading NIT items...");

        const data = await apiCall("/nit?limit=50&sort=createdAt&order=desc");
        this.currentNITItems = data.nits || [];
        this.displayNITItems(this.currentNITItems);

        // Update count
        const countElement = document.getElementById("nit-count");
        if (countElement) {
          countElement.textContent = this.currentNITItems.length;
        }

        console.log("✅ NIT items loaded successfully");
      } catch (error) {
        console.error("❌ Failed to load NIT items:", error);
        showNotification("Failed to load NIT items", "error");
      } finally {
        hideLoading();
      }
    },

    // Display NIT items in the list
    displayNITItems: function (nitItems) {
      const nitList = document.getElementById("nit-list");
      if (!nitList) {
        console.error("NIT list element not found!");
        return;
      }

      if (nitItems.length === 0) {
        nitList.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-500 mb-4">No NIT items found</p>
          <button onclick="nitModule.showNITForm()" class="btn btn-primary">
            Add Your First NIT Item
          </button>
        </div>
      `;
        return;
      }

      nitList.innerHTML = nitItems
        .map(
          (nit) => `
      <div class="card hover:shadow-lg transition-shadow">
        <div class="relative group">
          <img src="${nit.imageUrl}" alt="NIT Item" 
               class="w-full h-48 object-cover rounded-lg">
          
          <!-- Action Buttons Overlay -->
          <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-300 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div class="flex items-center gap-2">
              <button onclick="nitModule.editNIT('${
                nit.id
              }')" class="btn btn-sm btn-secondary">
                <i class="fas fa-edit"></i>
              </button>
              <button onclick="nitModule.copyImageUrl('${
                nit.imageUrl
              }')" class="btn btn-sm btn-primary">
                <i class="fas fa-copy"></i>
              </button>
              <button onclick="nitModule.deleteNIT('${
                nit.id
              }')" class="btn btn-sm btn-danger">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          
          <!-- Date at bottom -->
          <div class="absolute bottom-2 left-2 right-2 bg-black bg-opacity-70 text-white text-xs rounded px-2 py-1">
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <i class="fas fa-calendar"></i>
                <span>${formatDate(nit.createdAt)}</span>
              </div>
              <div class="text-xs opacity-75">
                ${new Date(nit.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    `
        )
        .join("");
    },

    // Show NIT form
    showNITForm: function (nitId = null) {
      const modal = document.getElementById("nit-modal");
      const form = document.getElementById("nit-form");
      if (!modal || !form) return;

      if (nitId) {
        this.loadNITForEdit(nitId);
      } else {
        form.reset();
        // Clear image preview
        const imagePreview = document.getElementById("nit-image-preview");
        if (imagePreview) {
          imagePreview.innerHTML = "";
        }
      }

      // Show the modal
      modal.classList.remove("hidden");
      modal.style.display = "block";
      console.log("NIT form shown");
    },

    // Load NIT for editing
    loadNITForEdit: async function (nitId) {
      try {
        showLoading("Loading NIT item...");

        const data = await apiCall(`/nit/${nitId}`);
        const nit = data.nit;

        // Populate form fields
        document.getElementById("nit-title").value = nit.title || "";
        document.getElementById("nit-category").value = nit.category || "";

        // Show current image
        const imagePreview = document.getElementById("nit-image-preview");
        if (imagePreview) {
          imagePreview.innerHTML = `
          <img src="${nit.imageUrl}" alt="Current image" class="w-32 h-32 object-cover rounded">
        `;
        }

        console.log("✅ NIT item loaded for editing");
      } catch (error) {
        console.error("❌ Failed to load NIT item:", error);
        showNotification("Failed to load NIT item for editing", "error");
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
      const imageInput = document.getElementById("nit-image");
      if (imageInput) {
        // Create a new FileList-like object
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        imageInput.files = dataTransfer.files;
      }

      // Show image preview
      const reader = new FileReader();
      reader.onload = function (e) {
        const imagePreview = document.getElementById("nit-image-preview");
        if (imagePreview) {
          imagePreview.innerHTML = `
          <img src="${e.target.result}" alt="Preview" class="w-32 h-32 object-cover rounded">
        `;
        }
      };
      reader.readAsDataURL(file);
    },

    // Handle create NIT
    handleCreateNIT: async function () {
      try {
        showLoading("Creating NIT item...");

        const formData = new FormData();
        const imageInput = document.getElementById("nit-image");

        if (!imageInput.files[0]) {
          showNotification("Please select an image file", "error");
          return;
        }

        formData.append("image", imageInput.files[0]);

        // Get title or generate default from filename
        const titleInput = document.getElementById("nit-title").value;
        const title =
          titleInput.trim() || `NIT - ${new Date().toLocaleDateString()}`;

        formData.append("title", title);

        const response = await fetch("/api/nit", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData,
        });

        const data = await response.json();

        if (response.ok && data.success) {
          showNotification("NIT item created successfully!", "success");
          this.hideNITForm();
          this.loadNITItems();
        } else {
          showNotification(data.error || "Failed to create NIT item", "error");
        }
      } catch (error) {
        console.error("❌ Failed to create NIT item:", error);
        showNotification("Failed to create NIT item", "error");
      } finally {
        hideLoading();
      }
    },

    // Hide NIT form
    hideNITForm: function () {
      const modal = document.getElementById("nit-modal");
      if (modal) {
        modal.classList.add("hidden");
        modal.style.display = "none";
      }
      console.log("NIT form hidden");
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

    // Preview NIT
    previewNIT: function (nitId) {
      // Open NIT preview in new tab
      window.open(`/api/nit/${nitId}`, "_blank");
    },

    // Edit NIT
    editNIT: function (nitId) {
      this.showNITForm(nitId);
    },

    // Delete NIT
    deleteNIT: async function (nitId) {
      if (
        !confirm(
          "Are you sure you want to delete this NIT item? This action cannot be undone."
        )
      ) {
        return;
      }

      try {
        showLoading("Deleting NIT item...");

        await apiCall(`/nit/${nitId}`, "DELETE");

        showNotification("NIT item deleted successfully", "success");
        this.loadNITItems();
      } catch (error) {
        console.error("❌ Failed to delete NIT item:", error);
        showNotification("Failed to delete NIT item", "error");
      } finally {
        hideLoading();
      }
    },

    // Get NIT statistics
    getNITStats: async function () {
      try {
        const data = await apiCall("/nit?limit=1");
        return {
          total: data.pagination?.total || 0,
        };
      } catch (error) {
        console.error("Failed to get NIT stats:", error);
        return { total: 0 };
      }
    },

    // Get NIT items by category
    getNITByCategory: async function (category) {
      try {
        const data = await apiCall(`/nit?category=${category}`);
        return data.nit || [];
      } catch (error) {
        console.error("Failed to get NIT by category:", error);
        return [];
      }
    },

    // Get recent NIT items
    getRecentNIT: async function (limit = 10) {
      try {
        const data = await apiCall(
          `/nit?limit=${limit}&sort=createdAt&order=desc`
        );
        return data.nit || [];
      } catch (error) {
        console.error("Failed to get recent NIT items:", error);
        return [];
      }
    },

    // Setup filtering functionality
    setupFilters: function () {
      // Auto-apply filters on input change
      const searchInput = document.getElementById("nit-search");
      const dateFromInput = document.getElementById("nit-date-from");
      const dateToInput = document.getElementById("nit-date-to");

      if (searchInput) {
        searchInput.addEventListener("input", () => {
          this.applyFilters();
        });
      }

      if (dateFromInput) {
        dateFromInput.addEventListener("change", () => {
          this.applyFilters();
        });
      }

      if (dateToInput) {
        dateToInput.addEventListener("change", () => {
          this.applyFilters();
        });
      }
    },

    // Apply filters to NIT items
    applyFilters: function () {
      const searchTerm =
        document.getElementById("nit-search")?.value.toLowerCase() || "";
      const dateFrom = document.getElementById("nit-date-from")?.value || "";
      const dateTo = document.getElementById("nit-date-to")?.value || "";

      // Get all NIT items from the current display
      const nitItems = this.currentNITItems || [];

      let filteredItems = nitItems.filter((nit) => {
        // Search filter
        const matchesSearch =
          !searchTerm ||
          nit.title.toLowerCase().includes(searchTerm) ||
          nit.id.toLowerCase().includes(searchTerm);

        // Date filters
        const nitDate = new Date(nit.createdAt).toISOString().split("T")[0];
        const matchesDateFrom = !dateFrom || nitDate >= dateFrom;
        const matchesDateTo = !dateTo || nitDate <= dateTo;

        return matchesSearch && matchesDateFrom && matchesDateTo;
      });

      // Update count
      const countElement = document.getElementById("nit-count");
      if (countElement) {
        countElement.textContent = filteredItems.length;
      }

      // Display filtered results
      this.displayNITItems(filteredItems);
    },

    // Clear all filters
    clearFilters: function () {
      document.getElementById("nit-search").value = "";
      document.getElementById("nit-date-from").value = "";
      document.getElementById("nit-date-to").value = "";

      // Reload all NIT items
      this.loadNITItems();
    },
  };

  // Make module available globally
  window.nitModule = nitModule;
} // End of conditional declaration
