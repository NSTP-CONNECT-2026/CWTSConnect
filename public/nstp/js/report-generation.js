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
  const filterSemester = document.getElementById('filterSemester');
  
  const generateReportBtn = document.getElementById('generateReportBtn');
  const resetFiltersBtn = document.getElementById('resetFiltersBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
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

    // Generate & Preview Button
    if (generateReportBtn) {
      generateReportBtn.addEventListener('click', () => {
        fetchAndRenderReport();
      });
    }

    // Reset Filters Button
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => {
        if (filterCourse) filterCourse.value = 'ALL';
        if (filterSection) filterSection.value = 'ALL';
        if (filterStatus) filterStatus.value = 'ALL';
        fetchAndRenderReport();
      });
    }

    // Print Button
    if (printReportBtn) {
      printReportBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // Export CSV Button
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        exportCurrentReportToCSV();
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
      const semester = filterSemester ? filterSemester.options[filterSemester.selectedIndex].text : '2nd Sem, A.Y. 2025–2026';

      const url = `/api/nstp/reports/generate?type=${encodeURIComponent(currentType)}&course=${encodeURIComponent(course)}&section=${encodeURIComponent(section)}&status=${encodeURIComponent(status)}`;

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
        renderReportPreview(result.report, semester);
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
  function renderReportPreview(report, semesterText) {
    if (!report) return;

    // 1. Header Titles & Metadata
    if (previewReportTitle) previewReportTitle.textContent = report.title || 'Official NSTP Report';
    if (previewReportMeta) {
      const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      previewReportMeta.textContent = `${semesterText} • Generated on ${now}`;
    }

    // 2. Summary Metric Strip
    if (previewSummaryStrip) {
      const metrics = report.summaryMetrics || {};
      const metricEntries = Object.entries(metrics);
      if (metricEntries.length > 0) {
        previewSummaryStrip.innerHTML = metricEntries.map(([key, val]) => `
          <div class="summary-strip-item">
            <span class="summary-strip-label">${formatMetricLabel(key)}</span>
            <span class="summary-strip-val">${escapeHtml(String(val))}</span>
          </div>
        `).join('');
        previewSummaryStrip.style.display = 'flex';
      } else {
        previewSummaryStrip.style.display = 'none';
      }
    }

    // 3. Table Header Columns
    if (reportTableHead) {
      const columns = report.columns || [];
      reportTableHead.innerHTML = `
        <tr>
          <th style="width: 40px; text-align: center;">#</th>
          ${columns.map(col => `<th>${escapeHtml(col.label)}</th>`).join('')}
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
            return `<td>${formatTableCell(cellVal, col.key)}</td>`;
          }).join('')}
        </tr>
      `).join('');
    }
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

  /**
   * Generates and downloads a clean CSV file
   */
  function exportCurrentReportToCSV() {
    if (!currentReportData || !currentReportData.rows || currentReportData.rows.length === 0) {
      alert('No data available to export.');
      return;
    }

    const columns = currentReportData.columns || [];
    const rows = currentReportData.rows || [];

    const headers = ['#', ...columns.map(c => `"${c.label}"`)].join(',');
    const csvRows = rows.map((r, i) => {
      const values = columns.map(c => {
        let val = r[c.key] || '';
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      });
      return [i + 1, ...values].join(',');
    });

    const csvContent = [
      `"${currentReportData.title || 'Official Report'}"`,
      `"Generated: ${new Date().toLocaleString()}"`,
      '',
      headers,
      ...csvRows
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${currentType}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
