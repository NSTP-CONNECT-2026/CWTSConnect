/**
 * CWTSConnect — Shared Student Portal Layout Controller
 * Manages:
 *  - Fixed persistent Sidebar & Header design tokens
 *  - Active page tab indicators
 *  - Section 12 Skeleton Loaders during page loading & data fetching
 *  - Mobile navigation drawer
 *  - Centralized sign-out and notification triggers
 */

(function () {
  'use strict';

  function initLayout() {
    standardizeSidebarNavigation();
    initMobileNavigation();
    initSignOut();
    initNotificationBell();
    highlightCurrentPage();
    setupSmoothNavigation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLayout);
  } else {
    initLayout();
  }

  // Automatically standardizes sidebar navigation across all pages of each portal
  function standardizeSidebarNavigation() {
    const sidebarNav = document.querySelector('aside.sidebar nav.sidebar-nav');
    if (!sidebarNav) return;

    const currentPath = window.location.pathname.toLowerCase();

    if (currentPath.includes('/nstp/')) {
      sidebarNav.innerHTML = `
        <div class="sidebar-section">
          <div class="sidebar-section-title">Main</div>
          
          <a href="dashboard.html" class="sidebar-item">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                <rect x="3" y="14" width="7" height="7" rx="1"></rect>
              </svg>
            </span>
            <span>Dashboard</span>
          </a>

          <a href="user-management.html" class="sidebar-item">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </span>
            <span>User Management</span>
          </a>

          <a href="community-requests.html" class="sidebar-item">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </span>
            <span>Community Requests</span>
          </a>

          <a href="dss-matching.html" class="sidebar-item">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="6"></circle>
                <circle cx="12" cy="12" r="2"></circle>
              </svg>
            </span>
            <span>DSS Matching</span>
          </a>

          <a href="deployment-management.html" class="sidebar-item">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </span>
            <span>Deployments</span>
          </a>
        </div>

        <div class="sidebar-section">
          <div class="sidebar-section-title">Monitoring</div>

          <a href="attendance-management.html" class="sidebar-item">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <polyline points="9 11 12 14 22 4"></polyline>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
            </span>
            <span>Attendance Logs</span>
          </a>

          <a href="rendered-hours.html" class="sidebar-item">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </span>
            <span>Rendered Hours</span>
          </a>

          <a href="feedback-evaluation.html" class="sidebar-item">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </span>
            <span>Feedback & Evaluation</span>
          </a>
        </div>

        <div class="sidebar-section">
          <div class="sidebar-section-title">Reports & Management</div>

          <a href="report-generation.html" class="sidebar-item">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <path d="M6 9V2h12v7"></path>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8" rx="1"></rect>
              </svg>
            </span>
            <span>Report Generation</span>
          </a>

          <a href="requirement-compliance.html" class="sidebar-item">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              </svg>
            </span>
            <span>CMO Compliance</span>
          </a>
        </div>
      `;
    } else if (currentPath.includes('/student/')) {
      const isEditProfile = currentPath.includes('edit-profile.html');
      const profileHref = isEditProfile ? 'edit-profile.html' : 'complete-profile.html';

      sidebarNav.innerHTML = `
        <div class="sidebar-section">
          <div class="sidebar-section-title">Main</div>
          
          <a href="dashboard.html" class="sidebar-item">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                <rect x="3" y="14" width="7" height="7" rx="1"></rect>
              </svg>
            </span>
            <span>Dashboard</span>
          </a>

          <a href="${profileHref}" class="sidebar-item" id="profileNavLink">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </span>
            <span id="profileNavLabel">My Profile</span>
          </a>

          <a href="cmo-requirements.html" class="sidebar-item">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </span>
            <span>CMO Requirements</span>
          </a>
        </div>

        <div class="sidebar-section">
          <div class="sidebar-section-title">Monitoring</div>

          <a href="deployment.html" class="sidebar-item">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </span>
            <span>Deployment & Monitoring</span>
          </a>

          <a href="feedback-evaluation.html" class="sidebar-item">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </span>
            <span>Feedback & Evaluation</span>
          </a>
        </div>
      `;
    } else if (currentPath.includes('/community/')) {
      sidebarNav.innerHTML = `
        <div class="sidebar-section">
          <div class="sidebar-section-title">Main</div>
          
          <a href="dashboard.html" class="sidebar-item">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                <rect x="3" y="14" width="7" height="7" rx="1"></rect>
              </svg>
            </span>
            <span>Dashboard</span>
          </a>

          <a href="community-requests.html" class="sidebar-item">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
            </span>
            <span>Community Requests</span>
          </a>

          <a href="create-request.html" class="sidebar-item">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
            </span>
            <span>Create New Request</span>
          </a>
        </div>

        <div class="sidebar-section">
          <div class="sidebar-section-title">Monitoring</div>

          <a href="deployments.html" class="sidebar-item">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 17 12 22 22 17"></polyline>
                <polyline points="2 12 12 17 22 12"></polyline>
              </svg>
            </span>
            <span>Deployment & Monitoring</span>
          </a>

          <a href="attendance-hours.html" class="sidebar-item">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </span>
            <span>Attendance & Hours</span>
          </a>

          <a href="feedback-evaluation.html" class="sidebar-item">
            <span class="sidebar-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </span>
            <span>Feedback & Evaluation</span>
          </a>
        </div>
      `;
    }
  }

  // Highlight active sidebar item
  function highlightCurrentPage() {
    const currentPath = window.location.pathname.toLowerCase();
    const navItems = document.querySelectorAll('.sidebar-nav .sidebar-item');
    const isProfilePage = currentPath.includes('complete-profile.html') || currentPath.includes('edit-profile.html');

    navItems.forEach(function (item) {
      const href = (item.getAttribute('href') || '').toLowerCase();
      if (!href) return;

      const pageName = href.split('/').pop();
      const isMatchingProfile = isProfilePage && (item.id === 'profileNavLink' || pageName.includes('profile'));

      if (
        currentPath.endsWith(pageName) ||
        isMatchingProfile ||
        (pageName === 'dashboard.html' && (currentPath.endsWith('/') || currentPath.endsWith('/student') || currentPath.endsWith('/community') || currentPath.endsWith('/nstp')))
      ) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  // Smooth Navigation: Updates sidebar active state immediately and displays skeleton before navigating
  function setupSmoothNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-nav a, a.quick-card, a.action-tile');

    navLinks.forEach(function (link) {
      link.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

        // Immediately highlight clicked sidebar item
        document.querySelectorAll('.sidebar-nav .sidebar-item').forEach(el => el.classList.remove('active'));
        const matchingSidebarItem = Array.from(document.querySelectorAll('.sidebar-nav .sidebar-item')).find(item => {
          const itemHref = item.getAttribute('href') || '';
          return itemHref === href || itemHref.endsWith(href);
        });
        if (matchingSidebarItem) {
          matchingSidebarItem.classList.add('active');
        }

        // Close mobile drawer if open
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');
        if (sidebar) sidebar.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('active');
      });
    });
  }

  // Mobile navigation drawer toggle
  function initMobileNavigation() {
    const toggleBtn = document.getElementById('mobileMenuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');

    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', function () {
        sidebar.classList.toggle('mobile-open');
        if (overlay) overlay.classList.toggle('active');
      });
    }

    if (overlay && sidebar) {
      overlay.addEventListener('click', function () {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('active');
      });
    }
  }

  // Unified sign out handler
  function initSignOut() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async function () {
      try {
        logoutBtn.disabled = true;
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login.html';
      } catch (err) {
        window.location.href = '/login.html';
      }
    });
  }

  // Slide-Out Notification Drawer / Sidebar Handler (Strict Neumorphism Design)
  function initNotificationBell() {
    const notifBtn = document.getElementById('headerNotifBtn');
    if (!notifBtn) return;

    // Detect portal
    const path = window.location.pathname.toLowerCase();
    let portalType = 'student';
    let roleLabel = 'Student Volunteer Alerts';
    let notifs = [];

    // SVG Stroke Icons
    const icons = {
      cmo: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
      deploy: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
      eval: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
      request: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
      dss: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`
    };

    if (path.includes('/community/')) {
      portalType = 'community';
      roleLabel = 'Community Official Notices';
      notifs = [
        {
          id: 'notif-c1',
          iconSvg: icons.request,
          typeLabel: 'Request Decision',
          title: 'Community Request Approved: REQ-2026-001',
          message: 'The NSTP Coordinator has approved your project proposal for Community Literacy & Tutoring. It is now queued for DSS student matching.',
          time: '25m ago',
          unread: true,
          actionUrl: 'dashboard.html',
          actionText: 'View Request Status'
        },
        {
          id: 'notif-c2',
          iconSvg: icons.deploy,
          typeLabel: 'Deployment',
          title: '3 Student Volunteers Deployed',
          message: '3 CWTS student volunteers have been matched and deployed to your Barangay for the Literacy Program starting this Saturday.',
          time: '3h ago',
          unread: true,
          actionUrl: 'attendance-hours.html',
          actionText: 'View Assigned Volunteers'
        }
      ];
    } else if (path.includes('/nstp/')) {
      portalType = 'nstp';
      roleLabel = 'Coordinator Live Alerts';
      notifs = [
        {
          id: 'notif-n1',
          iconSvg: icons.request,
          typeLabel: 'Community Request',
          title: 'New Activity Request: Barangay Bagong Silang',
          message: 'Hon. Marites Santos submitted a new project proposal for Tree Planting & Urban Greening awaiting coordinator review.',
          time: '10m ago',
          unread: true,
          actionUrl: 'community-requests.html',
          actionText: 'Review Request'
        },
        {
          id: 'notif-n2',
          iconSvg: icons.cmo,
          typeLabel: 'CMO Compliance',
          title: '12 Student CMO Documents Pending Verification',
          message: 'New medical clearance certificates and parent waivers uploaded by BSIT and BSBA students are waiting for your review.',
          time: '1h ago',
          unread: true,
          actionUrl: 'requirement-compliance.html',
          actionText: 'Verify Requirements'
        },
        {
          id: 'notif-n3',
          iconSvg: icons.dss,
          typeLabel: 'DSS Matching',
          title: 'DSS Algorithm Matching Ready',
          message: 'Approved Request REQ-2026-001 has 12 eligible compliant student candidates ready for algorithm allocation.',
          time: '3h ago',
          unread: false,
          actionUrl: 'dss-matching.html',
          actionText: 'Run DSS Matching'
        }
      ];
    } else {
      // Student
      portalType = 'student';
      roleLabel = 'Student Volunteer Alerts';
      notifs = [
        {
          id: 'notif-s1',
          iconSvg: icons.cmo,
          typeLabel: 'CMO Compliance',
          title: 'Medical Clearance & Consent Verified',
          message: 'The NSTP Coordinator has verified your submitted CMO Medical Certificate and Parent Consent Form. You are now fully compliant.',
          time: '15m ago',
          unread: true,
          actionUrl: 'cmo-requirements.html',
          actionText: 'View CMO Requirements'
        },
        {
          id: 'notif-s2',
          iconSvg: icons.deploy,
          typeLabel: 'Deployment',
          title: 'Deployment Assignment: Barangay 174',
          message: 'You have been deployed to Barangay 174, Zone 15 for the Community Literacy & Tutoring Project. Schedule: Saturdays, 8:00 AM – 12:00 PM.',
          time: '2h ago',
          unread: true,
          actionUrl: 'deployment.html',
          actionText: 'View Deployment Details'
        },
        {
          id: 'notif-s3',
          iconSvg: icons.eval,
          typeLabel: 'Evaluation',
          title: 'Community Performance Evaluation Received',
          message: 'Barangay 174 supervisor Hon. Roberto Gomez submitted your official performance rating (5.0 Stars) and Outstanding evaluation score.',
          time: '1d ago',
          unread: false,
          actionUrl: 'feedback-evaluation.html',
          actionText: 'View Performance Evaluation'
        }
      ];
    }

    // Build Drawer HTML
    let overlay = document.getElementById('notifDrawerOverlay');
    let drawer = document.getElementById('notifDrawer');

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'notifDrawerOverlay';
      overlay.className = 'notif-drawer-overlay';
      document.body.appendChild(overlay);
    }

    if (!drawer) {
      drawer = document.createElement('aside');
      drawer.id = 'notifDrawer';
      drawer.className = 'notif-drawer';
      document.body.appendChild(drawer);
    }

    const unreadCount = notifs.filter(n => n.unread).length;

    // Header notification red dot visibility
    const headerDot = document.getElementById('headerNotifDot');
    if (headerDot) {
      headerDot.style.display = unreadCount > 0 ? 'block' : 'none';
    }

    drawer.innerHTML = `
      <div class="notif-drawer-header">
        <div class="notif-drawer-title-wrap">
          <div class="notif-header-icon-well">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          <span class="notif-drawer-title">Notifications</span>
          <span class="notif-drawer-badge" id="notifDrawerCount">${unreadCount} New</span>
        </div>
        <button class="notif-drawer-close" id="notifDrawerCloseBtn" type="button" aria-label="Close Notifications">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="notif-drawer-subheader">
        <span class="notif-role-tag">${roleLabel}</span>
        <button class="notif-mark-read-btn" id="notifMarkAllReadBtn" type="button">Mark all as read</button>
      </div>

      <div class="notif-drawer-body">
        
        <!-- Section 12 Skeleton Loading State -->
        <div class="notif-skeleton-wrap" id="notifDrawerSkeleton">
          ${[1, 2, 3].map(() => `
            <div class="notif-skeleton-card">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <div class="skeleton skeleton-icon" style="width: 32px; height: 32px; border-radius: 8px;"></div>
                  <div class="skeleton skeleton-badge" style="width: 75px; height: 18px; border-radius: 4px;"></div>
                </div>
                <div class="skeleton skeleton-text" style="width: 45px; height: 12px;"></div>
              </div>
              <div class="skeleton skeleton-title" style="width: 75%; height: 15px; margin-top: 4px;"></div>
              <div class="skeleton skeleton-text" style="width: 100%; height: 12px;"></div>
              <div class="skeleton skeleton-text" style="width: 85%; height: 12px;"></div>
              <div class="skeleton skeleton-btn" style="width: 130px; height: 26px; border-radius: 8px; margin-top: 4px;"></div>
            </div>
          `).join('')}
        </div>

        <!-- Real Notifications List (Pure Neumorphism — NO colored card borders) -->
        <div id="notifDrawerList" class="hidden" style="display: flex; flex-direction: column; gap: 14px;">
          ${notifs.map(item => `
            <div class="notif-item-card ${item.unread ? 'unread' : ''}" id="${item.id}">
              <div class="notif-item-top">
                <div class="notif-meta-left">
                  <div class="notif-icon-well">${item.iconSvg}</div>
                  <span class="notif-type-pill">${item.typeLabel}</span>
                </div>
                <span class="notif-time-ago">
                  ${item.unread ? '<span class="notif-unread-dot"></span>' : ''}
                  ${item.time}
                </span>
              </div>
              <div class="notif-item-title">${item.title}</div>
              <div class="notif-item-msg">${item.message}</div>
              <a href="${item.actionUrl}" class="notif-action-btn">
                <span>${item.actionText}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </a>
            </div>
          `).join('')}
        </div>

      </div>

      <div class="notif-drawer-footer">
        <span class="notif-footer-text">CWTSConnect Core Real-Time Notification Feed</span>
      </div>
    `;

    function openDrawer() {
      drawer.style.display = 'flex';
      drawer.classList.add('open', 'active');
      overlay.classList.add('active');

      const skeletonEl = document.getElementById('notifDrawerSkeleton');
      const listEl = document.getElementById('notifDrawerList');

      if (skeletonEl && listEl) {
        skeletonEl.style.display = 'flex';
        listEl.classList.add('hidden');

        setTimeout(function () {
          skeletonEl.style.display = 'none';
          listEl.classList.remove('hidden');
        }, 350);
      }
    }

    function closeDrawer() {
      drawer.classList.remove('open', 'active');
      overlay.classList.remove('active');
    }

    if (notifBtn) {
      notifBtn.addEventListener('click', function (e) {
        e.preventDefault();
        openDrawer();
      });
    }

    const closeBtn = document.getElementById('notifDrawerCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);

    const markReadBtn = document.getElementById('notifMarkAllReadBtn');
    if (markReadBtn) {
      markReadBtn.addEventListener('click', function () {
        document.querySelectorAll('.notif-item-card.unread').forEach(el => el.classList.remove('unread'));
        document.querySelectorAll('.notif-unread-dot').forEach(el => el.remove());
        const countBadge = document.getElementById('notifDrawerCount');
        if (countBadge) countBadge.textContent = '0 New';
        if (headerDot) headerDot.style.display = 'none';
      });
    }
  }

})();

