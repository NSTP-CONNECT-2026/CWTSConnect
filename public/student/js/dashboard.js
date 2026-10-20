// dashboard.js — CWTSConnect Student Dashboard Controller

const logoutBtn = document.getElementById('logoutBtn');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const sidebar = document.getElementById('sidebar');
const mobileOverlay = document.getElementById('mobileOverlay');
const refreshNotifsBtn = document.getElementById('refreshNotifsBtn');

// Mobile drawer toggle handlers
if (mobileMenuToggle && sidebar && mobileOverlay) {
  mobileMenuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
    mobileOverlay.classList.toggle('active');
  });

  mobileOverlay.addEventListener('click', () => {
    sidebar.classList.remove('mobile-open');
    mobileOverlay.classList.remove('active');
  });
}

/**
 * Fetches the current logged-in student's account data from the server.
 * If not logged in or not a student, redirects to login.
 */
async function loadDashboard() {
  const dashboardSkeleton = document.getElementById('dashboardSkeleton');
  const dashboardContent = document.getElementById('dashboardContent');

  if (dashboardSkeleton) dashboardSkeleton.style.display = 'block';
  if (dashboardContent) dashboardContent.classList.add('hidden');

  try {
    const response = await fetch('/api/student/me', {
      method: 'GET',
      credentials: 'include'
    });

    if (response.status === 401 || response.status === 403) {
      window.location.href = '/login.html';
      return;
    }

    const data = await response.json();

    if (!data.success || !data.user) {
      window.location.href = '/login.html';
      return;
    }

    // Render dashboard with basic user account info
    renderDashboard(data.user);

    // Fetch detailed profile and notifications asynchronously
    loadDetailedProfile(data.user);
    loadNotifications();

  } catch (error) {
    console.error('Failed to load dashboard:', error);
    window.location.href = '/login.html';
  }
}

/**
 * Populates core dashboard elements with student account data.
 * @param {object} user - The user object from the API
 */
