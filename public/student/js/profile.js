// Profile View JavaScript
document.addEventListener('DOMContentLoaded', function() {
  const editProfileBtn = document.getElementById('editProfileBtn');
  const backToDashboardBtn = document.getElementById('backToDashboardBtn');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const messageContainer = document.getElementById('messageContainer');
  const messageContent = document.getElementById('messageContent');
  const messageText = document.getElementById('messageText');
  const messageClose = document.getElementById('messageClose');

  // Load profile data
  loadProfile();

  // Event listeners
  editProfileBtn.addEventListener('click', function() {
    window.location.href = '/student/edit-profile.html';
  });

  backToDashboardBtn.addEventListener('click', function() {
    window.location.href = '/student/dashboard.html';
  });

  messageClose.addEventListener('click', hideMessage);

  // Auto-hide messages after 5 seconds
  let messageTimeout;

  async function loadProfile() {
    showLoading();

    try {
      const response = await fetch('/api/student/profile');
      const data = await response.json();

      if (response.ok && data.success) {
        displayProfile(data.data);
      } else {
        if (response.status === 401) {
          // Not authenticated, redirect to login
          window.location.href = '/student/login.html';
          return;
        }
        
        showMessage(data.message || 'Failed to load profile.', 'error');
        
        // If no profile exists, redirect to complete profile
        if (data.message && data.message.includes('not found')) {
          setTimeout(() => {
            window.location.href = '/student/complete-profile.html';
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showMessage('An error occurred while loading your profile.', 'error');
    } finally {
      hideLoading();
    }
  }

  function displayProfile(data) {
    const { user, profile } = data;

    // Display user information
    document.getElementById('email').textContent = user.email || '-';

    // Display profile status
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    
    if (user.profile_status === 'complete') {
      statusBadge.className = 'status-badge complete';
      statusBadge.textContent = 'Complete';
      statusText.textContent = 'Your profile is complete and ready for deployment activities.';
    } else {
      statusBadge.className = 'status-badge incomplete';
      statusBadge.textContent = 'Incomplete';
      statusText.textContent = 'Please complete all required fields to access deployment features.';
    }

    if (profile) {
      // Personal Information
      document.getElementById('fullName').textContent = profile.full_name || '-';
      document.getElementById('studentNumber').textContent = profile.student_number || '-';
      document.getElementById('contactNumber').textContent = profile.contact_number || '-';
      document.getElementById('birthdate').textContent = profile.birthdate ? formatDate(profile.birthdate) : '-';
      document.getElementById('sex').textContent = profile.sex || '-';

      // Academic Information
      document.getElementById('course').textContent = profile.course || '-';
      document.getElementById('yearLevel').textContent = profile.year_level || '-';
      document.getElementById('section').textContent = profile.section || '-';
      document.getElementById('nstpComponent').textContent = profile.nstp_component || '-';

      // Location Information
      document.getElementById('completeAddress').textContent = profile.complete_address || '-';
      document.getElementById('barangay').textContent = profile.barangay || '-';
      document.getElementById('municipality').textContent = profile.municipality || '-';
      document.getElementById('province').textContent = profile.province || '-';

      // Skills
      document.getElementById('skills').textContent = profile.skills || '-';

      // Emergency Contact
      document.getElementById('emergencyContactName').textContent = profile.emergency_contact_name || '-';
      document.getElementById('emergencyContactNumber').textContent = profile.emergency_contact_number || '-';
      document.getElementById('emergencyContactRelationship').textContent = profile.emergency_contact_relationship || '-';
    } else {
      // No profile data, redirect to complete profile
      showMessage('Profile not found. Redirecting to complete profile...', 'info');
      setTimeout(() => {
        window.location.href = '/student/complete-profile.html';
      }, 2000);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return '-';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  function showLoading() {
    loadingOverlay.style.display = 'flex';
  }

  function hideLoading() {
    loadingOverlay.style.display = 'none';
  }

  function showMessage(message, type = 'info') {
    messageText.textContent = message;
    messageContent.className = `message-content ${type}`;
    messageContainer.style.display = 'block';

    // Clear existing timeout
    if (messageTimeout) {
      clearTimeout(messageTimeout);
    }

    // Auto-hide after 5 seconds
    messageTimeout = setTimeout(hideMessage, 5000);
  }

  function hideMessage() {
    messageContainer.style.display = 'none';
    if (messageTimeout) {
      clearTimeout(messageTimeout);
    }
  }
});