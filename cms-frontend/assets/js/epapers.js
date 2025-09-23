// E-Papers module for The Cliff News CMS
// Handles e-paper management and uploads

// Prevent redeclaration
if (typeof epapersModule === "undefined") {
  var epapersModule = {
    // Initialize e-papers module
    init: function () {
      console.log("📄 Initializing e-papers module...");
      this.setDefaultDate();
      this.updateAutoTitle();
      this.loadEPapers();
      this.setupEventListeners();
    },

    // Set default date to today
    setDefaultDate: function () {
      const today = new Date().toISOString().split("T")[0];
      const dateInput = document.getElementById("epaper-date");
      if (dateInput) {
        dateInput.value = today;
      }
    },

    // Update auto-generated title
    updateAutoTitle: function () {
      const dateInput = document.getElementById("epaper-date");
      const languageSelect = document.getElementById("epaper-language");
      const titleDate = document.getElementById("title-date");
      const titleLanguage = document.getElementById("title-language");

      if (dateInput && languageSelect && titleDate && titleLanguage) {
        const updateTitle = () => {
          const date = dateInput.value;
          const language = languageSelect.value;

          if (date) {
            const formattedDate = new Date(date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });
            titleDate.textContent = formattedDate;
          }

          titleLanguage.textContent =
            language === "HINDI" ? "Hindi" : "English";
        };

        dateInput.addEventListener("change", updateTitle);
        languageSelect.addEventListener("change", updateTitle);
        updateTitle(); // Initial update
      }
    },

    // Setup event listeners
    setupEventListeners: function () {
      // E-paper form submission
      const epaperForm = document.getElementById("epaper-form");
      if (epaperForm) {
        epaperForm.addEventListener("submit", (e) => {
          e.preventDefault();
          this.handleUploadEPaper();
        });
      }

      // File upload drag and drop
      const uploadArea = document.getElementById("upload-area");
      if (uploadArea) {
        // Click to browse
        uploadArea.addEventListener("click", () => {
          document.getElementById("epaper-file").click();
        });

        // Drag and drop events
        uploadArea.addEventListener("dragover", (e) => {
          e.preventDefault();
          uploadArea.classList.add("border-blue-400", "bg-blue-50");
        });

        uploadArea.addEventListener("dragleave", (e) => {
          e.preventDefault();
          uploadArea.classList.remove("border-blue-400", "bg-blue-50");
        });

        uploadArea.addEventListener("drop", (e) => {
          e.preventDefault();
          uploadArea.classList.remove("border-blue-400", "bg-blue-50");
          const files = e.dataTransfer.files;
          if (files.length > 0) {
            this.handleFileSelect(files[0]);
          }
        });
      }

      // File input change
      const fileInput = document.getElementById("epaper-file");
      if (fileInput) {
        fileInput.addEventListener("change", (e) => {
          if (e.target.files.length > 0) {
            this.handleFileSelect(e.target.files[0]);
          }
        });
      }
    },

    // Handle file selection
    handleFileSelect: function (file) {
      // Validate file type
      if (file.type !== "application/pdf") {
        showNotification("Please select a PDF file", "error");
        return;
      }

      // Validate file size (50MB limit)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > maxSize) {
        showNotification("File size must be less than 50MB", "error");
        return;
      }

      // Update file input
      const fileInput = document.getElementById("epaper-file");
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;

      // Show file preview
      this.showFilePreview(file);
    },

    // Show file preview
    showFilePreview: function (file) {
      const uploadContent = document.getElementById("upload-content");
      const filePreview = document.getElementById("file-preview");
      const fileName = document.getElementById("file-name");
      const fileSize = document.getElementById("file-size");

      if (uploadContent && filePreview && fileName && fileSize) {
        uploadContent.classList.add("hidden");
        filePreview.classList.remove("hidden");

        fileName.textContent = file.name;
        fileSize.textContent = this.formatFileSize(file.size);
      }
    },

    // Clear selected file
    clearFile: function () {
      const fileInput = document.getElementById("epaper-file");
      const uploadContent = document.getElementById("upload-content");
      const filePreview = document.getElementById("file-preview");

      if (fileInput) {
        fileInput.value = "";
      }

      if (uploadContent && filePreview) {
        uploadContent.classList.remove("hidden");
        filePreview.classList.add("hidden");
      }
    },

    // Format file size
    formatFileSize: function (bytes) {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    },

    // Load e-papers list
    async loadEPapers(page = 1, filters = {}) {
      try {
        showLoading("Loading e-papers...");

        const params = new URLSearchParams({
          page: page,
          limit: 20,
          sortBy: "date",
          sortOrder: "desc",
          ...filters,
        });

        const data = await apiCall(`/epapers?${params}`);
        this.displayEPapers(data.epapers || [], data.pagination);
        this.currentPage = page;
        this.currentFilters = filters;

        console.log("✅ E-papers loaded successfully");
      } catch (error) {
        console.error("❌ Failed to load e-papers:", error);
        showNotification("Failed to load e-papers", "error");
      } finally {
        hideLoading();
      }
    },

    // Display e-papers in the list
    displayEPapers: function (epapers) {
      const epapersList = document.getElementById("epapers-list");
      if (!epapersList) return;

      if (epapers.length === 0) {
        epapersList.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-500 mb-4">No e-papers found</p>
          <button onclick="epapersModule.showEPaperForm()" class="btn btn-primary">
            Upload Your First E-Paper
          </button>
        </div>
      `;
        return;
      }

      epapersList.innerHTML = epapers
        .map(
          (epaper) => `
      <div class="card">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="font-semibold text-lg">${epaper.title}</h3>
              <span class="badge badge-gray">${epaper.language}</span>
            </div>
            <p class="text-gray-600 text-sm mb-2">
              Date: ${formatDate(epaper.date)} • 
              Pages: ${epaper.pageCount} • 
              Size: ${formatFileSize(epaper.fileSize || 0)} • 
              Downloads: ${epaper.downloadCount || 0}
            </p>
            ${
              epaper.thumbnailUrl
                ? `
              <img src="${epaper.thumbnailUrl}" alt="${epaper.title}" 
                   class="w-32 h-40 object-cover rounded mt-2">
            `
                : ""
            }
          </div>
          <div class="flex items-center gap-2">
            <button onclick="epapersModule.previewEPaper('${
              epaper.id
            }')" class="btn btn-sm">
              Preview
            </button>
            <button onclick="epapersModule.downloadEPaper('${
              epaper.id
            }')" class="btn btn-sm btn-success">
              Download
            </button>
            <button onclick="epapersModule.editEPaper('${
              epaper.id
            }')" class="btn btn-sm btn-secondary">
              Edit
            </button>
            <button onclick="epapersModule.deleteEPaper('${
              epaper.id
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

    // Show e-paper form
    showEPaperForm: function (epaperId = null) {
      const formSection = document.getElementById("epaper-form-section");
      if (!formSection) return;

      if (epaperId) {
        this.loadEPaperForEdit(epaperId);
      } else {
        this.resetForm();
      }

      formSection.classList.remove("hidden");
      this.updateAutoTitle();
    },

    // Load e-paper for editing
    loadEPaperForEdit: async function (epaperId) {
      try {
        showLoading("Loading e-paper...");

        const data = await apiCall(`/epapers/${epaperId}`);
        const epaper = data.epaper;

        // Populate form fields
        document.getElementById("epaper-title").value = epaper.title || "";
        document.getElementById("epaper-date").value = epaper.date
          ? epaper.date.split("T")[0]
          : "";
        document.getElementById("epaper-language").value =
          epaper.language || "ENGLISH";

        console.log("✅ E-paper loaded for editing");
      } catch (error) {
        console.error("❌ Failed to load e-paper:", error);
        showNotification("Failed to load e-paper for editing", "error");
      } finally {
        hideLoading();
      }
    },

    // Handle file selection
    handleFileSelect: function (file) {
      // Validate file type
      if (file.type !== "application/pdf") {
        showNotification("Please select a PDF file", "error");
        return;
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        showNotification("File size must be less than 50MB", "error");
        return;
      }

      // Update file input
      const fileInput = document.getElementById("epaper-file");
      if (fileInput) {
        fileInput.files = [file];
      }

      // Show file info
      const fileInfo = document.getElementById("file-info");
      if (fileInfo) {
        fileInfo.innerHTML = `
        <div class="flex items-center gap-2 text-sm text-gray-600">
          <span>📄 ${file.name}</span>
          <span>(${formatFileSize(file.size)})</span>
        </div>
      `;
      }
    },

    // Handle upload e-paper
    handleUploadEPaper: async function () {
      try {
        showLoading("Uploading e-paper...");

        const formData = new FormData();
        const fileInput = document.getElementById("epaper-file");
        const dateInput = document.getElementById("epaper-date");
        const languageSelect = document.getElementById("epaper-language");
        const descriptionInput = document.getElementById("epaper-description");

        if (!fileInput.files[0]) {
          showNotification("Please select a PDF file", "error");
          return;
        }

        // Generate auto title
        const date = dateInput.value;
        const language = languageSelect.value;
        const formattedDate = new Date(date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const languageText = language === "HINDI" ? "Hindi" : "English";
        const autoTitle = `The Cliff News - ${formattedDate} - ${languageText}`;

        formData.append("pdf", fileInput.files[0]);
        formData.append("title", autoTitle);
        formData.append("date", date);
        formData.append("language", language);

        if (descriptionInput.value) {
          formData.append("description", descriptionInput.value);
        }

        // Validate required fields
        if (!date || !language) {
          showNotification("Date and language are required", "error");
          return;
        }

        const response = await fetch("/api/epapers/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData,
        });

        const data = await response.json();

        if (response.ok && data.success) {
          showNotification("E-paper uploaded successfully!", "success");
          this.hideEPaperForm();
          this.loadEPapers();
        } else {
          showNotification(data.error || "Failed to upload e-paper", "error");
        }
      } catch (error) {
        console.error("❌ Failed to upload e-paper:", error);
        showNotification("Failed to upload e-paper", "error");
      } finally {
        hideLoading();
      }
    },

    // Hide e-paper form
    hideEPaperForm: function () {
      const formSection = document.getElementById("epaper-form-section");
      if (formSection) {
        formSection.classList.add("hidden");
        this.resetForm();
      }
    },

    // Reset form
    resetForm: function () {
      const form = document.getElementById("epaper-form");
      const fileInput = document.getElementById("epaper-file");
      const uploadContent = document.getElementById("upload-content");
      const filePreview = document.getElementById("file-preview");

      if (form) {
        form.reset();
      }

      if (fileInput) {
        fileInput.value = "";
      }

      if (uploadContent && filePreview) {
        uploadContent.classList.remove("hidden");
        filePreview.classList.add("hidden");
      }

      // Reset date to today
      this.setDefaultDate();
    },

    // Preview e-paper
    previewEPaper: function (epaperId) {
      // Open e-paper preview in new tab
      window.open(`/api/epapers/${epaperId}`, "_blank");
    },

    // Download e-paper
    downloadEPaper: function (epaperId) {
      // Trigger download
      window.open(`/api/epapers/${epaperId}/download`, "_blank");
    },

    // Edit e-paper
    editEPaper: function (epaperId) {
      this.showEPaperForm(epaperId);
    },

    // Delete e-paper
    deleteEPaper: async function (epaperId) {
      if (
        !confirm(
          "Are you sure you want to delete this e-paper? This action cannot be undone."
        )
      ) {
        return;
      }

      try {
        showLoading("Deleting e-paper...");

        await apiCall(`/epapers/${epaperId}`, "DELETE");

        showNotification("E-paper deleted successfully", "success");
        this.loadEPapers();
      } catch (error) {
        console.error("❌ Failed to delete e-paper:", error);
        showNotification("Failed to delete e-paper", "error");
      } finally {
        hideLoading();
      }
    },

    // Get e-paper statistics
    getEPaperStats: async function () {
      try {
        const data = await apiCall("/epapers?limit=1");
        return {
          total: data.pagination?.total || 0,
          totalDownloads: 0, // Would need separate API call
          totalSize: 0,
        };
      } catch (error) {
        console.error("Failed to get e-paper stats:", error);
        return { total: 0, totalDownloads: 0, totalSize: 0 };
      }
    },

    // Get today's e-paper
    getTodayEPaper: async function () {
      try {
        const data = await apiCall("/epapers/today");
        return data.epaper;
      } catch (error) {
        console.error("Failed to get today's e-paper:", error);
        return null;
      }
    },

    // Get e-papers by date
    getEPapersByDate: async function (date, language = "ENGLISH") {
      try {
        const data = await apiCall(`/epapers/date/${date}/${language}`);
        return data.epaper;
      } catch (error) {
        console.error("Failed to get e-paper by date:", error);
        return null;
      }
    },

    // Apply filters
    applyFilters: function () {
      const filters = {};

      const languageFilter = document.getElementById("language-filter");
      const statusFilter = document.getElementById("status-filter");
      const startDateFilter = document.getElementById("start-date-filter");
      const endDateFilter = document.getElementById("end-date-filter");

      if (languageFilter && languageFilter.value) {
        filters.language = languageFilter.value;
      }

      if (statusFilter && statusFilter.value) {
        filters.status = statusFilter.value;
      }

      if (startDateFilter && startDateFilter.value) {
        filters.startDate = startDateFilter.value;
      }

      if (endDateFilter && endDateFilter.value) {
        filters.endDate = endDateFilter.value;
      }

      this.loadEPapers(1, filters);
    },

    // Clear filters
    clearFilters: function () {
      const languageFilter = document.getElementById("language-filter");
      const statusFilter = document.getElementById("status-filter");
      const startDateFilter = document.getElementById("start-date-filter");
      const endDateFilter = document.getElementById("end-date-filter");

      if (languageFilter) languageFilter.value = "";
      if (statusFilter) statusFilter.value = "";
      if (startDateFilter) startDateFilter.value = "";
      if (endDateFilter) endDateFilter.value = "";

      this.loadEPapers(1, {});
    },
  };

  // Make module available globally
  window.epapersModule = epapersModule;
} // End of conditional declaration