function renderDashboard(user) {
  const dashboardSkeleton = document.getElementById('dashboardSkeleton');
  const dashboardContent = document.getElementById('dashboardContent');

  if (dashboardSkeleton) dashboardSkeleton.style.display = 'none';
  if (dashboardContent) dashboardContent.classList.remove('hidden');

  const isProfileComplete = user.profile_status === 'complete';
  const cmoStatus = user.cmo_compliance_status || 'incomplete';
  const emailPrefix = user.email ? user.email.split('@')[0] : 'Student';

  // Update Topbar and Sidebar User details
  const topbarEmailEl = document.getElementById('topbarEmail');
  if (topbarEmailEl) topbarEmailEl.textContent = user.email;

  const sidebarUserNameEl = document.getElementById('sidebarUserName');
  if (sidebarUserNameEl) sidebarUserNameEl.textContent = emailPrefix;

  const sidebarAvatarEl = document.getElementById('sidebarAvatar');
  if (sidebarAvatarEl) {
    sidebarAvatarEl.textContent = emailPrefix.substring(0, 2).toUpperCase();
  }

  // Update Welcome message
  const welcomeHeadingEl = document.getElementById('welcomeHeading');
  if (welcomeHeadingEl) {
    welcomeHeadingEl.textContent = `Welcome back, ${emailPrefix}.`;
  }

  // Incomplete profile banner toggle
  const profileBannerEl = document.getElementById('profileBanner');
  if (profileBannerEl) {
    profileBannerEl.style.display = isProfileComplete ? 'none' : 'flex';
  }

  // --- 1. Profile Summary Card ---
  const profileBadgeEl = document.getElementById('profileBadge');
  const profileBtnEl = document.getElementById('profileBtn');
  const profileNavLink = document.getElementById('profileNavLink');
  const profileNavLabel = document.getElementById('profileNavLabel');

  if (isProfileComplete) {
    if (profileBadgeEl) {
      profileBadgeEl.textContent = 'Complete';
      profileBadgeEl.className = 'badge badge-complete';
    }
    if (profileBtnEl) {
      profileBtnEl.textContent = 'View & Edit Profile';
      profileBtnEl.href = 'edit-profile.html';
      profileBtnEl.className = 'btn btn-secondary btn-sm';
    }
    if (profileNavLink) profileNavLink.href = 'edit-profile.html';
    if (profileNavLabel) profileNavLabel.textContent = 'My Profile';
  } else {
    if (profileBadgeEl) {
      profileBadgeEl.textContent = 'Incomplete';
      profileBadgeEl.className = 'badge badge-incomplete';
    }
    if (profileBtnEl) {
      profileBtnEl.textContent = 'Complete Profile Now';
      profileBtnEl.href = 'complete-profile.html';
      profileBtnEl.className = 'btn btn-primary btn-sm';
    }
    if (profileNavLink) profileNavLink.href = 'complete-profile.html';
    if (profileNavLabel) profileNavLabel.textContent = 'Complete Profile';
  }

  // --- 2. Requirement Status Card ---
  const requirementValueEl = document.getElementById('requirementValue');
  const requirementBadgeEl = document.getElementById('requirementBadge');
  const requirementNoteEl = document.getElementById('requirementNote');
  const requirementBtnEl = document.getElementById('requirementBtn');

  if (!isProfileComplete) {
    requirementValueEl.textContent = 'Profile Required';
    requirementBadgeEl.textContent = 'Locked';
    requirementBadgeEl.className = 'badge badge-locked';
    requirementNoteEl.textContent = 'Complete your student profile first before submitting mandatory CMO requirements.';
    if (requirementBtnEl) {
      requirementBtnEl.textContent = 'Complete Profile First';
      requirementBtnEl.href = 'complete-profile.html';
    }
  } else {
    switch (cmoStatus) {
      case 'incomplete':
        requirementValueEl.textContent = 'Requirements Incomplete';
        requirementBadgeEl.textContent = 'Action Needed';
        requirementBadgeEl.className = 'badge badge-incomplete';
        requirementNoteEl.textContent = 'Please submit all required CMO documents (Waiver, Medical Certificate, Parent Consent).';
        if (requirementBtnEl) {
          requirementBtnEl.textContent = 'Submit CMO Requirements';
          requirementBtnEl.href = 'cmo-requirements.html';
        }
        break;
      case 'pending_review':
        requirementValueEl.textContent = 'Under Review';
        requirementBadgeEl.textContent = 'Pending Review';
        requirementBadgeEl.className = 'badge badge-pending';
        requirementNoteEl.textContent = 'Your CMO documents have been submitted and are currently awaiting Coordinator review.';
        if (requirementBtnEl) {
          requirementBtnEl.textContent = 'View Submitted Files';
          requirementBtnEl.href = 'cmo-requirements.html';
        }
        break;
      case 'compliant':
        requirementValueEl.textContent = 'Requirements Approved';
        requirementBadgeEl.textContent = 'Compliant';
        requirementBadgeEl.className = 'badge badge-complete';
        requirementNoteEl.textContent = 'All requirements approved. You are qualified for community deployment matching.';
        if (requirementBtnEl) {
          requirementBtnEl.textContent = 'View Documents';
          requirementBtnEl.href = 'cmo-requirements.html';
        }
        break;
      case 'rejected':
        requirementValueEl.textContent = 'Requirements Needs Resubmission';
        requirementBadgeEl.textContent = 'Rejected';
        requirementBadgeEl.className = 'badge badge-incomplete';
        requirementNoteEl.textContent = 'One or more submitted documents were rejected. Please check remarks and resubmit.';
        if (requirementBtnEl) {
          requirementBtnEl.textContent = 'Resubmit Documents';
          requirementBtnEl.href = 'cmo-requirements.html';
        }
        break;
      default:
        requirementValueEl.textContent = 'Not Submitted';
        requirementBadgeEl.textContent = 'Not Submitted';
        requirementBadgeEl.className = 'badge badge-none';
        requirementNoteEl.textContent = 'Upload your necessary documents to fulfill CMO guidelines.';
        if (requirementBtnEl) {
          requirementBtnEl.textContent = 'Submit CMO Requirements';
          requirementBtnEl.href = 'cmo-requirements.html';
        }
    }
  }

  // --- 3. Deployment Status Card ---
  const deploymentValueEl = document.getElementById('deploymentValue');
  const deploymentBadgeEl = document.getElementById('deploymentBadge');
  const deploymentNoteEl = document.getElementById('deploymentNote');

  loadDeploymentStatus(user.user_id, deploymentValueEl, deploymentBadgeEl, deploymentNoteEl, isProfileComplete, cmoStatus);
}

