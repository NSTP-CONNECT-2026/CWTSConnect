/**
 * CWTSConnect — NSTP Coordinator Deployment Details Controller
 */

(function () {
  'use strict';

  const urlParams = new URLSearchParams(window.location.search);
  const deploymentId = urlParams.get('id');

  let deploymentData = null;

  document.addEventListener('DOMContentLoaded', initializePage);

  async function initializePage() {
    if (!deploymentId) {
      showToast('No deployment ID specified.', 'error');
      setTimeout(() => {
        window.location.href = 'deployment-management.html';
      }, 1500);
      return;
    }

    showLoading();
    try {
      await loadDeploymentDetails(deploymentId);
    } catch (err) {
      console.error('Error loading deployment details:', err);
      showToast('Failed to load deployment details.', 'error');
    } finally {
      hideLoading();
    }
  }

  function showLoading() {
    const skeleton = document.getElementById('deploymentDetailsSkeleton');
    const content = document.getElementById('deploymentDetailsContent');
    if (skeleton) skeleton.style.display = 'block';
    if (content) content.classList.add('hidden');
  }

  function hideLoading() {
    const skeleton = document.getElementById('deploymentDetailsSkeleton');
    const content = document.getElementById('deploymentDetailsContent');
    if (skeleton) skeleton.style.display = 'none';
    if (content) content.classList.remove('hidden');
  }

  async function loadDeploymentDetails(id) {
    try {
      const res = await fetch(`/api/nstp/deployments/${encodeURIComponent(id)}`);
      const result = await res.json();

      if (result.success && result.data) {
        deploymentData = result.data;
        renderHeroCard(deploymentData);
        renderStudentsTable(deploymentData.students || []);
        renderStatusControls(deploymentData.deployment_status);
      } else {
        throw new Error(result.message || 'Deployment not found');
      }
    } catch (err) {
      console.error('Fetch deployment error:', err);
      showToast(err.message || 'Error loading deployment.', 'error');
    }
  }

  function renderHeroCard(dep) {
    const container = document.getElementById('deploymentHeroContainer');
    if (!container) return;

    const startDate = dep.deployment_start_date || 'N/A';
    const endDate = dep.deployment_end_date || 'N/A';
    const status = dep.deployment_status || 'pending';
    const statusBadge = getStatusBadge(status);
    const studentCount = (dep.students || []).length;
    const barangayText = dep.barangay ? `Brgy. ${dep.barangay}` : 'Barangay Community';
    const muniText = dep.municipality ? `, ${dep.municipality}` : '';

    container.innerHTML = `
      <div class="deployment-hero-card">
        <div class="deployment-hero-header">
          <div>
            <div class="deployment-hero-title">${escapeHtml(dep.activity_title || dep.deployment_batch_name)}</div>
            <div class="deployment-hero-subtitle">${escapeHtml(barangayText)}${escapeHtml(muniText)} • Batch: ${escapeHtml(dep.deployment_batch_name)}</div>
          </div>
          <div>${statusBadge}</div>
        </div>

        <div class="deployment-details-grid">
          <div class="detail-item-box">
            <span class="detail-item-label">Activity Type</span>
            <span class="detail-item-value">${escapeHtml(dep.activity_type || 'CWTS Community Service')}</span>
          </div>
          <div class="detail-item-box">
            <span class="detail-item-label">Deployment Schedule</span>
            <span class="detail-item-value">${escapeHtml(startDate)} to ${escapeHtml(endDate)}</span>
          </div>
          <div class="detail-item-box">
            <span class="detail-item-label">Total Assigned Volunteers</span>
            <span class="detail-item-value highlight">${studentCount} Student(s)</span>
          </div>
        </div>

        ${dep.notes ? `
          <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(226, 232, 240, 0.8); font-size: 0.875rem; color: var(--text-main);">
            <strong style="color: var(--cwts-primary-dark);">Coordinator Notes:</strong> ${escapeHtml(dep.notes)}
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderStudentsTable(students) {
    const tbody = document.getElementById('studentsTableBody');
    const badge = document.getElementById('studentsTotalBadge');
    if (badge) badge.textContent = `${students.length} Student${students.length === 1 ? '' : 's'}`;

    if (!tbody) return;

    if (!students || students.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">
            No student volunteers assigned to this deployment batch yet.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = students.map(s => {
      const hours = Number(s.hours_rendered || s.total_hours_rendered || 0).toFixed(1);
      const assignedDate = s.assigned_at ? s.assigned_at.split('T')[0] : '---';
      const stStatus = s.deployment_student_status || 'assigned';

      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--cwts-primary-dark, #0B3D2E); font-size: 0.9375rem;">${escapeHtml(s.full_name || s.name || 'Student Volunteer')}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(s.student_number || '')}</div>
          </td>
          <td>
            <div style="font-weight: 600; font-size: 0.875rem;">${escapeHtml(s.course || 'BSIT')}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Sec ${escapeHtml(s.section || '1')} (Yr ${escapeHtml(s.year_level || '1')})</div>
          </td>
          <td style="font-size: 0.875rem;">
            ${escapeHtml(s.contact_number || s.phone_number || '---')}
          </td>
          <td>
            <span style="font-weight: 800; color: var(--cwts-primary-dark); font-size: 0.95rem;">${hours} hrs</span>
          </td>
          <td style="font-size: 0.8125rem;">${escapeHtml(assignedDate)}</td>
          <td>
            <span class="badge ${stStatus === 'active' || stStatus === 'assigned' ? 'badge-verified' : 'badge-pending'}">
              ${escapeHtml(stStatus.toUpperCase())}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderStatusControls(status) {
    const group = document.getElementById('statusControlGroup');
    if (!group) return;

    if (status === 'pending') {
      group.innerHTML = `
        <button type="button" class="btn btn-primary btn-sm" id="btnActivate">
          Activate Deployment
        </button>
        <button type="button" class="btn btn-secondary btn-sm" id="btnCancel" style="color: #DC2626;">
          Cancel Deployment
        </button>
      `;
    } else if (status === 'active' || status === 'ongoing') {
      group.innerHTML = `
        <button type="button" class="btn btn-primary btn-sm" id="btnComplete" style="background: #10B981; border-color: #10B981;">
          Mark as Completed
        </button>
      `;
    } else {
      group.innerHTML = '';
    }

    const btnAct = document.getElementById('btnActivate');
    if (btnAct) btnAct.addEventListener('click', () => updateStatus('active'));

    const btnComp = document.getElementById('btnComplete');
    if (btnComp) btnComp.addEventListener('click', () => updateStatus('completed'));

    const btnCanc = document.getElementById('btnCancel');
    if (btnCanc) btnCanc.addEventListener('click', () => updateStatus('cancelled'));
  }

  async function updateStatus(newStatus) {
    if (!confirm(`Are you sure you want to change deployment status to ${newStatus.toUpperCase()}?`)) return;

    try {
      const res = await fetch(`/api/nstp/deployments/${encodeURIComponent(deploymentId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Deployment status updated to ${newStatus}!`, 'success');
        await loadDeploymentDetails(deploymentId);
      } else {
        throw new Error(data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Update status error:', err);
      showToast(err.message || 'Error updating status.', 'error');
    }
  }

  function getStatusBadge(status) {
    switch ((status || '').toLowerCase()) {
      case 'active':
      case 'ongoing':
        return '<span class="badge badge-verified">Active</span>';
      case 'completed':
        return '<span class="badge badge-verified" style="background: rgba(59, 130, 246, 0.1); color: #3B82F6; border-color: rgba(59, 130, 246, 0.2);">Completed</span>';
      case 'cancelled':
        return '<span class="badge badge-inactive">Cancelled</span>';
      case 'pending':
      default:
        return '<span class="badge badge-pending">Pending</span>';
    }
  }

  function showToast(msg, type = 'info') {
    const toast = document.getElementById('toastMessage');
    if (!toast) return;

    toast.textContent = msg;
    if (type === 'success') {
      toast.style.background = 'rgba(16, 185, 129, 0.15)';
      toast.style.color = '#0B3D2E';
      toast.style.border = '1px solid rgba(16, 185, 129, 0.3)';
    } else if (type === 'error') {
      toast.style.background = 'rgba(220, 38, 38, 0.15)';
      toast.style.color = '#7F1D1D';
      toast.style.border = '1px solid rgba(220, 38, 38, 0.3)';
    } else {
      toast.style.background = 'rgba(59, 130, 246, 0.15)';
      toast.style.color = '#1E3A8A';
      toast.style.border = '1px solid rgba(59, 130, 246, 0.3)';
    }

    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
    }, 4000);
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

})();