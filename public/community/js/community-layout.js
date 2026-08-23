/**
 * CWTSConnect — Community Official Shared Layout Controller
 * Manages:
 *  - Mobile navigation drawer
 *  - Active page tab indicators
 *  - Centralized sign-out and notification triggers
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    initMobileNavigation();
    initSignOut();
    initNotificationBell();
    highlightCurrentPage();
  });

  // Highlight active sidebar item based on current URL path
  function highlightCurrentPage() {
    const currentPath = window.location.pathname.toLowerCase();
    const navItems = document.querySelectorAll('.sidebar-nav .sidebar-item');

    navItems.forEach(function (item) {
      const href = (item.getAttribute('href') || '').toLowerCase();
      if (!href) return;

      const pageName = href.split('/').pop();
      if (currentPath.endsWith(pageName) || (pageName === 'dashboard.html' && (currentPath.endsWith('/community/') || currentPath.endsWith('/community')))) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
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

  // Slide-Out Notification Drawer / Sidebar Handler for Community Officials (Strict Neumorphism Design)
  function initNotificationBell() {
    const notifBtn = document.getElementById('headerNotifBtn');
    if (!notifBtn) return;

    const icons = {
      request: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
      deploy: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`
    };

    const notifs = [
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
        <span class="notif-role-tag">Community Official Notices</span>
        <button class="notif-mark-read-btn" id="notifMarkAllReadBtn" type="button">Mark all as read</button>
      </div>

      <div class="notif-drawer-body">
        
        <!-- Section 12 Skeleton Loading State -->
        <div class="notif-skeleton-wrap" id="notifDrawerSkeleton">
          ${[1, 2].map(() => `
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