/**
 * Fetches and populates detailed profile information.
 */
async function loadDetailedProfile(user) {
  try {
    const res = await fetch('/api/student/profile', {
      method: 'GET',
      credentials: 'include'
    });

    const fullNameEl = document.getElementById('profileFullName');
    const studentNumEl = document.getElementById('profileStudentNumber');
    const courseSectionEl = document.getElementById('profileCourseSection');
    const sidebarUserNameEl = document.getElementById('sidebarUserName');
    const sidebarAvatarEl = document.getElementById('sidebarAvatar');

    if (res.ok) {
      const data = await res.json();
      const p = data.profile || data.data?.profile;
      if (p) {
        if (fullNameEl) fullNameEl.textContent = p.full_name || 'Not specified';
        if (studentNumEl) studentNumEl.textContent = p.student_number || 'Not specified';
        if (courseSectionEl) {
          const course = p.course || '';
          const section = p.section || '';
          courseSectionEl.textContent = `${course} ${section}`.trim() || 'Not specified';
        }
        if (p.full_name && sidebarUserNameEl) {
          sidebarUserNameEl.textContent = p.full_name;
        }
        if (p.full_name && sidebarAvatarEl) {
          const names = p.full_name.trim().split(' ');
          sidebarAvatarEl.textContent = names.length > 1
            ? (names[0][0] + names[names.length - 1][0]).toUpperCase()
            : p.full_name.substring(0, 2).toUpperCase();
        }
        return;
      }
    }

    // Fallback when profile details are not yet submitted
    if (fullNameEl) fullNameEl.textContent = user.email.split('@')[0];
    if (studentNumEl) studentNumEl.textContent = 'Not specified';
    if (courseSectionEl) courseSectionEl.textContent = 'Not specified';
  } catch (err) {
    console.warn('Profile load info:', err);
  }
}

/**
 * Loads current deployment status for the student.
 */
