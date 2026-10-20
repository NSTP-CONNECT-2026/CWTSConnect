/**
 * CWTSConnect — NSTP Coordinator Report Generation & Preview Controller
 * Strictly adheres to CWTSConnect_Design_Guide_Updated.md
 * Handles:
 *  - 8 Institutional Report Types selection
 *  - Dynamic multi-filter querying (Course, Section, Status, Term)
 *  - Rendering Print-Ready Institutional Report Preview
 *  - Section 12 Skeleton loaders
 *  - Direct Browser Print (`window.print()`)
 *  - CSV / Excel Format Export
 */

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // DOM Elements
  const reportCards = document.querySelectorAll('.report-type-card');
  const selectedReportLabel = document.getElementById('selectedReportLabel');
  const filterCourse = document.getElementById('filterCourse');
  const filterSection = document.getElementById('filterSection');
  const filterStatus = document.getElementById('filterStatus');
  const filterDateFrom = document.getElementById('filterDateFrom');
  const filterDateTo = document.getElementById('filterDateTo');
  
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const printReportBtn = document.getElementById('printReportBtn');

  const reportSkeleton = document.getElementById('reportSkeleton');
  const reportPaperContainer = document.getElementById('reportPaperContainer');
  const previewReportTitle = document.getElementById('previewReportTitle');
  const previewReportMeta = document.getElementById('previewReportMeta');
  const previewSummaryStrip = document.getElementById('previewSummaryStrip');
  const reportTableHead = document.getElementById('reportTableHead');
  const reportTableBody = document.getElementById('reportTableBody');

  // State
  let currentType = 'student_records';
  let currentReportData = null;

  // Initialize
  initEventListeners();
  fetchAndRenderReport();

  function initEventListeners() {
    // Report Type Card Selection
    reportCards.forEach(card => {
      card.addEventListener('click', function () {
        reportCards.forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        currentType = this.getAttribute('data-type');
        const titleText = this.querySelector('.report-type-title')?.textContent || 'Report';
        if (selectedReportLabel) selectedReportLabel.textContent = titleText;
        fetchAndRenderReport();
      });
    });

    // Dynamic Filter Change Triggers (Real-time Filtering)
    [filterCourse, filterSection, filterStatus, filterDateFrom, filterDateTo].forEach(ctrl => {
      if (ctrl) {
        ctrl.addEventListener('change', () => {
          fetchAndRenderReport();
        });
      }
    });

    // Reset Filters Button
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => {
        if (filterCourse) filterCourse.value = 'ALL';
        if (filterSection) filterSection.value = 'ALL';
        if (filterStatus) filterStatus.value = 'ALL';
        if (filterDateFrom) filterDateFrom.value = '';
        if (filterDateTo) filterDateTo.value = '';
        fetchAndRenderReport();
      });
    }

    // Print Button
    if (printReportBtn) {
      printReportBtn.addEventListener('click', () => {
        window.print();
      });
    }
  }

  /**
   * Fetches data from backend and renders institutional preview
   */
  async function fetchAndRenderReport() {
    showLoading();

    try {
      const course = filterCourse ? filterCourse.value : 'ALL';
      const section = filterSection ? filterSection.value : 'ALL';
      const status = filterStatus ? filterStatus.value : 'ALL';
      const dateFrom = filterDateFrom ? filterDateFrom.value.trim() : '';
      const dateTo = filterDateTo ? filterDateTo.value.trim() : '';

      const queryParams = new URLSearchParams({
        type: currentType,
        course,
        section,
        status,
        dateFrom,
        dateTo
      });

      const url = `/api/nstp/reports/generate?${queryParams.toString()}`;

      const res = await fetch(url, {
        method: 'GET',
        credentials: 'include'
      });

      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login.html';
        return;
      }

      const result = await res.json();
      if (result.success && result.report) {
        currentReportData = result.report;
        renderReportPreview(result.report, dateFrom, dateTo);
      }
    } catch (err) {
      console.error('Error loading report:', err);
    } finally {
      hideLoading();
    }
  }

  /**
   * Renders the institutional table and metadata
   */
  function renderReportPreview(report, dateFrom, dateTo) {
    if (!report) return;

    // 1. Header Titles & Metadata
    if (previewReportTitle) previewReportTitle.textContent = report.title || 'Official CWTS Report';
    if (previewReportMeta) {
      const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      let rangeText = 'All-Time Records';

      const formatD = (dStr) => {
        try {
          const parts = dStr.split('-');
          if (parts.length === 3) {
            const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
          }
          return dStr;
        } catch (e) {
          return dStr;
        }
      };

      if (dateFrom && dateTo) {
        rangeText = `Period: ${formatD(dateFrom)} – ${formatD(dateTo)}`;
      } else if (dateFrom) {
        rangeText = `Starting from: ${formatD(dateFrom)}`;
      } else if (dateTo) {
        rangeText = `Up to: ${formatD(dateTo)}`;
      }

      previewReportMeta.textContent = `${rangeText} • Generated on ${now}`;
    }

    // 2. Summary Metric Strip (Removed across all reports)
    if (previewSummaryStrip) {
      previewSummaryStrip.innerHTML = '';
      previewSummaryStrip.style.display = 'none';
      previewSummaryStrip.classList.add('is-empty');
    }

    // 3. Table Header Columns
    if (reportTableHead) {
      const columns = report.columns || [];
      reportTableHead.innerHTML = `
        <tr>
          <th style="width: 4%; text-align: center;">#</th>
          ${columns.map(col => {
            const { align, widthStyle } = getColumnStyle(currentType, col.key);
            return `<th style="${align} ${widthStyle}">${escapeHtml(col.label)}</th>`;
          }).join('')}
        </tr>
      `;
    }

    // 4. Table Body Rows
    if (reportTableBody) {
      const rows = report.rows || [];
      const columns = report.columns || [];

      if (rows.length === 0) {
        reportTableBody.innerHTML = `
          <tr>
            <td colspan="${columns.length + 1}" style="text-align: center; padding: 32px; color: var(--text-muted);">
              No records found matching the specified filter criteria.
            </td>
          </tr>
        `;
        return;
      }

      reportTableBody.innerHTML = rows.map((row, idx) => `
        <tr>
          <td style="text-align: center; font-weight: 600; color: #64748B;">${idx + 1}</td>
          ${columns.map(col => {
            const cellVal = row[col.key] || '—';
            const { align } = getColumnStyle(currentType, col.key);
            return `<td style="${align}">${formatTableCell(cellVal, col.key)}</td>`;
          }).join('')}
        </tr>
      `).join('');
    }
  }

  /**
   * Provides proportional percentage widths totaling 96% (+ 4% for # col = 100%)
   * Keeps compact columns (course, section, status) small while giving ample room to names and numbers
   */
  function getColumnStyle(reportType, key) {
    const centeredKeys = [
      'course', 'section', 'contact_number', 'status', 'overall_status',
      'request_id', 'target_date', 'batch_code', 'schedule', 'assigned_volunteers',
      'date', 'time_in', 'time_out', 'hours_rendered', 'total_rendered',
      'target_hours', 'progress', 'rating', 'punctuality', 'engagement',
      'teamwork', 'initiative', 'overall_score', 'grade', 'medical_cert',
      'parent_consent', 'waiver'
    ];

    const isCentered = centeredKeys.includes(key) || key.includes('status');
    const align = isCentered ? 'text-align: center;' : 'text-align: left;';

    const percentages = {
      student_records: {
        student_number: '15%',
        full_name: '28%',
        course: '8%',
        section: '12%',
        contact_number: '16%',
        status: '17%'
      },
      requirement_compliance: {
        student_number: '12%',
        student_name: '21%',
        course: '8%',
        medical_cert: '14%',
        parent_consent: '13%',
        waiver: '13%',
        overall_status: '15%'
      },
      community_requests: {
        request_id: '11%',
        barangay: '21%',
        activity_type: '25%',
        target_date: '12%',
        requested_by: '14%',
        status: '13%'
      },
      deployment_records: {
        batch_code: '12%',
        project_name: '24%',
        partner_community: '18%',
        assigned_volunteers: '11%',
        schedule: '14%',
        status: '17%'
      },
      attendance_logs: {
        date: '11%',
        student_name: '20%',
        course: '8%',
        community: '17%',
        time_in: '9%',
        time_out: '9%',
        hours_rendered: '10%',
        status: '12%'
      },
      rendered_hours: {
        student_number: '12%',
        student_name: '22%',
        course: '8%',
        total_rendered: '13%',
        target_hours: '12%',
        progress: '13%',
        status: '16%'
      },
      community_feedback: {
        date: '11%',
        community: '21%',
        official_name: '16%',
        rating: '16%',
        feedback_comment: '32%'
      },
      evaluation_records: {
        student_number: '10%',
        student_name: '21%',
        course: '7%',
        punctuality: '9%',
        engagement: '9%',
        teamwork: '9%',
        initiative: '9%',
        overall_score: '10%',
        grade: '12%'
      }
    };

    const typeConfig = percentages[reportType] || {};
    const width = typeConfig[key] || '';
    const widthStyle = width ? `width: ${width};` : '';

    return { align, widthStyle };
  }

  function formatTableCell(val, key) {
    const str = String(val);

    if (str === 'Verified' || str === 'Completed' || str === 'Approved' || str === 'Fully Compliant') {
      return `<span class="badge badge-complete">${escapeHtml(str)}</span>`;
    }

    if (str === 'Pending Review' || str === 'Pending' || str === 'In Progress' || str === 'In Review') {
      return `<span class="badge badge-pending">${escapeHtml(str)}</span>`;
    }

    if (str === 'Active Ongoing') {
      return `<span class="badge badge-verified">${escapeHtml(str)}</span>`;
    }

    if (str === 'Cancelled' || str === 'Rejected' || str === 'Incomplete' || str === 'Missing') {
      return `<span class="badge badge-inactive">${escapeHtml(str)}</span>`;
    }

    if (key === 'grade' && str.includes('Outstanding')) {
      return `<strong style="color: var(--cwts-primary-dark);">${escapeHtml(str)}</strong>`;
    }

    return escapeHtml(str);
  }

  function formatMetricLabel(key) {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .toUpperCase();
  }

  function showLoading() {
    if (reportSkeleton) reportSkeleton.classList.remove('hidden');
    if (reportPaperContainer) reportPaperContainer.classList.add('hidden');
  }

  function hideLoading() {
    if (reportSkeleton) reportSkeleton.classList.add('hidden');
    if (reportPaperContainer) reportPaperContainer.classList.remove('hidden');
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

});
