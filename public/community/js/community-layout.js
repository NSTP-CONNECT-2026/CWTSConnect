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
      const isRequestsSubpage = (currentPath.endsWith('create-request.html') || currentPath.endsWith('view-request.html')) && pageName === 'community-requests.html';

      if (currentPath.endsWith(pageName) || isRequestsSubpage || (pageName === 'dashboard.html' && (currentPath.endsWith('/community/') || currentPath.endsWith('/community')))) {
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

  // Unified sign out confirmation modal & handler
  function initSignOut() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      showLogoutConfirmationModal();
    });
  }

  function showLogoutConfirmationModal() {
    let modal = document.getElementById('logoutConfirmModal');

    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'logoutConfirmModal';
      modal.className = 'logout-modal-backdrop';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'logoutModalTitle');

      modal.innerHTML = `
        <div class="logout-modal-card">
          <div class="logout-modal-icon-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
            </svg>
          </div>
          <h3 class="logout-modal-title" id="logoutModalTitle">Confirm Sign Out</h3>
          <p class="logout-modal-desc">Are you sure you want to log out of your session? Any unsaved progress may be lost.</p>
          <div class="logout-modal-actions">
            <button type="button" class="logout-modal-btn logout-modal-btn-cancel" id="cancelLogoutBtn">Cancel</button>
            <button type="button" class="logout-modal-btn logout-modal-btn-confirm" id="confirmLogoutBtn">
              <span>Yes, Sign Out</span>
            </button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const cancelBtn = modal.querySelector('#cancelLogoutBtn');
      const confirmBtn = modal.querySelector('#confirmLogoutBtn');

      function closeModal() {
        modal.classList.remove('active');
        document.removeEventListener('keydown', handleKeydown);
      }

      function handleKeydown(e) {
        if (e.key === 'Escape') {
          closeModal();
        }
      }

      cancelBtn.addEventListener('click', closeModal);

      modal.addEventListener('click', function (e) {
        if (e.target === modal) {
          closeModal();
        }
      });

      confirmBtn.addEventListener('click', async function () {
        try {
          confirmBtn.disabled = true;
          confirmBtn.innerHTML = '<span>Signing Out...</span>';
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
          window.location.href = '/login.html';
        } catch (err) {
          window.location.href = '/login.html';
        }
      });
    }

    // Show modal and focus cancel button for safety
    modal.classList.add('active');
    const cancelBtn = modal.querySelector('#cancelLogoutBtn');
    if (cancelBtn) {
      setTimeout(() => cancelBtn.focus(), 60);
    }

    document.addEventListener('keydown', function handleKeydown(e) {
      if (e.key === 'Escape') {
        modal.classList.remove('active');
        document.removeEventListener('keydown', handleKeydown);
      }
    });
  }

  // Slide-Out Notification Drawer / Sidebar Handler for Community Officials (Real-Time Backend Driven)
  function initNotificationBell() {
    const notifBtn = document.getElementById('headerNotifBtn');
    if (!notifBtn) return;

    const icons = {
      request: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
      deploy: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
      eval: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
      hours: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`
    };

    function escapeHtml(text) {
      if (!text) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function formatTimeAgo(isoString) {
      if (!isoString) return 'Just now';
      const diff = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days === 1) return 'Yesterday';
      return `${days}d ago`;
    }

    function getNotificationMeta(item) {
      let iconSvg = icons.request;
      let typeLabel = 'Notice';
      let defaultUrl = 'dashboard.html';
      let defaultAction = 'View Details';

      switch (item.notification_type) {
        case 'request_approved':
          iconSvg = icons.request;
          typeLabel = 'Request Approved';
          defaultUrl = 'dashboard.html';
          defaultAction = 'View Status';
          break;
        case 'request_rejected':
          iconSvg = icons.request;
          typeLabel = 'Request Update';
          defaultUrl = 'dashboard.html';
          defaultAction = 'View Feedback';
          break;
        case 'deployment_assigned':
          iconSvg = icons.deploy;
          typeLabel = 'Deployment';
          defaultUrl = 'deployments.html';
          defaultAction = 'View Volunteers';
          break;
        case 'completion_milestone':
          iconSvg = icons.eval;
          typeLabel = 'Evaluation';
          defaultUrl = 'feedback-evaluation.html';
          defaultAction = 'View Evaluation';
          break;
        case 'attendance_verified':
        case 'hours_verified':
          iconSvg = icons.hours;
          typeLabel = 'Hours Credited';
          defaultUrl = 'attendance-hours.html';
          defaultAction = 'View Attendance';
          break;
        default:
          iconSvg = icons.request;
          typeLabel = 'System Notice';
          defaultUrl = 'dashboard.html';
          defaultAction = 'View Details';
          break;
      }

      return {
        iconSvg,
        typeLabel,
        actionUrl: item.action_url || defaultUrl,
        actionLabel: item.action_label || defaultAction
      };
    }

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
          <span class="notif-drawer-badge" id="notifDrawerCount">0 New</span>
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
        
        <!-- Skeleton Loading State -->
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

        <!-- Real Notifications List -->
        <div id="notifDrawerList" class="hidden" style="display: flex; flex-direction: column; gap: 14px;">
        </div>

      </div>

      <div class="notif-drawer-footer">
        <span class="notif-footer-text">NSTPConnect Core Real-Time Notification Feed</span>
      </div>
    `;

    async function updateUnreadBadge() {
      try {
        const res = await fetch('/api/notifications/unread-count');
        if (!res.ok) return;
        const json = await res.json();
        const count = json.data?.unread_count || 0;
        const headerDot = document.getElementById('headerNotifDot');
        if (headerDot) {
          headerDot.style.display = count > 0 ? 'block' : 'none';
        }
        const drawerBadge = document.getElementById('notifDrawerCount');
        if (drawerBadge) {
          drawerBadge.textContent = `${count} New`;
        }
      } catch (err) {
        // Suppress background poll errors
      }
    }

    async function markSingleAsRead(notifId, cardEl) {
      try {
        if (cardEl) {
          cardEl.classList.remove('unread');
          const dot = cardEl.querySelector('.notif-unread-dot');
          if (dot) dot.remove();
        }
        await fetch(`/api/notifications/${notifId}/read`, { method: 'PUT' });
        updateUnreadBadge();
      } catch (err) {
        console.warn('Failed to mark notification as read:', err.message);
      }
    }

    async function loadNotifications() {
      const skeletonEl = document.getElementById('notifDrawerSkeleton');
      const listEl = document.getElementById('notifDrawerList');
      if (skeletonEl) skeletonEl.style.display = 'flex';
      if (listEl) {
        listEl.classList.add('hidden');
        listEl.innerHTML = '';
      }

      try {
        const res = await fetch('/api/notifications/my-notifications?limit=25');
        if (!res.ok) throw new Error('Failed to load notifications');
        const json = await res.json();
        const items = (json.data && Array.isArray(json.data)) ? json.data : [];

        const unreadCount = items.filter(n => !n.is_read).length;
        const drawerBadge = document.getElementById('notifDrawerCount');
        if (drawerBadge) drawerBadge.textContent = `${unreadCount} New`;
        const headerDot = document.getElementById('headerNotifDot');
        if (headerDot) headerDot.style.display = unreadCount > 0 ? 'block' : 'none';

        if (skeletonEl) skeletonEl.style.display = 'none';
        if (listEl) {
          listEl.classList.remove('hidden');

          if (items.length === 0) {
            listEl.innerHTML = `
              <div style="text-align: center; padding: 48px 20px; color: #64748b;">
                <div class="notif-icon-well" style="margin: 0 auto 12px; width: 44px; height: 44px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                </div>
                <div style="font-weight: 700; font-size: 0.95rem; color: #0B3D2E; margin-bottom: 4px;">No notifications yet</div>
                <div style="font-size: 0.8125rem; color: #64748b; line-height: 1.45;">Core updates for request reviews, deployments, and attendance will appear here.</div>
              </div>
            `;
            return;
          }

          listEl.innerHTML = items.map(item => {
            const meta = getNotificationMeta(item);
            const timeAgo = formatTimeAgo(item.created_at);
            const isUnread = !item.is_read;
            return `
              <div class="notif-item-card ${isUnread ? 'unread' : ''}" data-id="${item.notification_id}">
                <div class="notif-item-top">
                  <div class="notif-meta-left">
                    <div class="notif-icon-well">${meta.iconSvg}</div>
                    <span class="notif-type-pill">${meta.typeLabel}</span>
                  </div>
                  <span class="notif-time-ago">
                    ${isUnread ? '<span class="notif-unread-dot"></span>' : ''}
                    ${timeAgo}
                  </span>
                </div>
                <div class="notif-item-title">${escapeHtml(item.title || 'Notification')}</div>
                <div class="notif-item-msg">${escapeHtml(item.message || '')}</div>
                <a href="${meta.actionUrl}" class="notif-action-btn" data-notif-id="${item.notification_id}">
                  <span>${meta.actionLabel}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </a>
              </div>
            `;
          }).join('');

          listEl.querySelectorAll('.notif-item-card').forEach(card => {
            const notifId = card.getAttribute('data-id');
            const actionLink = card.querySelector('.notif-action-btn');

            card.addEventListener('click', function (e) {
              if (card.classList.contains('unread') && notifId) {
                markSingleAsRead(notifId, card);
              }
            });

            if (actionLink) {
              actionLink.addEventListener('click', function () {
                if (card.classList.contains('unread') && notifId) {
                  markSingleAsRead(notifId, card);
                }
              });
            }
          });
        }
      } catch (err) {
        if (skeletonEl) skeletonEl.style.display = 'none';
        if (listEl) {
          listEl.classList.remove('hidden');
          listEl.innerHTML = `
            <div style="text-align: center; padding: 32px 16px; color: #64748b; font-size: 0.85rem;">
              No notifications available at the moment.
            </div>
          `;
        }
      }
    }

    function openDrawer() {
      drawer.style.display = 'flex';
      drawer.classList.add('open', 'active');
      overlay.classList.add('active');
      loadNotifications();
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
      markReadBtn.addEventListener('click', async function () {
        const listEl = document.getElementById('notifDrawerList');
        if (listEl) {
          listEl.querySelectorAll('.notif-item-card.unread').forEach(el => el.classList.remove('unread'));
          listEl.querySelectorAll('.notif-unread-dot').forEach(el => el.remove());
        }
        const countBadge = document.getElementById('notifDrawerCount');
        if (countBadge) countBadge.textContent = '0 New';
        const headerDot = document.getElementById('headerNotifDot');
        if (headerDot) headerDot.style.display = 'none';

        try {
          await fetch('/api/notifications/mark-all-read', { method: 'PUT' });
        } catch (e) {
          console.warn('mark-all-read warning:', e.message);
        }
      });
    }

    // Initial check for unread count dot
    updateUnreadBadge();
  }

})();
