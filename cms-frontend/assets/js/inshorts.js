// Inshorts Management Module
if (typeof inshortsModule === "undefined") {
  var inshortsModule = {
    currentEditingInshort: null,
    autoSaveInterval: null,

    init: function () {
      console.log("📰 Initializing inshorts module...");
      this.setupEventListeners();
      this.loadInshorts();
    },

    setupEventListeners: function () {
      // Generate Inshort button
      document.addEventListener("click", (e) => {
        if (e.target.classList.contains("generate-inshort-btn")) {
          const articleId = e.target.dataset.articleId;
          this.generateInshort(articleId);
        }
      });

      // Edit Inshort button
      document.addEventListener("click", (e) => {
        if (e.target.classList.contains("edit-inshort-btn")) {
          const inshortId = e.target.dataset.inshortId;
          this.editInshort(inshortId);
        }
      });

      // Delete Inshort button
      document.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-inshort-btn")) {
          const inshortId = e.target.dataset.inshortId;
          this.deleteInshort(inshortId);
        }
      });

      // Publish Inshort button
      document.addEventListener("click", (e) => {
        if (e.target.classList.contains("publish-inshort-btn")) {
          const inshortId = e.target.dataset.inshortId;
          this.publishInshort(inshortId);
        }
      });

      // Save Inshort form
      document.addEventListener("click", (e) => {
        if (e.target.id === "save-inshort-btn") {
          this.saveInshort();
        }
      });

      // Cancel edit
      document.addEventListener("click", (e) => {
        if (e.target.id === "cancel-inshort-btn") {
          this.cancelEdit();
        }
      });
    },

    loadInshorts: async function () {
      try {
        const response = await CMS.apiCall("/inshorts");
        if (response.success) {
          this.displayInshorts(response.inshorts);
          console.log("✅ Inshorts loaded successfully");
        }
      } catch (error) {
        console.error("Failed to load inshorts:", error);
        CMS.showNotification("Failed to load inshorts", "error");
      }
    },

    displayInshorts: function (inshorts) {
      const container = document.getElementById("inshorts-list");
      if (!container) return;

      if (inshorts.length === 0) {
        container.innerHTML = `
          <div class="text-center py-8 text-gray-500">
            <p>No Inshorts found. Generate one from an article!</p>
          </div>
        `;
        return;
      }

      container.innerHTML = inshorts
        .map(
          (inshort) => `
        <div class="bg-white rounded-lg shadow p-6 mb-4">
          <div class="flex justify-between items-start mb-4">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">${
                inshort.title
              }</h3>
              <p class="text-gray-600 text-sm mb-2">${inshort.content}</p>
              <div class="flex items-center space-x-4 text-sm text-gray-500">
                <span class="flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"></path>
                  </svg>
                  ${inshort.author.name}
                </span>
                <span class="flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd"></path>
                  </svg>
                  ${inshort.category.name}
                </span>
                <span class="flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"></path>
                  </svg>
                  ${inshort.readTime} min read
                </span>
                <span class="px-2 py-1 text-xs rounded-full ${
                  inshort.status === "PUBLISHED"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }">
                  ${inshort.status}
                </span>
              </div>
            </div>
            <div class="flex space-x-2">
              <button class="edit-inshort-btn btn btn-sm btn-secondary" data-inshort-id="${
                inshort.id
              }">
                Edit
              </button>
              ${
                inshort.status === "DRAFT"
                  ? `
                <button class="publish-inshort-btn btn btn-sm btn-primary" data-inshort-id="${inshort.id}">
                  Publish
                </button>
              `
                  : ""
              }
              <button class="delete-inshort-btn btn btn-sm btn-danger" data-inshort-id="${
                inshort.id
              }">
                Delete
              </button>
            </div>
          </div>
          <div class="border-t pt-4">
            <div class="text-sm text-gray-500">
              <strong>Source Article:</strong> ${inshort.sourceArticle.title}
            </div>
            ${
              inshort.tags && inshort.tags.length > 0
                ? `
              <div class="mt-2">
                <div class="flex flex-wrap gap-1">
                  ${inshort.tags
                    .map(
                      (tag) => `
                    <span class="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">${tag.name}</span>
                  `
                    )
                    .join("")}
                </div>
              </div>
            `
                : ""
            }
          </div>
        </div>
      `
        )
        .join("");
    },

    generateInshort: async function (articleId) {
      try {
        CMS.showNotification("Generating and publishing Inshort...", "info");

        const response = await CMS.apiCall(`/inshorts/generate/${articleId}`, {
          method: "POST",
          body: JSON.stringify({
            language: "ENGLISH",
          }),
        });

        if (response.success) {
          CMS.showNotification(
            "Inshort generated and published successfully!",
            "success"
          );
          this.loadInshorts();
        }
      } catch (error) {
        console.error("Failed to generate inshort:", error);
        CMS.showNotification("Failed to generate Inshort", "error");
      }
    },

    editInshort: async function (inshortId) {
      try {
        const response = await CMS.apiCall(`/inshorts/${inshortId}`);
        if (response.success) {
          this.currentEditingInshort = response.inshort;
          this.showInshortEditor(response.inshort);
        }
      } catch (error) {
        console.error("Failed to load inshort for editing:", error);
        CMS.showNotification("Failed to load Inshort", "error");
      }
    },

    showInshortEditor: function (inshort) {
      // Create or show editor modal
      let editorModal = document.getElementById("inshort-editor-modal");
      if (!editorModal) {
        editorModal = this.createInshortEditorModal();
        document.body.appendChild(editorModal);
      }

      // Populate form
      document.getElementById("inshort-title").value = inshort.title;
      document.getElementById("inshort-content").value = inshort.content;
      document.getElementById("inshort-meta-title").value =
        inshort.metaTitle || "";
      document.getElementById("inshort-meta-description").value =
        inshort.metaDescription || "";

      // Show modal
      editorModal.classList.remove("hidden");
    },

    createInshortEditorModal: function () {
      const modal = document.createElement("div");
      modal.id = "inshort-editor-modal";
      modal.className =
        "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden";

      modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-lg font-semibold">Edit Inshort</h3>
              <button id="cancel-inshort-btn" class="text-gray-400 hover:text-gray-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <form id="inshort-editor-form" class="space-y-4">
              <div>
                <label class="form-label">Title</label>
                <input type="text" id="inshort-title" class="form-input" required>
              </div>
              
              <div>
                <label class="form-label">Content</label>
                <textarea id="inshort-content" rows="4" class="form-input" required></textarea>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Meta Title</label>
                  <input type="text" id="inshort-meta-title" class="form-input">
                </div>
                <div>
                  <label class="form-label">Meta Description</label>
                  <textarea id="inshort-meta-description" rows="2" class="form-input"></textarea>
                </div>
              </div>
              
              <div class="flex justify-end space-x-3 pt-4">
                <button type="button" id="cancel-inshort-btn" class="btn btn-secondary">
                  Cancel
                </button>
                <button type="button" id="save-inshort-btn" class="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

      return modal;
    },

    saveInshort: async function () {
      if (!this.currentEditingInshort) return;

      try {
        const formData = {
          title: document.getElementById("inshort-title").value,
          content: document.getElementById("inshort-content").value,
          metaTitle: document.getElementById("inshort-meta-title").value,
          metaDescription: document.getElementById("inshort-meta-description")
            .value,
        };

        const response = await CMS.apiCall(
          `/inshorts/${this.currentEditingInshort.id}`,
          {
            method: "PUT",
            body: JSON.stringify(formData),
          }
        );

        if (response.success) {
          CMS.showNotification("Inshort updated successfully!", "success");
          this.hideInshortEditor();
          this.loadInshorts();
        }
      } catch (error) {
        console.error("Failed to save inshort:", error);
        CMS.showNotification("Failed to save Inshort", "error");
      }
    },

    deleteInshort: async function (inshortId) {
      if (!confirm("Are you sure you want to delete this Inshort?")) return;

      try {
        const response = await CMS.apiCall(`/inshorts/${inshortId}`, {
          method: "DELETE",
        });

        if (response.success) {
          CMS.showNotification("Inshort deleted successfully!", "success");
          this.loadInshorts();
        }
      } catch (error) {
        console.error("Failed to delete inshort:", error);
        CMS.showNotification("Failed to delete Inshort", "error");
      }
    },

    publishInshort: async function (inshortId) {
      try {
        const response = await CMS.apiCall(`/inshorts/${inshortId}/publish`, {
          method: "POST",
        });

        if (response.success) {
          CMS.showNotification("Inshort published successfully!", "success");
          this.loadInshorts();
        }
      } catch (error) {
        console.error("Failed to publish inshort:", error);
        CMS.showNotification("Failed to publish Inshort", "error");
      }
    },

    hideInshortEditor: function () {
      const modal = document.getElementById("inshort-editor-modal");
      if (modal) {
        modal.classList.add("hidden");
      }
      this.currentEditingInshort = null;
    },

    cancelEdit: function () {
      this.hideInshortEditor();
    },
  };

  window.inshortsModule = inshortsModule;
}
