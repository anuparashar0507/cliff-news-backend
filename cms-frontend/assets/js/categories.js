// Categories module for The Cliff News CMS
// Handles category management

// Prevent redeclaration
if (typeof categoriesModule === "undefined") {
  var categoriesModule = {
    currentEditingId: null, // Track current editing category ID

    // Initialize categories module
    init: function () {
      if (this.initialized) {
        console.log("⚠️ Categories module already initialized, skipping");
        return;
      }

      console.log("📁 Initializing categories module...");
      this.initialized = true;
      this.loadCategories();
      this.setupEventListeners();

      // Test function to verify module is working
      window.testCategoriesModule = () => {
        console.log("🧪 Testing categories module...");
        this.showCategoryForm();
      };
      console.log("🧪 Test function available: window.testCategoriesModule()");
    },

    // Setup event listeners
    setupEventListeners: function () {
      console.log("🔧 Setting up category event listeners");

      // Category form submission
      const categoryForm = document.getElementById("new-category-form");
      if (categoryForm) {
        // Remove existing listeners to prevent duplicates
        categoryForm.removeEventListener("submit", this.handleFormSubmit);

        // Create bound function for the event listener
        this.handleFormSubmit = (e) => {
          console.log("🔧 Form submit event triggered");
          e.preventDefault();
          this.handleCreateCategory();
        };

        categoryForm.addEventListener("submit", this.handleFormSubmit);
        console.log("✅ Category form event listener attached");
      } else {
        console.warn("⚠️ Category form not found during event listener setup");
      }
    },

    // Load categories list
    async loadCategories() {
      try {
        showLoading("Loading categories...");

        const data = await apiCall("/categories?withCount=true");
        this.displayCategories(data.categories || []);

        console.log("✅ Categories loaded successfully");
      } catch (error) {
        console.error("❌ Failed to load categories:", error);
        showNotification("Failed to load categories", "error");
      } finally {
        hideLoading();
      }
    },

    // Display categories in the list
    displayCategories: function (categories) {
      const categoriesList = document.getElementById("categories-list");
      if (!categoriesList) return;

      if (categories.length === 0) {
        categoriesList.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-500 mb-4">No categories found</p>
          <button onclick="categoriesModule.showCategoryForm()" class="btn btn-primary">
            Create Your First Category
          </button>
        </div>
      `;
        return;
      }

      categoriesList.innerHTML = categories
        .map(
          (category) => `
      <div class="card">
        <div class="flex justify-between items-center">
          <div class="flex items-center">
            <div class="w-4 h-4 rounded mr-3" style="background-color: ${
              category.color
            }"></div>
            <div>
              <h3 class="font-semibold text-lg">${category.name}</h3>
              <p class="text-gray-600 text-sm">${
                category.description || "No description"
              }</p>
              <p class="text-gray-500 text-xs">${
                category._count?.articles || 0
              } articles</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="categoriesModule.editCategory('${
              category.id
            }')" class="btn btn-sm btn-secondary">
              Edit
            </button>
            <button onclick="categoriesModule.deleteCategory('${
              category.id
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

    // Show category form
    showCategoryForm: function (categoryId = null) {
      console.log("🔧 showCategoryForm called with categoryId:", categoryId);

      const formSection = document.getElementById("category-form-section");
      const formTitle = document.getElementById("category-form-title");
      const submitText = document.getElementById("category-submit-text");
      const form = document.getElementById("new-category-form");

      if (!formSection || !form) {
        console.error("❌ Form elements not found");
        return;
      }

      // Prevent multiple calls for the same category
      if (
        categoryId &&
        this.currentEditingId === categoryId &&
        !formSection.classList.contains("hidden")
      ) {
        console.log("⚠️ Form already shown for this category, skipping");
        return;
      }

      if (categoryId) {
        this.currentEditingId = categoryId;
        formTitle.textContent = "Edit Category";
        submitText.textContent = "Update Category";
        this.loadCategoryForEdit(categoryId);
      } else {
        this.currentEditingId = null;
        form.reset();
        document.getElementById("category-color").value = "#FFA500";
        formTitle.textContent = "Add New Category";
        submitText.textContent = "Add Category";
      }

      // Show form as modal overlay
      formSection.classList.remove("hidden");
      formSection.style.setProperty("position", "fixed", "important");
      formSection.style.setProperty("top", "50%", "important");
      formSection.style.setProperty("left", "50%", "important");
      formSection.style.setProperty(
        "transform",
        "translate(-50%, -50%)",
        "important"
      );
      formSection.style.setProperty("z-index", "9999", "important");
      formSection.style.setProperty("background-color", "white", "important");
      formSection.style.setProperty("border", "2px solid #e5e7eb", "important");
      formSection.style.setProperty("border-radius", "0.5rem", "important");
      formSection.style.setProperty(
        "box-shadow",
        "0 10px 25px rgba(0, 0, 0, 0.1)",
        "important"
      );
      formSection.style.setProperty("padding", "2rem", "important");
      formSection.style.setProperty("min-width", "400px", "important");
      formSection.style.setProperty("max-width", "90vw", "important");
      formSection.style.setProperty("max-height", "90vh", "important");
      formSection.style.setProperty("overflow-y", "auto", "important");

      // Create backdrop overlay
      let backdrop = document.getElementById("category-form-backdrop");
      if (!backdrop) {
        backdrop = document.createElement("div");
        backdrop.id = "category-form-backdrop";
        backdrop.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 9998;
          cursor: pointer;
        `;
        backdrop.onclick = () => this.hideCategoryForm();
        document.body.appendChild(backdrop);
      }
      backdrop.style.display = "block";

      // Add keyboard support (ESC to close)
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          this.hideCategoryForm();
          document.removeEventListener("keydown", handleKeyDown);
        }
      };
      document.addEventListener("keydown", handleKeyDown);

      console.log("✅ Category form shown as modal");
      console.log("🔍 Form section classes:", formSection.className);
      console.log(
        "🔍 Form section visible:",
        !formSection.classList.contains("hidden")
      );
      console.log("🔍 Form section display:", formSection.style.display);
      console.log("🔍 Form section visibility:", formSection.style.visibility);
      console.log("🔍 Form section opacity:", formSection.style.opacity);
      console.log("🔍 Form section position:", formSection.style.position);
      console.log("🔍 Form section zIndex:", formSection.style.zIndex);
      console.log(
        "🔍 Form section background:",
        formSection.style.backgroundColor
      );
      console.log("🔍 Form section border:", formSection.style.border);
      console.log("🔍 Form section padding:", formSection.style.padding);
      console.log("🔍 Form section margin:", formSection.style.marginTop);
      console.log(
        "🔍 Form section border radius:",
        formSection.style.borderRadius
      );

      // Scroll to form
      formSection.scrollIntoView({ behavior: "smooth", block: "center" });
      console.log("🔍 Scrolled to form section");

      // Check if form is actually visible in viewport
      const rect = formSection.getBoundingClientRect();
      console.log("🔍 Form section position:", {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        visible:
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.right <= window.innerWidth,
      });

      // Force focus to form
      const firstInput = formSection.querySelector("input");
      if (firstInput) {
        firstInput.focus();
        console.log("🔍 Focused on first input");
      }

      // Show alert to confirm form is shown
      console.log("🚨 FORM SHOULD BE VISIBLE NOW - CHECK THE PAGE!");
      console.log(
        "🚨 If you don't see the form, there might be a CSS or layout issue"
      );

      // Check if the categories section itself is visible
      const categoriesSection = document.getElementById("categories-content");
      if (categoriesSection) {
        const categoriesRect = categoriesSection.getBoundingClientRect();
        const categoriesStyles = window.getComputedStyle(categoriesSection);
        console.log("🔍 Categories section:", {
          id: categoriesSection.id,
          className: categoriesSection.className,
          display: categoriesStyles.display,
          visibility: categoriesStyles.visibility,
          opacity: categoriesStyles.opacity,
          height: categoriesRect.height,
          width: categoriesRect.width,
          visible: categoriesRect.height > 0 && categoriesRect.width > 0,
        });
      }

      // Check parent elements for visibility issues
      let parent = formSection.parentElement;
      let level = 0;
      while (parent && level < 5) {
        const parentRect = parent.getBoundingClientRect();
        const parentStyles = window.getComputedStyle(parent);
        console.log(`🔍 Parent level ${level}:`, {
          tagName: parent.tagName,
          id: parent.id,
          className: parent.className,
          display: parentStyles.display,
          visibility: parentStyles.visibility,
          opacity: parentStyles.opacity,
          height: parentRect.height,
          width: parentRect.width,
          visible: parentRect.height > 0 && parentRect.width > 0,
        });
        parent = parent.parentElement;
        level++;
      }

      // Remove any existing test elements
      const existingTest = document.querySelector('[style*="background: red"]');
      if (existingTest) {
        existingTest.remove();
      }
    },

    // Hide category form
    hideCategoryForm: function () {
      const formSection = document.getElementById("category-form-section");
      const backdrop = document.getElementById("category-form-backdrop");

      if (formSection) {
        formSection.classList.add("hidden");
        // Reset modal styles
        formSection.style.setProperty("position", "", "important");
        formSection.style.setProperty("top", "", "important");
        formSection.style.setProperty("left", "", "important");
        formSection.style.setProperty("transform", "", "important");
        formSection.style.setProperty("z-index", "", "important");
        formSection.style.setProperty("background-color", "", "important");
        formSection.style.setProperty("border", "", "important");
        formSection.style.setProperty("border-radius", "", "important");
        formSection.style.setProperty("box-shadow", "", "important");
        formSection.style.setProperty("padding", "", "important");
        formSection.style.setProperty("min-width", "", "important");
        formSection.style.setProperty("max-width", "", "important");
        formSection.style.setProperty("max-height", "", "important");
        formSection.style.setProperty("overflow-y", "", "important");
        console.log("✅ Category form hidden");
      }

      if (backdrop) {
        backdrop.style.display = "none";
        console.log("✅ Backdrop hidden");
      }
    },

    // Load category for editing
    loadCategoryForEdit: async function (categoryId) {
      console.log("🔧 loadCategoryForEdit called with categoryId:", categoryId);

      try {
        showLoading("Loading category...");

        const data = await apiCall(`/categories/${categoryId}`);
        const category = data.category;

        // Populate form fields
        document.getElementById("category-name").value = category.name || "";
        document.getElementById("category-description").value =
          category.description || "";

        // Set color value and force update with a small delay
        setTimeout(() => {
          const colorInput = document.getElementById("category-color");
          const colorValue = category.color || "#FFA500";

          // Multiple approaches to ensure color input updates
          colorInput.value = colorValue;
          colorInput.setAttribute("value", colorValue);

          // Force color input to update its visual appearance
          colorInput.dispatchEvent(new Event("input", { bubbles: true }));
          colorInput.dispatchEvent(new Event("change", { bubbles: true }));
          colorInput.dispatchEvent(new Event("blur", { bubbles: true }));

          // Alternative: temporarily change and restore to force refresh
          const originalValue = colorInput.value;
          colorInput.value = "#000000";
          colorInput.value = colorValue;

          console.log("🎨 Color set to:", colorValue);
          console.log("🎨 Color input current value:", colorInput.value);
        }, 100);

        console.log("✅ Category loaded for editing:", category.name);
      } catch (error) {
        console.error("❌ Failed to load category:", error);
        showNotification("Failed to load category for editing", "error");
      } finally {
        hideLoading();
      }
    },

    // Handle create/update category
    handleCreateCategory: async function () {
      console.log("🔧 handleCreateCategory called");
      console.log("🔍 Current editing ID:", this.currentEditingId);

      try {
        showLoading("Saving category...");

        const formData = {
          name: document.getElementById("category-name").value,
          description: document.getElementById("category-description").value,
          color: document.getElementById("category-color").value,
        };

        // Validate required fields
        if (!formData.name.trim()) {
          showNotification("Category name is required", "error");
          return;
        }

        let response;
        if (this.currentEditingId) {
          // Update existing category
          response = await apiCall(
            `/categories/${this.currentEditingId}`,
            "PUT",
            formData
          );
        } else {
          // Create new category
          response = await apiCall("/categories", "POST", formData);
        }

        if (response.success) {
          const action = this.currentEditingId ? "updated" : "created";
          showNotification(`Category ${action} successfully!`, "success");
          this.hideCategoryForm();
          this.loadCategories();
        } else {
          const action = this.currentEditingId ? "update" : "create";
          showNotification(`Failed to ${action} category`, "error");
        }
      } catch (error) {
        console.error("❌ Failed to save category:", error);
        showNotification("Failed to save category", "error");
      } finally {
        hideLoading();
      }
    },

    // Edit category
    editCategory: function (categoryId) {
      this.showCategoryForm(categoryId);
    },

    // Delete category
    deleteCategory: async function (categoryId) {
      if (
        !confirm(
          "Are you sure you want to delete this category? This action cannot be undone."
        )
      ) {
        return;
      }

      try {
        showLoading("Deleting category...");

        await apiCall(`/categories/${categoryId}`, "DELETE");

        showNotification("Category deleted successfully", "success");
        this.loadCategories();
      } catch (error) {
        console.error("❌ Failed to delete category:", error);
        showNotification("Failed to delete category", "error");
      } finally {
        hideLoading();
      }
    },

    // Get category statistics
    getCategoryStats: async function () {
      try {
        const data = await apiCall("/categories?withCount=true");
        return (
          data.categories?.map((cat) => ({
            name: cat.name,
            count: cat._count?.articles || 0,
            color: cat.color,
          })) || []
        );
      } catch (error) {
        console.error("Failed to get category stats:", error);
        return [];
      }
    },
  };

  // Make module available globally
  window.categoriesModule = categoriesModule;
} // End of conditional declaration