async function loadDeploymentStatus(userId, valueEl, badgeEl, noteEl, isProfileComplete = true, cmoStatus = 'compliant') {
  try {
    const response = await fetch(`/api/nstp/deployments/student/${userId}/current`, {
      method: 'GET',
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();

      if (data.success && data.data) {
        const deployment = data.data;
        const deploymentInfo = deployment.deployment || {};
        const communityInfo = deploymentInfo.community_request || {};

        valueEl.textContent = communityInfo.activity_title || deploymentInfo.deployment_batch_name || 'Assigned to Deployment';

        switch (deployment.deployment_student_status) {
          case 'assigned':
            badgeEl.textContent = 'Assigned';
            badgeEl.className = 'badge badge-pending';
            break;
          case 'active':
            badgeEl.textContent = 'Active';
            badgeEl.className = 'badge badge-active';
            break;
          case 'completed':
            badgeEl.textContent = 'Completed';
            badgeEl.className = 'badge badge-complete';
            break;
          default:
            badgeEl.textContent = 'Assigned';
            badgeEl.className = 'badge badge-pending';
        }

        const communityName = communityInfo.community_name || 'Partner Community';
        const activityTitle = communityInfo.activity_title || deploymentInfo.deployment_batch_name || 'CWTS Community Project';
        const schedDate = formatDate(deploymentInfo.deployment_start_date);
        const locationStr = [communityInfo.barangay, communityInfo.municipality].filter(Boolean).join(', ');

        noteEl.innerHTML = `
          <strong>${escapeHtml(activityTitle)}</strong><br>
          <span>${escapeHtml(communityName)}${locationStr ? ' • ' + escapeHtml(locationStr) : ''} • ${schedDate}</span>
        `;

        const deploymentBtnEl = document.getElementById('deploymentBtn');
        if (deploymentBtnEl) {
          deploymentBtnEl.textContent = 'View Deployment & Monitoring';
          deploymentBtnEl.href = 'deployment.html';
        }
        return;
      }
    }

    if (!isProfileComplete || cmoStatus !== 'compliant') {
      valueEl.textContent = 'Locked';
      badgeEl.textContent = 'Requirements Needed';
      badgeEl.className = 'badge badge-locked';
      noteEl.textContent = 'Complete your profile and gain CMO compliance to unlock community deployment.';
      const deploymentBtnEl = document.getElementById('deploymentBtn');
      if (deploymentBtnEl) {
        deploymentBtnEl.textContent = 'Open CMO Requirements';
        deploymentBtnEl.href = 'cmo-requirements.html';
      }
      return;
    }

    // Eligible for matching but no active deployment assigned yet
    valueEl.textContent = 'Eligible for Matching';
    badgeEl.textContent = 'Available';
    badgeEl.className = 'badge badge-complete';
    noteEl.textContent = 'Your profile is active and ready. You will be notified once matched with a community project.';
    const deploymentBtnEl = document.getElementById('deploymentBtn');
    if (deploymentBtnEl) {
      deploymentBtnEl.textContent = 'View Deployment & Monitoring';
      deploymentBtnEl.href = 'deployment.html';
    }
  } catch (error) {
    console.error('Failed to load deployment status:', error);
    valueEl.textContent = 'Eligible for Matching';
    badgeEl.textContent = 'Available';
    badgeEl.className = 'badge badge-complete';
    noteEl.textContent = 'You are qualified for community deployment matching.';
  }
}

/**
 * Loads notifications from backend or displays system announcements.
 */
async function loadNotifications() {
  const notifListEl = document.getElementById('notificationsList');
  const notifCountBadge = document.getElementById('notifCountBadge');
  if (!notifListEl) return;

  try {
    const response = await fetch('/api/notifications/my-notifications', {
      method: 'GET',
      credentials: 'include'
    });

    if (response.ok) {
      const result = await response.json();
      const notifs = result.data || [];

      if (notifs.length > 0) {
        if (notifCountBadge) notifCountBadge.textContent = `${notifs.length} New`;
        notifListEl.innerHTML = notifs.map(n => `
          <div class="notif-item">
            <div class="notif-icon-circle">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
              </svg>
            </div>
            <div class="notif-content">
              <div class="notif-title">${escapeHtml(n.title || 'System Notification')}</div>
              <div class="notif-text">${escapeHtml(n.message || '')}</div>
              <div class="notif-time">${formatDate(n.created_at || new Date())}</div>
            </div>
          </div>
        `).join('');
        return;
      }
    }
  } catch (err) {
    console.warn('Notification endpoint fallback:', err);
  }

  // Default welcome announcement
  if (notifCountBadge) notifCountBadge.textContent = 'System Update';
  notifListEl.innerHTML = `
    <div class="notif-item">
      <div class="notif-icon-circle">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>
      <div class="notif-content">
        <div class="notif-title">CWTSConnect System Notice</div>
        <div class="notif-text">Welcome to your CWTSConnect Student Portal. Ensure your profile and CMO requirements are fully submitted to qualify for community deployment.</div>
        <div class="notif-time">Today</div>
      </div>
    </div>
  `;
}

if (refreshNotifsBtn) {
  refreshNotifsBtn.addEventListener('click', () => {
    loadNotifications();
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Note: Sign Out confirmation and handling is managed centrally by student-layout.js

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
});
