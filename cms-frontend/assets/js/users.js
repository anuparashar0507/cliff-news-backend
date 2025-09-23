// Users module for The Cliff News CMS
// Handles user management (Admin only)

// Prevent redeclaration
if (typeof usersModule === 'undefined') {
  var usersModule = {
  // Initialize users module
  init: function() {
    console.log('👥 Initializing users module...');
    this.loadUsers();
    this.setupEventListeners();
  },

  // Setup event listeners
  setupEventListeners: function() {
    // User form submission
    const userForm = document.getElementById('user-form');
    if (userForm) {
      userForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCreateUser();
      });
    }

    // Role change handler
    const roleSelect = document.getElementById('user-role');
    if (roleSelect) {
      roleSelect.addEventListener('change', (e) => {
        this.handleRoleChange(e.target.value);
      });
    }
  },

  // Load users list
  async loadUsers() {
    try {
      showLoading('Loading users...');
      
      const data = await apiCall('/auth/users');
      this.displayUsers(data.users || []);
      
      console.log('✅ Users loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load users:', error);
      showNotification('Failed to load users', 'error');
    } finally {
      hideLoading();
    }
  },

  // Display users in the list
  displayUsers: function(users) {
    const usersList = document.getElementById('users-list');
    if (!usersList) return;

    if (users.length === 0) {
      usersList.innerHTML = `
        <div class="text-center py-8">
          <p class="text-gray-500 mb-4">No users found</p>
          <button onclick="usersModule.showUserForm()" class="btn btn-primary">
            Add Your First User
          </button>
        </div>
      `;
      return;
    }

    usersList.innerHTML = users.map(user => `
      <div class="card">
        <div class="flex justify-between items-center">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <span class="text-gray-600 font-semibold">${user.name.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <h3 class="font-semibold text-lg">${user.name}</h3>
              <p class="text-gray-600 text-sm">${user.email}</p>
              <p class="text-gray-500 text-xs">${formatDate(user.createdAt)}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge ${user.role === 'ADMIN' ? 'badge-error' : 'badge-gray'}">${user.role}</span>
            <span class="badge ${user.isActive ? 'badge-success' : 'badge-error'}">${user.isActive ? 'Active' : 'Inactive'}</span>
            <button onclick="usersModule.editUser('${user.id}')" class="btn btn-sm btn-secondary">
              Edit
            </button>
            <button onclick="usersModule.toggleUserStatus('${user.id}', ${user.isActive})" 
                    class="btn btn-sm ${user.isActive ? 'btn-warning' : 'btn-success'}">
              ${user.isActive ? 'Deactivate' : 'Activate'}
            </button>
            ${user.role !== 'ADMIN' ? `
              <button onclick="usersModule.deleteUser('${user.id}')" class="btn btn-sm btn-danger">
                Delete
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');
  },

  // Show user form
  showUserForm: function(userId = null) {
    const form = document.getElementById('user-form');
    if (!form) return;

    if (userId) {
      this.loadUserForEdit(userId);
    } else {
      form.reset();
      document.getElementById('user-role').value = 'EDITOR';
    }

    // Show form modal or section
    console.log('User form shown');
  },

  // Load user for editing
  loadUserForEdit: async function(userId) {
    try {
      showLoading('Loading user...');
      
      const data = await apiCall(`/auth/users/${userId}`);
      const user = data.user;
      
      // Populate form fields
      document.getElementById('user-name').value = user.name || '';
      document.getElementById('user-email').value = user.email || '';
      document.getElementById('user-role').value = user.role || 'EDITOR';
      document.getElementById('user-password').value = ''; // Don't show existing password
      document.getElementById('user-password').placeholder = 'Leave blank to keep current password';
      
      console.log('✅ User loaded for editing');
    } catch (error) {
      console.error('❌ Failed to load user:', error);
      showNotification('Failed to load user for editing', 'error');
    } finally {
      hideLoading();
    }
  },

  // Handle role change
  handleRoleChange: function(role) {
    const warningDiv = document.getElementById('role-warning');
    if (warningDiv) {
      if (role === 'ADMIN') {
        warningDiv.innerHTML = `
          <div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
            <strong>Warning:</strong> Admin users have full access to all features including user management.
          </div>
        `;
        warningDiv.style.display = 'block';
      } else {
        warningDiv.style.display = 'none';
      }
    }
  },

  // Handle create user
  handleCreateUser: async function() {
    try {
      showLoading('Creating user...');
      
      const formData = {
        name: document.getElementById('user-name').value,
        email: document.getElementById('user-email').value,
        password: document.getElementById('user-password').value,
        role: document.getElementById('user-role').value
      };

      // Validate required fields
      if (!formData.name || !formData.email) {
        showNotification('Name and email are required', 'error');
        return;
      }

      if (!formData.password) {
        showNotification('Password is required for new users', 'error');
        return;
      }

      if (formData.password.length < 6) {
        showNotification('Password must be at least 6 characters', 'error');
        return;
      }

      if (!isValidEmail(formData.email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
      }

      const response = await apiCall('/auth/users', 'POST', formData);
      
      if (response.success) {
        showNotification('User created successfully!', 'success');
        this.hideUserForm();
        this.loadUsers();
      } else {
        showNotification('Failed to create user', 'error');
      }
    } catch (error) {
      console.error('❌ Failed to create user:', error);
      showNotification('Failed to create user', 'error');
    } finally {
      hideLoading();
    }
  },

  // Hide user form
  hideUserForm: function() {
    // Implement form hiding logic
    console.log('User form hidden');
  },

  // Edit user
  editUser: function(userId) {
    this.showUserForm(userId);
  },

  // Toggle user status
  toggleUserStatus: async function(userId, currentStatus) {
    const action = currentStatus ? 'deactivate' : 'activate';
    
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }
    
    try {
      showLoading(`${action === 'activate' ? 'Activating' : 'Deactivating'} user...`);
      
      const response = await apiCall(`/auth/users/${userId}/toggle-status`, 'PUT', {
        isActive: !currentStatus
      });
      
      if (response.success) {
        showNotification(`User ${action}d successfully`, 'success');
        this.loadUsers();
      } else {
        showNotification(`Failed to ${action} user`, 'error');
      }
    } catch (error) {
      console.error(`❌ Failed to ${action} user:`, error);
      showNotification(`Failed to ${action} user`, 'error');
    } finally {
      hideLoading();
    }
  },

  // Delete user
  deleteUser: async function(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      showLoading('Deleting user...');
      
      await apiCall(`/auth/users/${userId}`, 'DELETE');
      
      showNotification('User deleted successfully', 'success');
      this.loadUsers();
    } catch (error) {
      console.error('❌ Failed to delete user:', error);
      showNotification('Failed to delete user', 'error');
    } finally {
      hideLoading();
    }
  },

  // Get user statistics
  getUserStats: async function() {
    try {
      const data = await apiCall('/auth/users');
      const users = data.users || [];
      
      const stats = {
        total: users.length,
        active: users.filter(u => u.isActive).length,
        inactive: users.filter(u => !u.isActive).length,
        admins: users.filter(u => u.role === 'ADMIN').length,
        editors: users.filter(u => u.role === 'EDITOR').length
      };
      
      return stats;
    } catch (error) {
      console.error('Failed to get user stats:', error);
      return { total: 0, active: 0, inactive: 0, admins: 0, editors: 0 };
    }
  },

  // Update user profile
  updateProfile: async function(profileData) {
    try {
      const response = await apiCall('/auth/profile', 'PUT', profileData);
      
      if (response.success) {
        showNotification('Profile updated successfully', 'success');
        // Update current user info
        if (response.user) {
          currentUser = response.user;
          document.getElementById('user-name').textContent = currentUser.name;
        }
      } else {
        showNotification('Failed to update profile', 'error');
      }
    } catch (error) {
      console.error('❌ Failed to update profile:', error);
      showNotification('Failed to update profile', 'error');
    }
  },

  // Change password
  changePassword: async function(currentPassword, newPassword) {
    try {
      const response = await apiCall('/auth/change-password', 'PUT', {
        currentPassword,
        newPassword
      });
      
      if (response.success) {
        showNotification('Password changed successfully', 'success');
      } else {
        showNotification('Failed to change password', 'error');
      }
    } catch (error) {
      console.error('❌ Failed to change password:', error);
      showNotification('Failed to change password', 'error');
    }
  }
};

// Make module available globally
window.usersModule = usersModule;
} // End of conditional declaration
