/**
 * CWTSConnect — Community Official Attendance & Service Hours Logging Controller
 */

(function () {
  'use strict';

  let deployments = [];
  let currentStudents = [];
  let currentSessions = [];
  let currentDeploymentId = null;

  document.addEventListener('DOMContentLoaded', function () {
    initTabs();
    initDatePickers();
    loadDeployments();

    // Event listeners
    const attDepSelect = document.getElementById('attDeploymentSelect');
    if (attDepSelect) {
      attDepSelect.addEventListener('change', function () {
        currentDeploymentId = this.value;
        const hoursDepSelect = document.getElementById('hoursDeploymentSelect');
        if (hoursDepSelect) hoursDepSelect.value = currentDeploymentId;
        autofillActivityDate(currentDeploymentId);
        if (currentDeploymentId) {
          loadStudentsForDeployment(currentDeploymentId);
          loadAttendanceHistory(currentDeploymentId);
          loadSessionsForVerification(currentDeploymentId);
        } else {
          updateDeploymentStatusNotice(null);
          renderAttendanceRoster([], false);
        }
      });
    }

    const hoursDepSelect = document.getElementById('hoursDeploymentSelect');
    if (hoursDepSelect) {
      hoursDepSelect.addEventListener('change', function () {
        currentDeploymentId = this.value;
        const attSelect = document.getElementById('attDeploymentSelect');
        if (attSelect) attSelect.value = currentDeploymentId;
        autofillActivityDate(currentDeploymentId);
        if (currentDeploymentId) {
          loadStudentsForDeployment(currentDeploymentId);
          loadAttendanceHistory(currentDeploymentId);
          loadSessionsForVerification(currentDeploymentId);
        } else {
          updateDeploymentStatusNotice(null);
          renderAttendanceRoster([], false);
        }
      });
    }

    const attDateInput = document.getElementById('attDatePicker');
    if (attDateInput) {
      attDateInput.readOnly = true;
      attDateInput.addEventListener('keydown', function (e) {
        e.preventDefault();
      });
    }

    const refreshSessionsBtn = document.getElementById('refreshSessionsBtn');
    if (refreshSessionsBtn) {
      refreshSessionsBtn.addEventListener('click', function () {
        if (currentDeploymentId) {
          loadSessionsForVerification(currentDeploymentId);
        }
      });
    }

    const quickAttBtn = document.getElementById('quickAttendanceBtn');
    if (quickAttBtn) {
      quickAttBtn.addEventListener('click', openQuickAttendanceModal);
    }

    const quickSelectAll = document.getElementById('quickAttSelectAll');
    if (quickSelectAll) {
      quickSelectAll.addEventListener('change', function () {
        const isChecked = this.checked;
        document.querySelectorAll('.quick-student-cb').forEach(cb => {
          cb.checked = isChecked;
        });
        updateQuickAttCounts();
      });
    }

    const refreshHistoryBtn = document.getElementById('refreshAttHistoryBtn');
    if (refreshHistoryBtn) {
      refreshHistoryBtn.addEventListener('click', function () {
        loadAttendanceHistory(currentDeploymentId);
      });
    }

    const verifyAllHoursBtn = document.getElementById('verifyAllHoursBtn');
    if (verifyAllHoursBtn) {
      verifyAllHoursBtn.addEventListener('click', creditAllHours);
    }
  });

  // Tab switcher
  function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        const targetTabId = this.getAttribute('data-tab');
        
        tabBtns.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

        this.classList.add('active');
        const panel = document.getElementById(targetTabId);
        if (panel) panel.classList.add('active');

        if (targetTabId === 'tabHours' && currentDeploymentId) {
          loadSessionsForVerification(currentDeploymentId);
        }
      });
    });
  }

  function getLocalDateString() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getCurrentTimeHHMM() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  function initDatePickers() {
    const today = getLocalDateString();
    const attDate = document.getElementById('attDatePicker');
    if (attDate) {
      attDate.value = today;
      attDate.readOnly = true;
    }
  }

  function autofillActivityDate(deploymentId) {
    const attDate = document.getElementById('attDatePicker');
    if (!attDate || !deploymentId) return;

    const dep = deployments.find(d => String(d.deployment_id) === String(deploymentId));
    if (!dep) return;

    const today = getLocalDateString();
    const startDate = dep.deployment_start_date ? String(dep.deployment_start_date).split('T')[0] : '';
    const endDate = dep.deployment_end_date ? String(dep.deployment_end_date).split('T')[0] : startDate;

    let dateToSet = startDate;
    if (startDate && endDate && startDate !== endDate && today >= startDate && today <= endDate) {
      dateToSet = today;
    } else if (!startDate && dep.community_request?.preferred_start_date) {
      dateToSet = String(dep.community_request.preferred_start_date).split('T')[0];
    } else if (!startDate && dep.created_at) {
      dateToSet = String(dep.created_at).split('T')[0];
    } else if (!startDate) {
      dateToSet = today;
    }

    if (dateToSet) {
      attDate.value = dateToSet;
    }
  }

  function showLoading() {
    const skeleton = document.getElementById('attendanceSkeleton');
    const content = document.getElementById('attendanceContent');
    if (skeleton) skeleton.style.display = 'block';
    if (content) content.classList.add('hidden');
  }

  function hideLoading() {
    const skeleton = document.getElementById('attendanceSkeleton');
    const content = document.getElementById('attendanceContent');
    if (skeleton) skeleton.style.display = 'none';
    if (content) content.classList.remove('hidden');
  }

  async function loadDeployments() {
    showLoading();
    try {
      const res = await fetch('/api/community/deployments');
      const result = await res.json();

      if (result.success && Array.isArray(result.data)) {
        deployments = result.data;
        populateDeploymentDropdown(deployments);

        if (deployments.length > 0) {
          // Prefer active deployment by default if available
          const activeDep = deployments.find(d => d.deployment_status === 'active' || d.deployment_status === 'ongoing');
          currentDeploymentId = activeDep ? activeDep.deployment_id : deployments[0].deployment_id;

          const attDepSelect = document.getElementById('attDeploymentSelect');
          if (attDepSelect) attDepSelect.value = currentDeploymentId;
          const hoursDepSelect = document.getElementById('hoursDeploymentSelect');
          if (hoursDepSelect) hoursDepSelect.value = currentDeploymentId;

          autofillActivityDate(currentDeploymentId);

          await Promise.all([
            loadStudentsForDeployment(currentDeploymentId),
            loadAttendanceHistory(currentDeploymentId),
            loadSessionsForVerification(currentDeploymentId)
          ]);
        } else {
          updateDeploymentStatusNotice(null);
          renderAttendanceRoster([], false);
        }
      }
    } catch (err) {
      console.error('Failed to load deployments:', err);
    } finally {
      hideLoading();
    }
  }

  function populateDeploymentDropdown(deps) {
    const selects = [
      document.getElementById('attDeploymentSelect'),
      document.getElementById('hoursDeploymentSelect')
    ];

    if (deps.length === 0) {
      selects.forEach(sel => {
        if (sel) sel.innerHTML = '<option value="">No deployments available</option>';
      });
      return;
    }

    const optionsHtml = deps.map(d => {
      const statusLabel = (d.deployment_status || 'pending').toUpperCase();
      const label = `${d.deployment_batch_name} — ${d.activity_title || 'Project'} [${statusLabel}]`;
      return `<option value="${d.deployment_id}">${escapeHtml(label)}</option>`;
    }).join('');

    selects.forEach(sel => {
      if (sel) {
        sel.innerHTML = optionsHtml;
        if (currentDeploymentId) sel.value = currentDeploymentId;
      }
    });
  }

  function updateDeploymentStatusNotice(dep) {
    const noticeEl = document.getElementById('deploymentStatusNotice');
    const quickBtn = document.getElementById('quickAttendanceBtn');

    if (!dep) {
      if (noticeEl) noticeEl.style.display = 'none';
      if (quickBtn) {
        quickBtn.disabled = true;
        quickBtn.style.display = 'none';
      }
      return;
    }

    const status = (dep.deployment_status || 'pending').toLowerCase();
    const isActive = (status === 'active' || status === 'ongoing');
    const startDate = dep.deployment_start_date ? dep.deployment_start_date.split('T')[0] : 'N/A';
    const endDate = dep.deployment_end_date ? dep.deployment_end_date.split('T')[0] : startDate;

    if (isActive) {
      if (noticeEl) {
        noticeEl.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #10B981; flex-shrink: 0;"></span>
            <span><strong>Active Deployment:</strong> Attendance logging is open. Community officials can log Time In and Time Out for each student volunteer.</span>
          </div>
        `;
        noticeEl.style.background = 'rgba(16, 185, 129, 0.12)';
        noticeEl.style.color = '#065F46';
        noticeEl.style.border = '1px solid rgba(16, 185, 129, 0.35)';
        noticeEl.style.display = 'block';
      }

      if (quickBtn) {
        quickBtn.disabled = false;
        quickBtn.style.display = 'inline-flex';
      }
    } else if (status === 'pending') {
      if (noticeEl) {
        noticeEl.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #F59E0B; flex-shrink: 0;"></span>
            <span><strong>Deployment is Pending:</strong> Scheduled for <strong>${startDate} to ${endDate}</strong>. Attendance time-in and time-out will automatically open once the deployment schedule arrives and becomes Active.</span>
          </div>
        `;
        noticeEl.style.background = 'rgba(245, 158, 11, 0.12)';
        noticeEl.style.color = '#92400E';
        noticeEl.style.border = '1px solid rgba(245, 158, 11, 0.35)';
        noticeEl.style.display = 'block';
      }

      if (quickBtn) {
        quickBtn.disabled = true;
        quickBtn.style.display = 'none';
      }
    } else if (status === 'completed') {
      if (noticeEl) {
        noticeEl.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #3B82F6; flex-shrink: 0;"></span>
            <span><strong>Deployment Completed:</strong> Attendance logging has closed for this completed deployment. View credited service hours in Tab 2.</span>
          </div>
        `;
        noticeEl.style.background = 'rgba(59, 130, 246, 0.12)';
        noticeEl.style.color = '#1E40AF';
        noticeEl.style.border = '1px solid rgba(59, 130, 246, 0.35)';
        noticeEl.style.display = 'block';
      }

      if (quickBtn) {
        quickBtn.disabled = true;
        quickBtn.style.display = 'none';
      }
    } else {
      if (noticeEl) {
        noticeEl.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #DC2626; flex-shrink: 0;"></span>
            <span><strong>Deployment Cancelled:</strong> Attendance logging is not available.</span>
          </div>
        `;
        noticeEl.style.background = 'rgba(239, 68, 68, 0.12)';
        noticeEl.style.color = '#991B1B';
        noticeEl.style.border = '1px solid rgba(239, 68, 68, 0.35)';
        noticeEl.style.display = 'block';
      }

      if (quickBtn) {
        quickBtn.disabled = true;
        quickBtn.style.display = 'none';
      }
    }
  }

  async function loadStudentsForDeployment(deploymentId) {
    const rosterTbody = document.getElementById('attRosterTableBody');
    const dep = deployments.find(d => String(d.deployment_id) === String(deploymentId));
    const isDepActive = dep && (dep.deployment_status === 'active' || dep.deployment_status === 'ongoing');
    updateDeploymentStatusNotice(dep);

    // If there is no active deployment, do not render any student records in Active Deployment Attendance
    if (!isDepActive) {
      currentStudents = [];
      renderAttendanceRoster([], false);
      return;
    }

    if (rosterTbody) {
      rosterTbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 24px; color: var(--text-muted);">Loading students...</td></tr>';
    }

    try {
      const dateInput = document.getElementById('attDatePicker');
      const selectedDate = dateInput ? dateInput.value : '';
      let url = `/api/community/deployments/${deploymentId}`;
      if (selectedDate) {
        url += `?date=${encodeURIComponent(selectedDate)}`;
      }
      const res = await fetch(url);
      const result = await res.json();

      if (result.success && result.data) {
        currentStudents = result.data.students || [];
        renderAttendanceRoster(currentStudents, true);
      } else {
        renderEmptyRoster();
      }
    } catch (err) {
      console.error('Error loading students:', err);
      renderEmptyRoster();
    }
  }

  function renderAttendanceRoster(students, isDepActive = true) {
    const tbody = document.getElementById('attRosterTableBody');
    if (!tbody) return;

    if (!isDepActive) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" style="text-align: center; padding: 40px 20px; color: var(--text-muted);">
            <div style="font-weight: 600; font-size: 0.9375rem; color: var(--text-main); margin-bottom: 4px;">No Active Deployment</div>
            <div style="font-size: 0.8125rem;">Attendance logging is only available when a deployment is currently Active.</div>
          </td>
        </tr>
      `;
      return;
    }

    if (!students || students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">No students assigned to this deployment.</td></tr>';
      return;
    }

    tbody.innerHTML = students.map((s) => {
      const studentName = s.full_name || s.student_name || 'Student Volunteer';
      const course = s.course || s.program || 'CWTS Volunteer';
      const section = s.section ? (String(s.section).toLowerCase().startsWith('section') ? s.section : `Section ${String(s.section).replace(/^sec\.?\s*/i, '')}`) : '';
      const courseSection = section ? `${course} • ${section}` : course;

      // Initials for avatar
      const nameParts = studentName.trim().split(/\s+/);
      const initials = nameParts.length >= 2 
        ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
        : studentName.slice(0, 2).toUpperCase();

      const att = s.today_attendance;
      const hasTimeIn = Boolean(att && att.check_in_time && att.check_in_time !== '---');
      const rawOut = att ? att.check_out_time : null;
      const hasTimeOut = Boolean(rawOut && rawOut !== '---' && String(rawOut).toUpperCase() !== 'N/A' && String(rawOut).toUpperCase() !== 'N\\A');

      let timeInHtml = '';
      if (!hasTimeIn) {
        timeInHtml = `
          <button type="button" class="btn-action-timein" onclick="openConfirmAttendanceModal('${s.student_user_id}', 'in')">
            Time In
          </button>
        `;
      } else {
        timeInHtml = `
          <div class="att-action-pill att-pill-timein" title="Logged Time In">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>${formatTime12Hour(att.check_in_time)}</span>
          </div>
        `;
      }

      let timeOutHtml = '';
      if (!hasTimeIn) {
        // Requirement: "Dapat walang makikitang 'Time out' button kapag hindi pa nakakapa time in."
        timeOutHtml = `<span style="color: var(--text-muted); font-size: 0.875rem; font-weight: 600; display: inline-flex; justify-content: center; min-width: 124px;">---</span>`;
      } else if (!hasTimeOut) {
        timeOutHtml = `
          <button type="button" class="btn-action-timeout" onclick="openConfirmAttendanceModal('${s.student_user_id}', 'out')">
            Time Out
          </button>
        `;
      } else {
        const hrs = Number(att.hours_rendered || 0);
        timeOutHtml = `
          <div class="att-action-pill att-pill-timeout" title="Logged Time Out">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>${formatTime12Hour(att.check_out_time)}</span>
            ${hrs > 0 ? `<span style="font-weight: 600; opacity: 0.85;">(${hrs.toFixed(1)}h)</span>` : ''}
          </div>
        `;
      }

      return `
        <tr data-student-id="${s.student_user_id}">
          <td>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(11, 61, 46, 0.08); color: var(--cwts-primary-dark, #0B3D2E); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8125rem; flex-shrink: 0; border: 1.5px solid rgba(11, 61, 46, 0.15);">
                ${initials}
              </div>
              <div>
                <div style="font-weight: 700; color: var(--cwts-primary-dark, #0B3D2E); font-size: 0.9375rem; line-height: 1.25;">${escapeHtml(studentName)}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(courseSection)}</div>
              </div>
            </div>
          </td>
          <td style="text-align: center;">
            ${timeInHtml}
          </td>
          <td style="text-align: center;">
            ${timeOutHtml}
          </td>
        </tr>
      `;
    }).join('');
  }

  /* ==========================================================================
     Single Attendance Confirmation Modal (Row-level Time In / Time Out)
     ========================================================================== */
  let pendingSingleAtt = null;

  window.openConfirmAttendanceModal = function (studentUserId, action) {
    const student = currentStudents.find(s => String(s.student_user_id) === String(studentUserId));
    if (!student) return;

    const studentName = student.full_name || student.student_name || 'Student Volunteer';
    const course = student.course || student.program || 'CWTS Volunteer';
    const section = student.section ? (String(student.section).toLowerCase().startsWith('section') ? student.section : `Section ${String(student.section).replace(/^sec\.?\s*/i, '')}`) : '';
    const courseSection = section ? `${course} • ${section}` : course;

    const modal = document.getElementById('singleAttendanceConfirmModal');
    const modalTitle = document.getElementById('singleAttModalTitle');
    const studentNameEl = document.getElementById('singleAttStudentName');
    const courseSectionEl = document.getElementById('singleAttCourseSection');
    const actionBadge = document.getElementById('singleAttActionBadge');
    const activityDateEl = document.getElementById('singleAttActivityDate');
    const recordedTimeEl = document.getElementById('singleAttRecordedTime');
    const confirmPromptEl = document.getElementById('singleAttConfirmPrompt');
    const actionIcon = document.getElementById('singleAttActionIcon');

    const dateInput = document.getElementById('attDatePicker');
    const activityDate = dateInput ? dateInput.value : getLocalDateString();
    const currentTimeHHMM = getCurrentTimeHHMM();
    const formatted12h = formatTime12Hour(currentTimeHHMM);

    pendingSingleAtt = {
      studentUserId,
      action,
      studentName,
      activityDate,
      timeHHMM: currentTimeHHMM
    };

    if (studentNameEl) studentNameEl.textContent = studentName;
    if (courseSectionEl) courseSectionEl.textContent = courseSection;
    if (activityDateEl) activityDateEl.textContent = activityDate;
    if (recordedTimeEl) recordedTimeEl.textContent = formatted12h;

    if (action === 'in') {
      if (modalTitle) modalTitle.textContent = 'Confirm Student Time In';
      if (actionBadge) {
        actionBadge.textContent = 'Time In';
        actionBadge.style.background = 'rgba(16, 185, 129, 0.12)';
        actionBadge.style.color = '#065F46';
        actionBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
      }
      if (actionIcon) {
        actionIcon.style.background = 'rgba(16, 185, 129, 0.12)';
        actionIcon.style.color = '#065F46';
      }
      if (confirmPromptEl) {
        confirmPromptEl.innerHTML = `Are you sure you want to record <strong>Time In</strong> for <strong>${escapeHtml(studentName)}</strong> at <strong>${formatted12h}</strong>?`;
      }
    } else {
      if (modalTitle) modalTitle.textContent = 'Confirm Student Time Out';
      if (actionBadge) {
        actionBadge.textContent = 'Time Out';
        actionBadge.style.background = 'rgba(59, 130, 246, 0.12)';
        actionBadge.style.color = '#1E40AF';
        actionBadge.style.borderColor = 'rgba(59, 130, 246, 0.3)';
      }
      if (actionIcon) {
        actionIcon.style.background = 'rgba(59, 130, 246, 0.12)';
        actionIcon.style.color = '#1E40AF';
      }
      const existingIn = student.today_attendance?.check_in_time ? formatTime12Hour(student.today_attendance.check_in_time) : 'earlier';
      if (confirmPromptEl) {
        confirmPromptEl.innerHTML = `Are you sure you want to record <strong>Time Out</strong> for <strong>${escapeHtml(studentName)}</strong> at <strong>${formatted12h}</strong>? (Timed in at ${existingIn})`;
      }
    }

    if (modal) modal.classList.add('active');
  };

  window.closeSingleAttendanceModal = function () {
    const modal = document.getElementById('singleAttendanceConfirmModal');
    if (modal) modal.classList.remove('active');
    pendingSingleAtt = null;
  };

  window.submitSingleAttendanceRecord = async function () {
    if (!pendingSingleAtt) return;

    const { studentUserId, action, studentName, activityDate, timeHHMM } = pendingSingleAtt;
    const confirmBtn = document.getElementById('btnConfirmSingleAtt');

    try {
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span>Saving...</span>';
      }

      const finalTimeHHMM = getCurrentTimeHHMM() || timeHHMM;
      const recordObj = {
        student_user_id: studentUserId,
        status: 'present'
      };

      if (action === 'in') {
        recordObj.check_in_time = `${finalTimeHHMM}:00`;
      } else {
        recordObj.check_out_time = `${finalTimeHHMM}:00`;
      }

      const res = await fetch('/api/community/attendance/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          deployment_id: currentDeploymentId,
          attendance_date: activityDate,
          records: [recordObj]
        })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        closeSingleAttendanceModal();
        const actionLabel = action === 'in' ? 'Time In' : 'Time Out';
        showToast(`${actionLabel} successfully recorded for ${studentName}!`, 'success');
        await Promise.all([
          loadStudentsForDeployment(currentDeploymentId),
          loadAttendanceHistory(currentDeploymentId),
          loadSessionsForVerification(currentDeploymentId)
        ]);
      } else {
        showToast(result.message || 'Failed to record attendance.', 'error');
      }
    } catch (err) {
      console.error('Record single attendance error:', err);
      showToast('Error connecting to server. Please try again.', 'error');
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<span>Confirm</span>';
      }
    }
  };

  /* ==========================================================================
     Quick Attendance Modal (Multi-student Batch Logging)
     ========================================================================== */
  let quickAttTimer = null;

  function updateQuickAttLiveTime() {
    const timeEl = document.getElementById('quickAttTimeText');
    if (timeEl) {
      timeEl.textContent = formatTime12Hour(getCurrentTimeHHMM());
    }
  }

  function renderQuickAttendanceRoster(action) {
    const tbody = document.getElementById('quickAttRosterTableBody');
    const selectAllCb = document.getElementById('quickAttSelectAll');
    const confirmBtn = document.getElementById('btnConfirmQuickAtt');
    const noticeEl = document.getElementById('quickAttActionNotice');
    if (!tbody) return;

    // Filter students strictly based on action:
    // - "in": only students without Time In
    // - "out": only students with Time In but without Time Out
    const eligibleStudents = (currentStudents || []).filter(s => {
      const att = s.today_attendance;
      const hasIn = Boolean(att && att.check_in_time && att.check_in_time !== '---');
      const rawOut = att ? att.check_out_time : null;
      const hasOut = Boolean(rawOut && rawOut !== '---' && String(rawOut).toUpperCase() !== 'N/A' && String(rawOut).toUpperCase() !== 'N\\A');

      if (action === 'in') {
        return !hasIn;
      } else {
        return hasIn && !hasOut;
      }
    });

    if (action === 'in') {
      if (noticeEl) noticeEl.textContent = 'Recording Time In for selected students';
      if (confirmBtn) confirmBtn.innerHTML = '<span>Confirm & Record Time In</span>';
    } else {
      if (noticeEl) noticeEl.textContent = 'Recording Time Out for selected students';
      if (confirmBtn) confirmBtn.innerHTML = '<span>Confirm & Record Time Out</span>';
    }

    if (eligibleStudents.length === 0) {
      const emptyMsg = action === 'in' 
        ? 'No students eligible for Time In. All assigned students have already timed in.' 
        : 'No students eligible for Time Out. Students must log Time In first before timing out.';
      const hintMsg = action === 'in'
        ? 'Switch to "Log Time Out" above to record departures.'
        : 'Switch to "Log Time In" above to record arrivals.';

      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; padding: 36px 16px; color: var(--text-muted);">
            <div style="font-weight: 600; font-size: 0.875rem; color: var(--text-main); margin-bottom: 4px;">${emptyMsg}</div>
            <div style="font-size: 0.78rem;">${hintMsg}</div>
          </td>
        </tr>
      `;
      if (selectAllCb) {
        selectAllCb.checked = false;
        selectAllCb.disabled = true;
      }
      if (confirmBtn) {
        confirmBtn.disabled = true;
      }
      updateQuickAttCounts();
      return;
    }

    if (selectAllCb) {
      selectAllCb.disabled = false;
      selectAllCb.checked = true;
    }
    if (confirmBtn) {
      confirmBtn.disabled = false;
    }

    tbody.innerHTML = eligibleStudents.map(s => {
      const studentName = s.full_name || s.student_name || 'Student Volunteer';
      const course = s.course || s.program || 'CWTS Volunteer';
      const section = s.section ? (String(s.section).toLowerCase().startsWith('section') ? s.section : `Section ${String(s.section).replace(/^sec\.?\s*/i, '')}`) : '';
      const courseSection = section ? `${course} • ${section}` : course;

      const att = s.today_attendance;
      const hasIn = Boolean(att && att.check_in_time && att.check_in_time !== '---');

      let statusBadge = '<span style="color: #64748B; font-size: 0.75rem; font-weight: 600;">Not Timed In</span>';
      if (hasIn) {
        statusBadge = `<span style="color: #065F46; background: rgba(16, 185, 129, 0.12); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">Timed In (${formatTime12Hour(att.check_in_time)})</span>`;
      }

      return `
        <tr>
          <td style="text-align: center;">
            <input 
              type="checkbox" 
              class="quick-student-cb" 
              data-student-id="${s.student_user_id}" 
              checked 
              style="cursor: pointer; width: 16px; height: 16px; accent-color: var(--cwts-primary-dark, #0B3D2E);"
              onchange="updateQuickAttCounts()"
            />
          </td>
          <td>
            <div style="font-weight: 700; color: var(--cwts-primary-dark, #0B3D2E); font-size: 0.875rem;">${escapeHtml(studentName)}</div>
          </td>
          <td>
            <div style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(courseSection)}</div>
          </td>
          <td style="text-align: center;">
            ${statusBadge}
          </td>
        </tr>
      `;
    }).join('');

    updateQuickAttCounts();
  }

  window.openQuickAttendanceModal = function () {
    if (!currentDeploymentId) {
      showToast('Please select a deployment first.', 'error');
      return;
    }

    const dep = deployments.find(d => String(d.deployment_id) === String(currentDeploymentId));
    if (!dep || (dep.deployment_status !== 'active' && dep.deployment_status !== 'ongoing')) {
      showToast('Quick Attendance is only available for Active deployments.', 'error');
      return;
    }

    if (!currentStudents || currentStudents.length === 0) {
      showToast('No students assigned to this deployment.', 'error');
      return;
    }

    const modal = document.getElementById('quickAttendanceModal');

    // Update live clock and start continuous ticker
    updateQuickAttLiveTime();
    clearInterval(quickAttTimer);
    quickAttTimer = setInterval(updateQuickAttLiveTime, 1000);

    // Determine default action based on current student statuses
    const anyNeedsIn = (currentStudents || []).some(s => {
      const att = s.today_attendance;
      return !att || !att.check_in_time || att.check_in_time === '---';
    });
    const defaultAction = anyNeedsIn ? 'in' : 'out';

    const actionRadios = document.querySelectorAll('input[name="quickAttAction"]');
    actionRadios.forEach(r => {
      r.checked = (r.value === defaultAction);
    });

    renderQuickAttendanceRoster(defaultAction);

    if (modal) modal.classList.add('active');
  };

  window.closeQuickAttendanceModal = function () {
    const modal = document.getElementById('quickAttendanceModal');
    if (modal) modal.classList.remove('active');
    clearInterval(quickAttTimer);
    quickAttTimer = null;
  };

  window.handleQuickActionChange = function () {
    const selectedAction = document.querySelector('input[name="quickAttAction"]:checked')?.value || 'in';
    renderQuickAttendanceRoster(selectedAction);
  };

  window.updateQuickAttCounts = function () {
    const cbs = document.querySelectorAll('.quick-student-cb');
    const selectedCbs = document.querySelectorAll('.quick-student-cb:checked');
    const countEl = document.getElementById('quickAttSelectedCount');
    const selectAllCb = document.getElementById('quickAttSelectAll');
    const confirmBtn = document.getElementById('btnConfirmQuickAtt');

    if (countEl) {
      countEl.textContent = `Selected: ${selectedCbs.length} of ${cbs.length} student(s)`;
    }

    if (selectAllCb && cbs.length > 0) {
      selectAllCb.checked = (selectedCbs.length === cbs.length);
    }

    if (confirmBtn && cbs.length === 0) {
      confirmBtn.disabled = true;
    } else if (confirmBtn) {
      confirmBtn.disabled = (selectedCbs.length === 0);
    }
  };

  window.submitQuickAttendance = async function () {
    const selectedCbs = document.querySelectorAll('.quick-student-cb:checked');
    if (selectedCbs.length === 0) {
      showToast('Please select at least one student.', 'error');
      return;
    }

    const action = document.querySelector('input[name="quickAttAction"]:checked')?.value || 'in';
    const currentTimeHHMM = getCurrentTimeHHMM();

    const dateInput = document.getElementById('attDatePicker');
    const activityDate = dateInput ? dateInput.value : getLocalDateString();

    const confirmBtn = document.getElementById('btnConfirmQuickAtt');

    const records = [];
    selectedCbs.forEach(cb => {
      const studentId = cb.getAttribute('data-student-id');
      if (!studentId) return;

      if (action === 'in') {
        records.push({
          student_user_id: studentId,
          check_in_time: `${currentTimeHHMM}:00`,
          status: 'present'
        });
      } else {
        records.push({
          student_user_id: studentId,
          check_out_time: `${currentTimeHHMM}:00`,
          status: 'present'
        });
      }
    });

    try {
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span>Recording...</span>';
      }

      showToast('Recording attendance in database...', 'info');

      const res = await fetch('/api/community/attendance/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          deployment_id: currentDeploymentId,
          attendance_date: activityDate,
          records
        })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        closeQuickAttendanceModal();
        const actionLabel = action === 'in' ? 'Time In' : 'Time Out';
        showToast(`${actionLabel} recorded successfully for ${result.savedCount || records.length} student(s)!`, 'success');
        await Promise.all([
          loadStudentsForDeployment(currentDeploymentId),
          loadAttendanceHistory(currentDeploymentId),
          loadSessionsForVerification(currentDeploymentId)
        ]);
      } else {
        showToast(result.message || 'Failed to record attendance.', 'error');
      }
    } catch (err) {
      console.error('Quick attendance error:', err);
      showToast('Error connecting to server. Please try again.', 'error');
    } finally {
      if (confirmBtn) {
        confirmBtn.disabled = false;
        handleQuickActionChange();
      }
    }
  };


  function parseTimeComponents(timeStr) {
    if (!timeStr) return null;
    const trimmed = String(timeStr).trim();
    if (trimmed === '---' || trimmed.toUpperCase() === 'N/A' || trimmed.toUpperCase() === 'N\\A') return null;

    if (trimmed.includes('T')) {
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) {
        return { hours: d.getHours(), minutes: d.getMinutes(), seconds: d.getSeconds() };
      }
    }

    const match = trimmed.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?$/i);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = match[3] ? parseInt(match[3], 10) : 0;
    const modifier = match[4] ? match[4].toUpperCase() : null;

    if (modifier === 'PM' && hours < 12) hours += 12;
    if (modifier === 'AM' && hours === 12) hours = 0;

    return { hours, minutes, seconds };
  }

  function formatTime12Hour(timeStr) {
    if (!timeStr || timeStr === '---' || String(timeStr).toUpperCase() === 'N/A' || String(timeStr).toUpperCase() === 'N\\A') {
      return '---';
    }
    const parsed = parseTimeComponents(timeStr);
    if (!parsed) return String(timeStr).trim();
    let { hours, minutes } = parsed;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
  }

  async function saveAttendanceBatch() {
    const saveBtn = document.getElementById('saveAttendanceBatchBtn');
    const dateInput = document.getElementById('attDatePicker');
    const attendanceDate = dateInput ? dateInput.value : '';

    if (!currentDeploymentId || !attendanceDate) {
      showToast('Please select a deployment and valid activity date.', 'error');
      return;
    }

    const dep = deployments.find(d => String(d.deployment_id) === String(currentDeploymentId));
    if (!dep || (dep.deployment_status !== 'active' && dep.deployment_status !== 'ongoing')) {
      showToast('Attendance can only be logged when the deployment is Active.', 'error');
      return;
    }

    const rows = document.querySelectorAll('#attRosterTableBody tr');
    if (rows.length === 0) {
      showToast('No student records to save.', 'error');
      return;
    }

    const records = [];
    rows.forEach(row => {
      const studentId = row.getAttribute('data-student-id');
      if (!studentId) return;

      const timeInVal = row.querySelector('.att-time-in')?.value;
      const isTimeoutNA = row.querySelector('.att-time-out-na')?.checked;
      const timeOutVal = isTimeoutNA ? null : row.querySelector('.att-time-out')?.value;

      const timeIn = timeInVal ? `${timeInVal}:00` : null;
      const timeOut = isTimeoutNA ? null : (timeOutVal ? `${timeOutVal}:00` : null);
      const hours = timeOut ? calculateHours(timeInVal, timeOutVal) : 0;

      records.push({
        student_user_id: studentId,
        status: timeIn ? 'present' : 'absent',
        check_in_time: timeIn,
        check_out_time: timeOut,
        hours_rendered: hours,
        remarks: isTimeoutNA ? 'Time Out: N/A' : ''
      });
    });

    try {
      if (saveBtn) saveBtn.disabled = true;
      showToast('Saving attendance records...', 'info');

      const res = await fetch('/api/community/attendance/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          deployment_id: currentDeploymentId,
          attendance_date: attendanceDate,
          records
        })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showToast(`Attendance saved successfully for ${result.savedCount} student(s)!`, 'success');
        loadStudentsForDeployment(currentDeploymentId);
        loadAttendanceHistory(currentDeploymentId);
        loadSessionsForVerification(currentDeploymentId);
      } else {
        showToast(result.message || 'Failed to save attendance records.', 'error');
      }
    } catch (err) {
      console.error('Save attendance error:', err);
      showToast('Error connecting to server. Please try again.', 'error');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  function calculateHours(timeInStr, timeOutStr) {
    if (!timeInStr || !timeOutStr) return 0;
    const p1 = parseTimeComponents(timeInStr);
    const p2 = parseTimeComponents(timeOutStr);
    if (!p1 || !p2) return 0;
    const diffMinutes = (p2.hours * 60 + p2.minutes) - (p1.hours * 60 + p1.minutes);
    return diffMinutes > 0 ? Math.round((diffMinutes / 60) * 10) / 10 : 0;
  }

  async function loadAttendanceHistory(deploymentId) {
    const tbody = document.getElementById('attHistoryTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">Loading logs...</td></tr>';

    try {
      let url = '/api/community/attendance/history';
      if (deploymentId) url += `?deployment_id=${deploymentId}`;

      const res = await fetch(url);
      const result = await res.json();

      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        renderAttendanceHistory(result.data);
      } else {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">No attendance records logged yet.</td></tr>';
      }
    } catch (err) {
      console.error('Failed to load history:', err);
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">Failed to load history.</td></tr>';
    }
  }

  function renderAttendanceHistory(records) {
    const tbody = document.getElementById('attHistoryTableBody');
    if (!tbody) return;

    tbody.innerHTML = records.map(r => {
      const isTimeoutNA = !r.check_out_time || r.check_out_time === '---' || String(r.check_out_time).toUpperCase() === 'N/A' || String(r.check_out_time).toUpperCase() === 'N\\A';
      const isCredited = !isTimeoutNA && !!(r.verified_at || r.verified_by);
      
      let creditedContent = '';
      if (isTimeoutNA) {
        creditedContent = `<span class="badge" style="background: #F1F5F9; color: #64748B; font-weight: 700; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; display: inline-flex; align-items: center;">N/A</span>`;
      } else if (isCredited) {
        creditedContent = `<span style="font-weight: 700; color: var(--cwts-primary-dark, #0B3D2E); font-size: 0.9375rem;">${Number(r.hours_rendered || 0).toFixed(1)} hrs</span>`;
      } else {
        creditedContent = `<span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #B45309; border: 1px solid rgba(245, 158, 11, 0.35); font-weight: 700; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; letter-spacing: 0.02em; display: inline-flex; align-items: center; gap: 4px;"><span style="width:6px;height:6px;border-radius:50%;background:#F59E0B;display:inline-block;"></span>Pending</span>`;
      }

      const timeoutDisplay = isTimeoutNA
        ? `<span class="badge" style="background: #F1F5F9; color: #64748B; font-weight: 700; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; display: inline-flex; align-items: center;">N/A</span>`
        : escapeHtml(formatTime12Hour(r.check_out_time));

      const studentName = r.student_name || r.full_name || 'Student Volunteer';
      const course = r.course || '---';
      const section = r.section ? (String(r.section).toLowerCase().startsWith('section') ? r.section : `Section ${String(r.section).replace(/^sec\.?\s*/i, '')}`) : '';
      const courseSection = section ? `${course} • ${section}` : course;

      return `
        <tr>
          <td style="font-weight: 700; color: var(--cwts-primary-dark);">${escapeHtml(r.attendance_date)}</td>
          <td>
            <div style="font-weight: 700; color: var(--text-main); font-size: 0.9375rem;">${escapeHtml(studentName)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(courseSection)}</div>
          </td>
          <td style="font-size: 0.8125rem; font-weight: 600;">${escapeHtml(formatTime12Hour(r.check_in_time))}</td>
          <td style="font-size: 0.8125rem; font-weight: 600;">${timeoutDisplay}</td>
          <td>${creditedContent}</td>
        </tr>
      `;
    }).join('');
  }

  // --------------------------------------------------------------------------
  // TAB 2: SERVICE HOURS CREDITING FUNCTIONS
  // --------------------------------------------------------------------------

  async function loadSessionsForVerification(deploymentId) {
    const tbody = document.getElementById('verifySessionsTableBody');
    if (!tbody) return;

    if (!deploymentId) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">Please select a deployment to view sessions.</td></tr>';
      return;
    }

    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted);">Loading duty sessions for service hours crediting...</td></tr>';

    try {
      const res = await fetch(`/api/community/hours/sessions?deployment_id=${deploymentId}`);
      const result = await res.json();

      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        currentSessions = result.data;
        renderVerifySessionsTable(currentSessions);
      } else {
        currentSessions = [];
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">No attendance sessions recorded yet for this deployment. Log attendance in Tab 1 first.</td></tr>';
      }
    } catch (err) {
      console.error('Failed to load verification sessions:', err);
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">Failed to load sessions.</td></tr>';
    }
  }

  function getMaxHoursFromTimes(timeInStr, timeOutStr) {
    if (!timeInStr || !timeOutStr || timeInStr === '---' || timeOutStr === '---') return 24.0;
    const p1 = parseTimeComponents(timeInStr);
    const p2 = parseTimeComponents(timeOutStr);
    if (!p1 || !p2) return 24.0;
    const diffMinutes = (p2.hours * 60 + p2.minutes) - (p1.hours * 60 + p1.minutes);
    return diffMinutes > 0 ? Math.round((diffMinutes / 60) * 10) / 10 : 0;
  }

  function renderVerifySessionsTable(sessions) {
    const tbody = document.getElementById('verifySessionsTableBody');
    if (!tbody) return;

    if (!sessions || sessions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">No duty sessions recorded yet.</td></tr>';
      return;
    }

    tbody.innerHTML = sessions.map(s => {
      const isVerified = s.is_verified;
      const isTimeoutNA = !s.check_out_time || s.check_out_time === '---' || String(s.check_out_time).toUpperCase() === 'N/A' || String(s.check_out_time).toUpperCase() === 'N\\A';
      const maxHours = getMaxHoursFromTimes(s.check_in_time, s.check_out_time);

      let currentHours = s.hours_rendered != null && Number(s.hours_rendered) > 0
        ? Math.min(maxHours, Number(s.hours_rendered))
        : maxHours;

      const statusBadge = isVerified
        ? `<span class="badge" style="background:#D1FAE5; color:#065F46; font-size:0.7rem; font-weight:700; padding:2px 8px; border-radius:4px; display:inline-block;">Credited</span>`
        : (isTimeoutNA 
            ? `<span class="badge" style="background:#F1F5F9; color:#64748B; font-size:0.7rem; font-weight:700; padding:2px 8px; border-radius:4px; display:inline-block;">N/A</span>`
            : `<span class="badge" style="background:rgba(245, 158, 11, 0.15); color:#B45309; font-size:0.7rem; font-weight:700; padding:2px 8px; border-radius:4px; display:inline-block;">Pending</span>`);

      const timeoutBadge = isTimeoutNA
        ? `<span class="badge" style="background: #F1F5F9; color: #64748B; font-size: 0.75rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; display: inline-block;">N/A</span>`
        : `<span class="badge" style="background:#F1F5F9; color:#334155; font-family: inherit; font-weight: 600; font-size: 0.8125rem; padding: 4px 10px; border-radius: 6px; display: inline-block;">${escapeHtml(formatTime12Hour(s.check_out_time))}</span>`;

      return `
        <tr data-attendance-id="${s.attendance_id}">
          <td class="col-date">
            <div style="font-weight: 700; color: var(--cwts-primary-dark, #0B3D2E); font-size: 0.875rem;">${escapeHtml(s.attendance_date || '---')}</div>
            <div style="margin-top: 4px;">${statusBadge}</div>
          </td>
          <td class="col-student">
            <div style="font-weight: 700; color: var(--text-main); font-size: 0.9375rem;">${escapeHtml(s.student_name)}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
              ${s.student_number && s.student_number !== '---' ? escapeHtml(s.student_number) + ' • ' : ''}${escapeHtml(s.course)}${s.section && s.section !== '---' ? ' (' + escapeHtml(String(s.section).toLowerCase().startsWith('section') ? s.section : 'Section ' + String(s.section).replace(/^sec\.?\s*/i, '')) + ')' : ''}
            </div>
          </td>
          <td class="col-time">
            <span class="badge" style="background:#F1F5F9; color:#334155; font-family: inherit; font-weight: 600; font-size: 0.8125rem; padding: 4px 10px; border-radius: 6px; display: inline-block;">${escapeHtml(formatTime12Hour(s.check_in_time))}</span>
          </td>
          <td class="col-time">
            ${timeoutBadge}
          </td>
          <td class="col-hours">
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
              <input 
                type="number" 
                step="0.5" 
                min="0" 
                max="${maxHours.toFixed(1)}" 
                data-max-hours="${maxHours.toFixed(1)}" 
                class="verify-hours-input" 
                value="${currentHours.toFixed(1)}" 
                title="Edit rendered hours" 
              />
              <span style="font-size: 0.8125rem; font-weight: 600; color: var(--text-muted);">hrs</span>
            </div>
          </td>
          <td class="col-action">
            <button 
              type="button" 
              class="btn ${isVerified ? 'btn-secondary' : 'btn-primary'} btn-sm credit-single-row-btn" 
              data-attendance-id="${s.attendance_id}" 
              style="padding: 6px 14px; font-size: 0.75rem; font-weight: 600; min-width: 105px;"
            >
              <span>${isVerified ? 'Update Credit' : 'Credit Hours'}</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach row button listeners
    document.querySelectorAll('.credit-single-row-btn').forEach(btn => {
      btn.addEventListener('click', async function () {
        const attId = this.getAttribute('data-attendance-id');
        const row = this.closest('tr');
        const hoursInput = row.querySelector('.verify-hours-input');
        const hours = Number(hoursInput?.value || 0);

        await creditSingleSession(attId, hours, this);
      });
    });

    // Real-time restriction: cannot exceed max duration from time in to time out
    document.querySelectorAll('.verify-hours-input').forEach(input => {
      input.addEventListener('input', function () {
        const max = parseFloat(this.getAttribute('data-max-hours') || '24');
        let val = parseFloat(this.value);
        if (isNaN(val)) return;
        if (val > max) {
          this.value = max.toFixed(1);
          showToast(`Hindi maaaring lumagpas sa ${max.toFixed(1)} hrs ang Rendered Hours batay sa Time In at Time Out. Pwede lang bumaba o sumakto.`, 'error');
        } else if (val < 0) {
          this.value = '0.0';
        }
      });

      input.addEventListener('change', function () {
        const max = parseFloat(this.getAttribute('data-max-hours') || '24');
        let val = parseFloat(this.value);
        if (isNaN(val) || val < 0) {
          this.value = '0.0';
        } else if (val > max) {
          this.value = max.toFixed(1);
        } else {
          this.value = val.toFixed(1);
        }
      });
    });
  }

  async function creditSingleSession(attendanceId, hours, btnEl) {
    if (!attendanceId) return;

    const row = btnEl ? btnEl.closest('tr') : null;
    const hoursInput = row ? row.querySelector('.verify-hours-input') : null;
    const maxHours = parseFloat(hoursInput?.getAttribute('data-max-hours') || '24');
    let validatedHours = Number(hours);
    if (isNaN(validatedHours) || validatedHours < 0) validatedHours = 0;
    if (validatedHours > maxHours) {
      validatedHours = maxHours;
      if (hoursInput) hoursInput.value = maxHours.toFixed(1);
      showToast(`Inayos sa maximum na ${maxHours.toFixed(1)} hrs ang Rendered Hours.`, 'info');
    }

    try {
      if (btnEl) btnEl.disabled = true;
      showToast('Crediting hours to student...', 'info');

      const res = await fetch('/api/community/hours/verify-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: [{
            attendance_id: attendanceId,
            hours_rendered: validatedHours,
            remarks: 'Verified & credited by Community Official'
          }]
        })
      });

      const result = await res.json();

      if (result.success) {
        showToast('Successfully credited service hours!', 'success');
        loadStudentsForDeployment(currentDeploymentId);
        loadAttendanceHistory(currentDeploymentId);
        loadSessionsForVerification(currentDeploymentId);
      } else {
        showToast(result.message || 'Failed to credit service hours.', 'error');
      }
    } catch (err) {
      console.error('Credit error:', err);
      showToast('Error connecting to server. Please try again.', 'error');
    } finally {
      if (btnEl) btnEl.disabled = false;
    }
  }

  async function creditAllHours() {
    const verifyAllBtn = document.getElementById('verifyAllHoursBtn');
    const rows = document.querySelectorAll('#verifySessionsTableBody tr');

    if (rows.length === 0) {
      showToast('No sessions available to credit.', 'error');
      return;
    }

    const records = [];
    rows.forEach(row => {
      const attId = row.getAttribute('data-attendance-id');
      if (!attId) return;

      const hoursInput = row.querySelector('.verify-hours-input');
      const maxHours = parseFloat(hoursInput?.getAttribute('data-max-hours') || '24');
      let hours = Number(hoursInput?.value || 0);
      if (isNaN(hours) || hours < 0) hours = 0;
      if (hours > maxHours) {
        hours = maxHours;
        if (hoursInput) hoursInput.value = maxHours.toFixed(1);
      }

      records.push({
        attendance_id: attId,
        hours_rendered: hours,
        remarks: 'Batch credited by Community Official'
      });
    });

    try {
      if (verifyAllBtn) verifyAllBtn.disabled = true;
      showToast('Crediting all student hours...', 'info');

      const res = await fetch('/api/community/hours/verify-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records })
      });

      const result = await res.json();

      if (result.success) {
        showToast(`Successfully credited ${result.creditedCount} session(s)!`, 'success');
        loadStudentsForDeployment(currentDeploymentId);
        loadAttendanceHistory(currentDeploymentId);
        loadSessionsForVerification(currentDeploymentId);
      } else {
        showToast(result.message || 'Failed to credit hours.', 'error');
      }
    } catch (err) {
      console.error('Credit all error:', err);
      showToast('Error connecting to server.', 'error');
    } finally {
      if (verifyAllBtn) verifyAllBtn.disabled = false;
    }
  }

  function renderEmptyRoster() {
    const tbody = document.getElementById('attRosterTableBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 36px 20px; color: var(--text-muted);">No assigned students found for this deployment.</td></tr>';
    }
  }

  function showToast(message, type) {
    const toast = document.getElementById('toastMessage');
    if (!toast) return;

    toast.textContent = message;
    toast.style.display = 'block';

    if (type === 'success') {
      toast.style.background = '#ECFDF5';
      toast.style.color = '#065F46';
      toast.style.border = '1px solid #A7F3D0';
    } else if (type === 'error') {
      toast.style.background = '#FEF2F2';
      toast.style.color = '#991B1B';
      toast.style.border = '1px solid #FECACA';
    } else {
      toast.style.background = '#EFF6FF';
      toast.style.color = '#1E40AF';
      toast.style.border = '1px solid #BFDBFE';
    }

    setTimeout(() => {
      toast.style.display = 'none';
    }, 5000);
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
