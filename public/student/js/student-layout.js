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

  document.addEventListener('DOMContentLoaded', function () {
    initMobileNavigation();
    initSignOut();
    initNotificationBell();
    highlightCurrentPage();
    setupSmoothNavigation();
  });

  // Highlight active sidebar item
  function highlightCurrentPage() {
    const currentPath = window.location.pathname.toLowerCase();
    const navItems = document.querySelectorAll('.sidebar-nav .sidebar-item');

    navItems.forEach(function (item) {
      const href = (item.getAttribute('href') || '').toLowerCase();
      if (!href) return;

      const pageName = href.split('/').pop();
      if (currentPath.endsWith(pageName) || (pageName === 'dashboard.html' && (currentPath.endsWith('/') || currentPath.endsWith('/student') || currentPath.endsWith('/community') || currentPath.endsWith('/nstp')))) {
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
