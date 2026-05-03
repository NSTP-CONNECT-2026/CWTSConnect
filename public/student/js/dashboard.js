// dashboard.js — Loads student data and handles dashboard UI

const logoutBtn = document.getElementById('logoutBtn');

/**
 * Fetches the current logged-in student's data from the server.
 * If not logged in or not a student, redirects to login.
 */
async function loadDashboard() {
  try {
    const response = await fetch('/api/student/me', {
      method: 'GET',
      credentials: 'include'
    });

    // If not authenticated, redirect to login
    if (response.status === 401 || response.status === 403) {
      window.location.href = '/student/login.html';
      return;
    }

    const data = await response.json();

    if (!data.success || !data.user) {
      window.location.href = '/student/login.html';
      return;
    }

    renderDashboard(data.user);
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    window.location.href = '/student/login.html';
  }
}

/**
 * Populates all dashboard elements with student data.
 * @param {object} user - The user object from the API
 */
function renderDashboard(user) {
  const isProfileComplete = user.profile_status === 'complete';
  const cmoStatus = user.cmo_compliance_status || 'incomplete';

  // Update topbar email
  document.getElementById('topbarEmail').textContent = user.email;

  // Update welcome message
  document.getElementById('welcomeHeading').textContent = `Welcome back, ${user.email.split('@')[0]}.`;
  document.getElementById('welcomeSub').textContent = 'Here is an overview of your NSTP deployment status.';

  // Show incomplete profile banner if needed
  if (!isProfileComplete) {
    document.getElementById('profileBanner').style.display = 'flex';
  }

  // --- Card 1: Profile Status ---
  const profileValueEl = document.getElementById('profileStatusValue');
  const profileBadgeEl = document.getElementById('profileBadge');
  const profileActionEl = document.getElementById('profileAction');

  if (isProfileComplete) {
    profileValueEl.textContent = 'Profile Complete';
    profileBadgeEl.textContent = 'Complete';
    profileBadgeEl.className = 'badge badge-complete';
    // Update action to view profile
    profileActionEl.innerHTML = '<a href="profile.html" class="brutal-btn brutal-btn-secondary" style="font-size:0.75rem; padding:8px 14px; min-width: auto;">View Profile</a>';
    profileActionEl.style.display = 'block';
  } else {
    profileValueEl.textContent = 'Profile Incomplete';
    profileBadgeEl.textContent = 'Incomplete';
    profileBadgeEl.className = 'badge badge-incomplete';
    // Update action to complete profile
    profileActionEl.innerHTML = '<a href="complete-profile.html" class="brutal-btn brutal-btn-primary" style="font-size:0.75rem; padding:8px 14px; min-width: auto;">Complete Profile</a>';
    profileActionEl.style.display = 'block';
  }
  profileBadgeEl.style.display = 'inline-block';

  // --- Card 2: CMO Requirements Status ---
  const requirementValueEl = document.getElementById('requirementValue');
  const requirementBadgeEl = document.getElementById('requirementBadge');
  const requirementNoteEl = document.getElementById('requirementNote');
  const requirementCard = document.getElementById('requirementCard');

  if (!isProfileComplete) {
    requirementValueEl.textContent = 'Locked';
    requirementBadgeEl.textContent = 'Profile Required';
    requirementBadgeEl.className = 'badge badge-locked';
    requirementNoteEl.textContent = 'Complete your profile first before submitting requirements.';
    requirementCard.classList.add('locked');
  } else {
    // Update based on CMO compliance status
    switch (cmoStatus) {
      case 'incomplete':
        requirementValueEl.textContent = 'Requirements Needed';
        requirementBadgeEl.textContent = 'Incomplete';
        requirementBadgeEl.className = 'badge badge-incomplete';
        requirementNoteEl.innerHTML = '<a href="cmo-requirements.html" class="brutal-btn brutal-btn-primary" style="font-size:0.75rem; padding:6px 12px; min-width: auto;">Submit CMO Requirements</a>';
        break;
      case 'pending_review':
        requirementValueEl.textContent = 'Under Review';
        requirementBadgeEl.textContent = 'Pending Review';
        requirementBadgeEl.className = 'badge badge-pending';
        requirementNoteEl.innerHTML = 'Your requirements are under review. <a href="cmo-requirements.html" style="color: var(--bg-accent); text-decoration: none;">View Status</a>';
        break;
      case 'compliant':
        requirementValueEl.textContent = 'Requirements Approved';
        requirementBadgeEl.textContent = 'Approved';
        requirementBadgeEl.className = 'badge badge-complete';
        requirementNoteEl.textContent = 'Your CMO requirements are approved. You are eligible for deployment matching.';
        break;
      case 'rejected':
        requirementValueEl.textContent = 'Requirements Rejected';
        requirementBadgeEl.textContent = 'Rejected';
        requirementBadgeEl.className = 'badge badge-locked';
        requirementNoteEl.innerHTML = 'Some requirements were rejected. <a href="cmo-requirements.html" class="brutal-btn brutal-btn-primary" style="font-size:0.75rem; padding:6px 12px; min-width: auto;">Resubmit Documents</a>';
        break;
      default:
        requirementValueEl.textContent = 'Not Submitted';
        requirementBadgeEl.textContent = 'Not Submitted';
        requirementBadgeEl.className = 'badge badge-none';
        requirementNoteEl.innerHTML = '<a href="cmo-requirements.html" class="brutal-btn brutal-btn-primary" style="font-size:0.75rem; padding:6px 12px; min-width: auto;">Submit CMO Requirements</a>';
    }
  }
  requirementBadgeEl.style.display = 'inline-block';

  // --- Card 3: Deployment Status ---
  const deploymentValueEl = document.getElementById('deploymentValue');
  const deploymentBadgeEl = document.getElementById('deploymentBadge');
  const deploymentNoteEl = document.getElementById('deploymentNote');
  const deploymentCard = document.getElementById('deploymentCard');

  if (!isProfileComplete || cmoStatus !== 'compliant') {
    deploymentValueEl.textContent = 'Locked';
    deploymentBadgeEl.textContent = 'Requirements Needed';
    deploymentBadgeEl.className = 'badge badge-locked';
    deploymentNoteEl.textContent = 'Complete your profile and CMO requirements to access deployment matching.';
    deploymentCard.classList.add('locked');
  } else {
    deploymentValueEl.textContent = 'Not Assigned';
    deploymentBadgeEl.textContent = 'Available';
    deploymentBadgeEl.className = 'badge badge-none';
    deploymentNoteEl.textContent = 'You are eligible for deployment matching.';
  }
  deploymentBadgeEl.style.display = 'inline-block';

  // --- Card 4: Notifications ---
  const notificationTextEl = document.getElementById('notificationText');
  notificationTextEl.textContent = 'No new notifications at this time.';
}

// Logout button handler
logoutBtn.addEventListener('click', async function () {
  logoutBtn.disabled = true;
  logoutBtn.classList.add('loading');

  try {
    const response = await fetch('/api/student/logout', {
      method: 'POST',
      credentials: 'include'
    });

    const data = await response.json();

    if (data.success) {
      window.location.href = '/student/login.html';
    } else {
      alert('Logout failed. Please try again.');
      logoutBtn.disabled = false;
      logoutBtn.classList.remove('loading');
    }
  } catch (error) {
    alert('Unable to connect to the server. Please try again.');
    logoutBtn.disabled = false;
    logoutBtn.classList.remove('loading');
  }
});

// Run on page load
loadDashboard();
