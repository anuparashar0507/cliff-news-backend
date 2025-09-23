// Notifications module for The Cliff News CMS
// Handles OneSignal notification management

// Prevent redeclaration
if (typeof notificationsModule === 'undefined') {
  var notificationsModule = {
  // Initialize notifications module
  init: function() {
    console.log('🔔 Initializing notifications module...');
    this.loadNotifications();
    this.setupEventListeners();
    this.initializeOneSignal();
  },

  // Setup event listeners
  setupEventListeners: function() {
    // Notification form submission
    const notificationForm = document.getElementById('notification-form');
    if (notificationForm) {
      notificationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSendNotification();
      });
    }

    // Quick send buttons
    document.querySelectorAll('[data-quick-notification]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = e.target.getAttribute('data-quick-notification');
        this.handleQuickNotification(type);
      });
    });
  },

  // Initialize OneSignal
  initializeOneSignal: function() {
    if (typeof OneSignal === 'undefined') {
      console.warn('OneSignal SDK not loaded');
      return;
    }

    // Initialize OneSignal
    OneSignal.init({
      appId: "your-onesignal-app-id", // Replace with actual app ID
      allowLocalhostAsSecureOrigin: true,
      notifyButton: {
        enable: false // We'll handle notifications through our CMS
      }
    });

    console.log('✅ OneSignal initialized');
  },

  // Load notifications list
  async loadNotifications() {
    try {
      showLoading('Loading notifications...');
      
      const data = await apiCall('/notifications?limit=50&sort=createdAt&order=desc');
      this.displayNotifications(data.notifications || []);
      
      console.log('✅ Notifications loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load notifications:', error);
      showNotification('Failed to load notifications', 'error');
    } finally {
      hideLoading();
    }
  },

  // Display notifications in the list
  displayNotifications: function(notifications) {
    const notificationsList = document.getElementById('notifications-list');
    if (!notificationsList) return;

    if (notifications.length === 0) {
      notificationsList.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-500 mb-4">No notifications sent yet</p>
          <button onclick="notificationsModule.showNotificationForm()" class="btn btn-primary">
            Send Your First Notification
          </button>
        </div>
      `;
      return;
    }

    notificationsList.innerHTML = notifications.map(notification => `
      <div class="card">
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h3 class="font-semibold text-lg">${notification.title}</h3>
              <span class="badge ${getStatusColor(notification.status)}">${notification.status}</span>
              <span class="badge badge-gray">${notification.type}</span>
            </div>
            <p class="text-gray-600 text-sm mb-2">${notification.message}</p>
            <div class="flex items-center gap-4 text-sm text-gray-500">
              <span>Target: ${notification.targetAudience}</span>
              <span>Sent: ${notification.sentAt ? formatDate(notification.sentAt) : 'Not sent'}</span>
              <span>Delivered: ${notification.deliveredCount || 0}</span>
              <span>Clicks: ${notification.clickedCount || 0}</span>
            </div>
          </div>
          <div class="flex items-center gap-2">
            ${notification.status === 'DRAFT' ? `
              <button onclick="notificationsModule.sendNotification('${notification.id}')" class="btn btn-sm btn-success">
                Send
              </button>
            ` : ''}
            <button onclick="notificationsModule.editNotification('${notification.id}')" class="btn btn-sm btn-secondary">
              Edit
            </button>
            <button onclick="notificationsModule.deleteNotification('${notification.id}')" class="btn btn-sm btn-danger">
              Delete
            </button>
          </div>
        </div>
      </div>
    `).join('');
  },

  // Show notification form
  showNotificationForm: function(notificationId = null) {
    const form = document.getElementById('notification-form');
    if (!form) return;

    if (notificationId) {
      this.loadNotificationForEdit(notificationId);
    } else {
      form.reset();
      document.getElementById('notification-type').value = 'GENERAL';
      document.getElementById('notification-target').value = 'all';
    }

    // Show form modal or section
    console.log('Notification form shown');
  },

  // Load notification for editing
  loadNotificationForEdit: async function(notificationId) {
    try {
      showLoading('Loading notification...');
      
      const data = await apiCall(`/notifications/${notificationId}`);
      const notification = data.notification;
      
      // Populate form fields
      document.getElementById('notification-title').value = notification.title || '';
      document.getElementById('notification-message').value = notification.message || '';
      document.getElementById('notification-type').value = notification.type || 'GENERAL';
      document.getElementById('notification-target').value = notification.targetAudience || 'all';
      
      console.log('✅ Notification loaded for editing');
    } catch (error) {
      console.error('❌ Failed to load notification:', error);
      showNotification('Failed to load notification for editing', 'error');
    } finally {
      hideLoading();
    }
  },

  // Handle send notification
  handleSendNotification: async function() {
    try {
      showLoading('Sending notification...');
      
      const formData = {
        title: document.getElementById('notification-title').value,
        message: document.getElementById('notification-message').value,
        type: document.getElementById('notification-type').value,
        targetAudience: document.getElementById('notification-target').value,
        scheduledAt: document.getElementById('notification-schedule').value || null
      };

      // Validate required fields
      if (!formData.title.trim() || !formData.message.trim()) {
        showNotification('Title and message are required', 'error');
        return;
      }

      const response = await apiCall('/notifications', 'POST', formData);
      
      if (response.success) {
        showNotification('Notification sent successfully!', 'success');
        this.hideNotificationForm();
        this.loadNotifications();
      } else {
        showNotification('Failed to send notification', 'error');
      }
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      showNotification('Failed to send notification', 'error');
    } finally {
      hideLoading();
    }
  },

  // Send existing notification
  sendNotification: async function(notificationId) {
    try {
      showLoading('Sending notification...');
      
      const response = await apiCall(`/notifications/${notificationId}/send`, 'POST');
      
      if (response.success) {
        showNotification('Notification sent successfully!', 'success');
        this.loadNotifications();
      } else {
        showNotification('Failed to send notification', 'error');
      }
    } catch (error) {
      console.error('❌ Failed to send notification:', error);
      showNotification('Failed to send notification', 'error');
    } finally {
      hideLoading();
    }
  },

  // Handle quick notifications
  handleQuickNotification: function(type) {
    const templates = {
      'breaking': {
        title: 'Breaking News Alert',
        message: 'Stay updated with the latest breaking news',
        type: 'BREAKING'
      },
      'article': {
        title: 'New Article Published',
        message: 'Check out our latest article',
        type: 'ARTICLE'
      },
      'digest': {
        title: 'Daily News Digest',
        message: 'Your daily roundup of top stories',
        type: 'DIGEST'
      }
    };

    const template = templates[type];
    if (template) {
      document.getElementById('notification-title').value = template.title;
      document.getElementById('notification-message').value = template.message;
      document.getElementById('notification-type').value = template.type;
    }
  },

  // Hide notification form
  hideNotificationForm: function() {
    // Implement form hiding logic
    console.log('Notification form hidden');
  },

  // Edit notification
  editNotification: function(notificationId) {
    this.showNotificationForm(notificationId);
  },

  // Delete notification
  deleteNotification: async function(notificationId) {
    if (!confirm('Are you sure you want to delete this notification? This action cannot be undone.')) {
      return;
    }
    
    try {
      showLoading('Deleting notification...');
      
      await apiCall(`/notifications/${notificationId}`, 'DELETE');
      
      showNotification('Notification deleted successfully', 'success');
      this.loadNotifications();
    } catch (error) {
      console.error('❌ Failed to delete notification:', error);
      showNotification('Failed to delete notification', 'error');
    } finally {
      hideLoading();
    }
  },

  // Get notification statistics
  getNotificationStats: async function() {
    try {
      const data = await apiCall('/notifications/stats');
      return data.stats || {
        total: 0,
        sent: 0,
        scheduled: 0,
        failed: 0,
        totalDelivered: 0,
        totalClicks: 0
      };
    } catch (error) {
      console.error('Failed to get notification stats:', error);
      return { total: 0, sent: 0, scheduled: 0, failed: 0, totalDelivered: 0, totalClicks: 0 };
    }
  },

  // Send breaking news notification
  sendBreakingNews: async function(articleId) {
    try {
      const response = await apiCall('/notifications/breaking', 'POST', {
        articleId: articleId,
        type: 'BREAKING'
      });
      
      if (response.success) {
        showNotification('Breaking news notification sent!', 'success');
      }
    } catch (error) {
      console.error('Failed to send breaking news notification:', error);
      showNotification('Failed to send breaking news notification', 'error');
    }
  },

  // Schedule notification
  scheduleNotification: async function(notificationId, scheduledAt) {
    try {
      const response = await apiCall(`/notifications/${notificationId}/schedule`, 'PUT', {
        scheduledAt: scheduledAt
      });
      
      if (response.success) {
        showNotification('Notification scheduled successfully!', 'success');
        this.loadNotifications();
      }
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      showNotification('Failed to schedule notification', 'error');
    }
  }
};

// Make module available globally
window.notificationsModule = notificationsModule;
} // End of conditional declaration
