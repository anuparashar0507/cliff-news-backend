// Dashboard module for The Cliff News CMS
// Handles dashboard statistics and recent activity

// Prevent redeclaration
if (typeof dashboardModule === "undefined") {
  var dashboardModule = {
    // Initialize dashboard
    init: function () {
      console.log("📊 Initializing dashboard...");
      this.loadDashboardData();
      this.setupEventListeners();
    },

    // Setup event listeners
    setupEventListeners: function () {
      // Refresh button
      const refreshBtn = document.getElementById("refresh-dashboard");
      if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
          this.loadDashboardData();
        });
      }

      // Quick action buttons
      const quickActions = document.querySelectorAll("[data-quick-action]");
      quickActions.forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const action = e.target.getAttribute("data-quick-action");
          this.handleQuickAction(action);
        });
      });
    },

    // Load dashboard data
    async loadDashboardData() {
      try {
        showLoading("Loading dashboard...");

        // Load all dashboard data in parallel
        const [articles, epapers, highlights, categories, recentActivity] =
          await Promise.all([
            this.loadArticlesStats(),
            this.loadEPapersStats(),
            this.loadHighlightsStats(),
            this.loadCategoriesStats(),
            this.loadRecentActivity(),
          ]);

        // Update dashboard cards
        this.updateStatsCards({
          articles: articles.pagination?.total || 0,
          epapers: epapers.pagination?.total || 0,
          highlights: highlights.pagination?.total || 0,
          categories: categories.categories?.length || 0,
        });

        // Update recent activity
        this.updateRecentActivity(recentActivity);

        console.log("✅ Dashboard data loaded successfully");
      } catch (error) {
        console.error("❌ Failed to load dashboard:", error);
        showNotification("Failed to load dashboard data", "error");
      } finally {
        hideLoading();
      }
    },

    // Load articles statistics
    async loadArticlesStats() {
      try {
        return await apiCall("/articles?limit=1");
      } catch (error) {
        console.error("Failed to load articles stats:", error);
        return { pagination: { total: 0 } };
      }
    },

    // Load e-papers statistics
    async loadEPapersStats() {
      try {
        return await apiCall("/epapers?limit=1");
      } catch (error) {
        console.error("Failed to load e-papers stats:", error);
        return { pagination: { total: 0 } };
      }
    },

    // Load highlights statistics
    async loadHighlightsStats() {
      try {
        return await apiCall("/highlights?limit=1");
      } catch (error) {
        console.error("Failed to load highlights stats:", error);
        return { pagination: { total: 0 } };
      }
    },

    // Load categories statistics
    async loadCategoriesStats() {
      try {
        return await apiCall("/categories");
      } catch (error) {
        console.error("Failed to load categories stats:", error);
        return { categories: [] };
      }
    },

    // Load recent activity
    async loadRecentActivity() {
      try {
        const articles = await apiCall(
          "/articles?limit=5&sort=createdAt&order=desc"
        );
        return articles.articles || [];
      } catch (error) {
        console.error("Failed to load recent activity:", error);
        return [];
      }
    },

    // Update statistics cards
    updateStatsCards: function (stats) {
      const elements = {
        "total-articles": stats.articles,
        "total-epapers": stats.epapers,
        "total-highlights": stats.highlights,
        "total-categories": stats.categories,
      };

      Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
          element.textContent = value;
          this.animateCounter(element, value);
        }
      });
    },

    // Animate counter
    animateCounter: function (element, targetValue) {
      const startValue = 0;
      const duration = 1000;
      const startTime = performance.now();

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const currentValue = Math.floor(progress * targetValue);
        element.textContent = currentValue;

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    },

    // Update recent activity
    updateRecentActivity: function (activities) {
      const activityDiv = document.getElementById("recent-activity");
      if (!activityDiv) return;

      if (activities.length === 0) {
        activityDiv.innerHTML =
          '<p class="text-gray-500 text-center py-4">No recent activity</p>';
        return;
      }

      activityDiv.innerHTML = activities
        .map(
          (activity) => `
      <div class="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
        <div class="flex-1">
          <p class="font-medium text-gray-900">${activity.title}</p>
          <p class="text-sm text-gray-500">
            by ${activity.author?.name || "Unknown"} • 
            ${formatDate(activity.createdAt)}
          </p>
        </div>
        <div class="flex items-center gap-2">
          <span class="badge ${getStatusColor(activity.status)}">${
            activity.status
          }</span>
          <button onclick="CMS.showSection('articles')" class="text-blue-500 hover:text-blue-700 text-sm">
            View
          </button>
        </div>
      </div>
    `
        )
        .join("");
    },

    // Handle quick actions
    handleQuickAction: function (action) {
      switch (action) {
        case "create-article":
          CMS.showSection("articles");
          // Trigger create article modal
          setTimeout(() => {
            const createBtn = document.querySelector(
              '[onclick*="showArticleEditor"]'
            );
            if (createBtn) createBtn.click();
          }, 100);
          break;
        case "upload-epaper":
          CMS.showSection("epapers");
          setTimeout(() => {
            const uploadBtn = document.querySelector(
              '[onclick*="showEPaperForm"]'
            );
            if (uploadBtn) uploadBtn.click();
          }, 100);
          break;
        case "add-highlight":
          CMS.showSection("highlights");
          setTimeout(() => {
            const addBtn = document.querySelector(
              '[onclick*="showHighlightForm"]'
            );
            if (addBtn) addBtn.click();
          }, 100);
          break;
        case "send-notification":
          CMS.showSection("notifications");
          setTimeout(() => {
            const sendBtn = document.querySelector(
              '[onclick*="showNotificationForm"]'
            );
            if (sendBtn) sendBtn.click();
          }, 100);
          break;
        default:
          console.log("Unknown quick action:", action);
      }
    },

    // Get dashboard statistics for charts
    async getChartData() {
      try {
        const [articlesByMonth, categoriesData, statusData] = await Promise.all(
          [
            this.getArticlesByMonth(),
            this.getCategoriesData(),
            this.getStatusData(),
          ]
        );

        return {
          articlesByMonth,
          categoriesData,
          statusData,
        };
      } catch (error) {
        console.error("Failed to load chart data:", error);
        return null;
      }
    },

    // Get articles by month for chart
    async getArticlesByMonth() {
      try {
        const articles = await apiCall("/articles?limit=100");
        const monthlyData = {};

        articles.articles?.forEach((article) => {
          const month = new Date(article.createdAt)
            .toISOString()
            .substring(0, 7);
          monthlyData[month] = (monthlyData[month] || 0) + 1;
        });

        return Object.entries(monthlyData)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, count]) => ({ month, count }));
      } catch (error) {
        console.error("Failed to get articles by month:", error);
        return [];
      }
    },

    // Get categories data for chart
    async getCategoriesData() {
      try {
        const categories = await apiCall("/categories?withCount=true");
        return (
          categories.categories?.map((cat) => ({
            name: cat.name,
            count: cat._count?.articles || 0,
            color: cat.color,
          })) || []
        );
      } catch (error) {
        console.error("Failed to get categories data:", error);
        return [];
      }
    },

    // Get status data for chart
    async getStatusData() {
      try {
        const articles = await apiCall("/articles?limit=100");
        const statusCounts = {};

        articles.articles?.forEach((article) => {
          statusCounts[article.status] =
            (statusCounts[article.status] || 0) + 1;
        });

        return Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count,
        }));
      } catch (error) {
        console.error("Failed to get status data:", error);
        return [];
      }
    },

    // Export dashboard data
    async exportDashboardData() {
      try {
        showLoading("Exporting dashboard data...");

        const data = await this.getChartData();
        const exportData = {
          timestamp: new Date().toISOString(),
          statistics: {
            articles:
              document.getElementById("total-articles")?.textContent || 0,
            epapers: document.getElementById("total-epapers")?.textContent || 0,
            highlights:
              document.getElementById("total-highlights")?.textContent || 0,
            categories:
              document.getElementById("total-categories")?.textContent || 0,
          },
          charts: data,
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: "application/json",
        });

        const url = URL.createObjectURL(blob);
        downloadFile(
          url,
          `dashboard-export-${new Date().toISOString().split("T")[0]}.json`
        );
        URL.revokeObjectURL(url);

        showNotification("Dashboard data exported successfully", "success");
      } catch (error) {
        console.error("Failed to export dashboard data:", error);
        showNotification("Failed to export dashboard data", "error");
      } finally {
        hideLoading();
      }
    },
  };

  // Make module available globally
  window.dashboardModule = dashboardModule;
} // End of conditional declaration
