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

  // Notification bell click
  function initNotificationBell() {
    const notifBtn = document.getElementById('headerNotifBtn');
    if (!notifBtn) return;

    notifBtn.addEventListener('click', function () {
      const notifCard = document.getElementById('notificationsCard');
      if (notifCard) {
        notifCard.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.location.href = 'dashboard.html';
      }
    });
  }

})();
