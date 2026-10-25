// Student Profile View JavaScript
document.addEventListener('DOMContentLoaded', function () {
  const profileSkeleton = document.getElementById('profileSkeleton');
  const profileContent = document.getElementById('profileContent');
  const editProfileBtn = document.getElementById('editProfileBtn');
  const messageContainer = document.getElementById('messageContainer');
  const messageContent = document.getElementById('messageContent');
  const messageText = document.getElementById('messageText');
  const messageClose = document.getElementById('messageClose');

  let messageTimeout;

  if (editProfileBtn) {
    editProfileBtn.addEventListener('click', function (e) {
      // Natural link to edit-profile.html
      window.location.href = 'edit-profile.html';
    });
  }

  if (messageClose) {
    messageClose.addEventListener('click', hideMessage);
  }

  // Load profile data
  loadProfile();

  async function loadProfile() {
    showLoading();

    try {
      const response = await fetch('/api/student/profile', {
        method: 'GET',
        credentials: 'include'
      });

      if (response.status === 401 || response.status === 403) {
        window.location.href = '/student/login.html';
        return;
      }

      const data = await response.json();

      if (response.ok && data.success && data.data) {
        const { user, profile } = data.data;

        // If profile doesn't exist yet, redirect to complete-profile.html
        if (!profile || user?.profile_status !== 'complete') {
          showMessage('Please complete your profile first.', 'info');
          setTimeout(() => {
            window.location.href = '/student/complete-profile.html';
          }, 1500);
          return;
        }

        displayProfile(user, profile);
      } else {
        showMessage(data.message || 'Failed to load profile.', 'error');
        if (data.message && data.message.toLowerCase().includes('not found')) {
          setTimeout(() => {
            window.location.href = '/student/complete-profile.html';
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      showMessage('An error occurred while loading your profile.', 'error');
    } finally {
      hideLoading();
    }
  }

  function displayProfile(user, profile) {
    const fullName = profile.full_name || 'Student';
    const email = user.email || '—';
    const initials = getInitials(fullName);

    // Hero Header
    const fullNameHeader = document.getElementById('fullNameHeader');
    if (fullNameHeader) fullNameHeader.textContent = fullName;

    const heroAvatar = document.getElementById('heroAvatar');
    if (heroAvatar) heroAvatar.textContent = initials;

    const headerStudentNumber = document.getElementById('headerStudentNumber');
    if (headerStudentNumber) headerStudentNumber.textContent = profile.student_number ? `ID: ${profile.student_number}` : '—';

    const headerAcademicInfo = document.getElementById('headerAcademicInfo');
    if (headerAcademicInfo) {
      const parts = [];
      if (profile.course) parts.push(profile.course);
      if (profile.year_level) parts.push(`Year ${profile.year_level}`);
      if (profile.section) parts.push(`Sec ${profile.section}`);
      headerAcademicInfo.textContent = parts.join(' • ') || 'CWTS Student';
    }

    // Status Badge & Text
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    if (statusBadge) {
      statusBadge.className = 'badge badge-complete';
      statusBadge.textContent = 'Complete';
    }
    if (statusText) {
      statusText.textContent = 'Your profile is complete and verified for NSTP deployment.';
    }

    // Personal Information
    setFieldText('fullName', fullName);
    setFieldText('studentNumber', profile.student_number);
    setFieldText('email', email);
    setFieldText('contactNumber', profile.contact_number);
    setFieldText('birthdate', profile.birthdate ? formatDate(profile.birthdate) : '—');
    setFieldText('sex', profile.sex);

    // Academic Information
    setFieldText('course', profile.course);
    setFieldText('yearLevel', profile.year_level ? `Year ${profile.year_level}` : '—');
    setFieldText('section', profile.section);
    setFieldText('nstpComponent', profile.nstp_component || 'CWTS');

    // Location Information
    setFieldText('completeAddress', profile.complete_address);
    setFieldText('barangay', profile.barangay);
    setFieldText('municipality', profile.municipality);
    setFieldText('province', profile.province);

    // Skills
    renderSkills(profile.skills);

    // Emergency Contact
    setFieldText('emergencyContactName', profile.emergency_contact_name);
    setFieldText('emergencyContactNumber', profile.emergency_contact_number);
    setFieldText('emergencyContactRelationship', profile.emergency_contact_relationship);

    // Update Sidebar User Info if available
    const sidebarUserName = document.getElementById('sidebarUserName');
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    if (sidebarUserName && fullName) sidebarUserName.textContent = fullName;
    if (sidebarAvatar && initials) sidebarAvatar.textContent = initials;
  }

  function setFieldText(id, value) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = value && String(value).trim() !== '' ? value : '—';
    }
  }

  function renderSkills(skillsData) {
    const container = document.getElementById('skillsPillsContainer');
    if (!container) return;

    if (!skillsData || !skillsData.trim()) {
      container.innerHTML = '<span class="profile-display-value">—</span>';
      return;
    }

    // Skills might be comma separated or single string
    const skillsList = skillsData.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);

    if (skillsList.length === 0) {
      container.innerHTML = '<span class="profile-display-value">—</span>';
      return;
    }

    container.innerHTML = skillsList.map(skill => `
      <span class="skill-pill">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        ${escapeHtml(skill)}
      </span>
    `).join('');
  }

  function getInitials(name) {
    if (!name) return 'ST';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function formatDate(dateString) {
    if (!dateString) return '—';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showLoading() {
    if (profileSkeleton) profileSkeleton.style.display = 'block';
    if (profileContent) profileContent.style.display = 'none';
  }

  function hideLoading() {
    if (profileSkeleton) profileSkeleton.style.display = 'none';
    if (profileContent) profileContent.style.display = 'block';
  }

  function showMessage(message, type = 'info') {
    if (window.showStudentToast) {
      window.showStudentToast(message, type);
      return;
    }

    if (!messageContainer || !messageText || !messageContent) return;
    messageText.textContent = message;
    messageContent.className = `message-content ${type}`;
    messageContainer.style.display = 'block';

    if (messageTimeout) clearTimeout(messageTimeout);
    messageTimeout = setTimeout(hideMessage, 4000);
  }

  function hideMessage() {
    if (messageContainer) messageContainer.style.display = 'none';
    if (messageTimeout) clearTimeout(messageTimeout);
  }
});