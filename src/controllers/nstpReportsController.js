/**
 * CWTSConnect — NSTP Coordinator Report Generation Controller
 * Handles query filtering and data preparation for 8 major institutional reports:
 *  1. student_records
 *  2. requirement_compliance
 *  3. community_requests
 *  4. deployment_records
 *  5. attendance_logs
 *  6. rendered_hours
 *  7. community_feedback
 *  8. evaluation_records
 */

const supabase = require('../config/supabaseClient');

// Strictly LSPU SC Undergraduate Programs
const UNDERGRADUATE_COURSES = [
  { abbr: 'BSA (Agri)', name: 'Bachelor of Science in Agriculture', aliases: ['bsa', 'bsagri', 'bs agri', 'agriculture'] },
  { abbr: 'BSAB', name: 'Bachelor of Science in Agricultural Business', aliases: ['bsab', 'agricultural business', 'agri business'] },
  { abbr: 'BSPsych', name: 'Bachelor of Science in Psychology', aliases: ['bspsych', 'bs psych', 'bsp', 'psychology'] },
  { abbr: 'BSOA', name: 'Bachelor of Science in Office Administration', aliases: ['bsoa', 'office administration'] },
  { abbr: 'BSBA', name: 'Bachelor of Science in Business Administration', aliases: ['bsba', 'business administration'] },
  { abbr: 'BSA (Acct)', name: 'Bachelor of Science in Accountancy', aliases: ['bsa', 'bsacct', 'bs acct', 'accountancy'] },
  { abbr: 'BSCS', name: 'Bachelor of Science in Computer Science', aliases: ['bscs', 'computer science'] },
  { abbr: 'BSIT', name: 'Bachelor of Science in Information Technology', aliases: ['bsit', 'information technology'] },
  { abbr: 'BSIS', name: 'Bachelor of Science in Information System', aliases: ['bsis', 'information system', 'information systems'] },
  { abbr: 'BSCrim', name: 'Bachelor of Science in Criminology', aliases: ['bscrim', 'bs crim', 'criminology', 'criminilogy'] },
  { abbr: 'BSABE', name: 'Bachelor of Science in Agricultural and Biosystems Engineering', aliases: ['bsabe', 'bsae', 'agricultural and biosystems engineering', 'biosystems engineering'] },
  { abbr: 'BSCpE', name: 'Bachelor of Science in Computer Engineering', aliases: ['bscpe', 'bsce', 'computer engineering'] },
  { abbr: 'BSME', name: 'Bachelor of Science in Mechanical Engineering', aliases: ['bsme', 'mechanical engineering'] },
  { abbr: 'BSIndTech', name: 'Bachelor of Science in Industrial Technology', aliases: ['bsindtech', 'bsitech', 'bsit-indtech', 'industrial technology'] },
  { abbr: 'BSHM', name: 'Bachelor of Science in Hospitality Management', aliases: ['bshm', 'hospitality management'] },
  { abbr: 'BSTM', name: 'Bachelor of Science in Tourism Management', aliases: ['bstm', 'tourism management'] },
  { abbr: 'BSED', name: 'Bachelor of Secondary Education', aliases: ['bsed', 'secondary education'] },
  { abbr: 'BEED', name: 'Bachelor of Elementary Education', aliases: ['beed', 'elementary education'] },
  { abbr: 'BECEd', name: 'Bachelor of Early Childhood Education', aliases: ['beced', 'early childhood education'] },
  { abbr: 'BPEd', name: 'Bachelor of Physical Education', aliases: ['bped', 'physical education'] },
  { abbr: 'BTVTEd', name: 'Bachelor of Technical - Vocational Teacher', aliases: ['btvted', 'btvte', 'technical - vocational teacher', 'technical vocational teacher'] },
  { abbr: 'BTLEd', name: 'Bachelor of Technology and Livelihood Education', aliases: ['btled', 'technology and livelihood education'] }
];

function getCourseAbbr(courseStr) {
  if (!courseStr) return '---';
  const raw = String(courseStr).trim();
  const s = raw.toLowerCase();
  for (const c of UNDERGRADUATE_COURSES) {
    if (s === c.abbr.toLowerCase() || s === c.name.toLowerCase() || s.includes(c.name.toLowerCase())) {
      return c.abbr;
    }
    if (c.aliases.some(alias => s === alias || s.includes(alias))) {
      if (c.abbr === 'BSIT' && (s.includes('industrial') || s.includes('indtech'))) continue;
      if (c.abbr === 'BSIndTech' && (s.includes('information') && !s.includes('industrial'))) continue;
      if (c.abbr === 'BSA (Agri)' && (s.includes('accountancy') || s.includes('acct'))) continue;
      if (c.abbr === 'BSA (Acct)' && (s.includes('agriculture') || s.includes('agri'))) continue;
      return c.abbr;
    }
  }
  return raw;
}

function matchCourseReport(studentCourse, filterVal) {
  if (!filterVal || filterVal === 'ALL' || filterVal === 'all') return true;
  if (!studentCourse) return false;
  const s = String(studentCourse).toLowerCase().trim();
  const f = String(filterVal).toLowerCase().trim();
  if (s === f) return true;

  const courseConfig = UNDERGRADUATE_COURSES.find(c =>
    c.abbr.toLowerCase() === f ||
    c.name.toLowerCase() === f ||
    c.aliases.includes(f)
  );

  if (courseConfig) {
    if (s === courseConfig.abbr.toLowerCase() || s === courseConfig.name.toLowerCase() || s.includes(courseConfig.name.toLowerCase())) {
      return true;
    }
    if (courseConfig.aliases.some(alias => s === alias || s.includes(alias))) {
      if (courseConfig.abbr === 'BSIT' && (s.includes('industrial') || s.includes('indtech'))) return false;
      if (courseConfig.abbr === 'BSIndTech' && (s.includes('information') && !s.includes('industrial'))) return false;
      if (courseConfig.abbr === 'BSA (Agri)' && (s.includes('accountancy') || s.includes('acct'))) return false;
      if (courseConfig.abbr === 'BSA (Acct)' && (s.includes('agriculture') || s.includes('agri'))) return false;
      return true;
    }
  }

  return s.includes(f) || f.includes(s);
}

function matchSectionReport(studentSection, filterVal) {
  if (!filterVal || filterVal === 'ALL' || filterVal === 'all') return true;
  if (!studentSection) return false;
  const s = String(studentSection).toLowerCase().trim();
  const f = String(filterVal).toLowerCase().trim();
  if (s === f) return true;
  if (s.includes(f) || f.includes(s)) return true;
  const letterMatch = s.match(/\b([a-d])\b/i);
  const filterLetterMatch = f.match(/\b([a-d])\b/i);
  if (letterMatch && filterLetterMatch && letterMatch[1].toUpperCase() === filterLetterMatch[1].toUpperCase()) {
    return true;
  }
  return false;
}

function matchDateRange(dateVal, dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return true;
  if (!dateVal) return false;

  let dStr = '';
  if (typeof dateVal === 'string') {
    dStr = dateVal.slice(0, 10);
  } else if (dateVal instanceof Date) {
    dStr = dateVal.toISOString().slice(0, 10);
  } else {
    dStr = String(dateVal).slice(0, 10);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return false;

  if (dateFrom && dStr < dateFrom) return false;
  if (dateTo && dStr > dateTo) return false;
  return true;
}

function matchDeploymentDateRange(startDateVal, endDateVal, dateFrom, dateTo) {
  if (!dateFrom && !dateTo) return true;
  const start = startDateVal ? String(startDateVal).slice(0, 10) : '';
  const end = endDateVal ? String(endDateVal).slice(0, 10) : start;
  const depDate = start || end;
  if (!depDate) return false;

  if (dateFrom) {
    if (end && end < dateFrom) return false;
    if (!end && start < dateFrom) return false;
  }
  if (dateTo) {
    if (start && start > dateTo) return false;
    if (!start && end > dateTo) return false;
  }
  return true;
}

/**
 * GET /api/nstp/reports/generate
 * Query params: type, course, section, communityId, status, dateFrom, dateTo
 */
async function generateReport(req, res) {
  try {
    const {
      type = 'student_records',
      course = 'ALL',
      section = 'ALL',
      communityId = 'ALL',
      status = 'ALL',
      dateFrom = '',
      dateTo = ''
    } = req.query;

    const metadata = {
      reportType: type,
      generatedAt: new Date().toISOString(),
      academicYear: 'A.Y. 2025–2026',
      filters: { course, section, communityId, status, dateFrom, dateTo }
    };

    let reportData = {
      title: '',
      subtitle: '',
      columns: [],
      rows: [],
      summaryMetrics: {}
    };

    switch (type) {
      // 1. STUDENT RECORDS
      case 'student_records': {
        reportData.title = 'Official CWTS Student Volunteer Masterlist';
        reportData.subtitle = 'Enrolled CWTS Students Academic & Deployment Profiling';
        reportData.columns = [
          { key: 'student_number', label: 'Student Number' },
          { key: 'full_name', label: 'Full Name' },
          { key: 'course', label: 'Course' },
          { key: 'section', label: 'Section' },
          { key: 'contact_number', label: 'Contact Number' },
          { key: 'status', label: 'Profile Status' }
        ];

        const { data: students, error: stuErr } = await supabase
          .from('users')
          .select(`
            user_id,
            email,
            created_at,
            cmo_compliance_status,
            profile_status,
            account_status,
            student_profiles (
              profile_id,
              full_name,
              student_number,
              course,
              section,
              year_level,
              contact_number
            )
          `)
          .eq('role', 'student')
          .order('created_at', { ascending: false });

        if (stuErr) throw stuErr;

        let rows = (students || []).map(s => {
          const prof = Array.isArray(s.student_profiles) ? (s.student_profiles[0] || {}) : (s.student_profiles || {});
          const isCompleted = Boolean(prof.full_name && prof.student_number && prof.course);
          return {
            student_number: prof.student_number || '---',
            full_name: prof.full_name || s.email,
            course: getCourseAbbr(prof.course),
            raw_course: prof.course || '',
            section: prof.section ? (String(prof.section).startsWith('Sec') ? prof.section : `Section ${prof.section}`) : '---',
            raw_section: prof.section || '',
            contact_number: prof.contact_number || '---',
            status: isCompleted ? 'Completed' : 'Pending Review',
            raw_date: s.created_at
          };
        });

        if (course !== 'ALL') rows = rows.filter(r => matchCourseReport(r.raw_course, course));
        if (section !== 'ALL') rows = rows.filter(r => matchSectionReport(r.raw_section, section));
        if (status !== 'ALL') {
          rows = rows.filter(r => r.status.toLowerCase() === status.toLowerCase() || (status === 'Pending' && r.status === 'Pending Review'));
        }
        if (dateFrom || dateTo) {
          rows = rows.filter(r => matchDateRange(r.raw_date, dateFrom, dateTo));
        }

        reportData.rows = rows;
        reportData.summaryMetrics = {};
        break;
      }

      // 2. REQUIREMENT COMPLIANCE
      case 'requirement_compliance': {
        reportData.title = 'CHED CMO Requirement Compliance Audit Report';
        reportData.subtitle = 'Verification Audit of Medical Certificate, Parent Consent & Waivers';
        reportData.columns = [
          { key: 'student_number', label: 'Student No.' },
          { key: 'student_name', label: 'Student Name' },
          { key: 'course', label: 'Course' },
          { key: 'medical_cert', label: 'Medical Clearance' },
          { key: 'parent_consent', label: 'Parent Consent' },
          { key: 'waiver', label: 'Liability Waiver' },
          { key: 'overall_status', label: 'Overall Status' }
        ];

        const { data: students, error: stuErr } = await supabase
          .from('users')
          .select(`
            user_id,
            email,
            created_at,
            cmo_compliance_status,
            student_profiles (
              full_name,
              student_number,
              course,
              section
            )
          `)
          .eq('role', 'student');

        if (stuErr) throw stuErr;

        const { data: allReqs, error: reqErr } = await supabase
          .from('student_cmo_requirements')
          .select('requirement_id, user_id, requirement_type, status, created_at, uploaded_at, reviewed_at');

        if (reqErr) throw reqErr;

        const reqMap = new Map();
        const reqDateMap = new Map();
        (allReqs || []).forEach(r => {
          if (!reqMap.has(r.user_id)) reqMap.set(r.user_id, {});
          reqMap.get(r.user_id)[r.requirement_type] = r.status;
          const rDate = r.uploaded_at || r.created_at || r.reviewed_at;
          if (rDate) {
            const cur = reqDateMap.get(r.user_id);
            if (!cur || rDate > cur) reqDateMap.set(r.user_id, rDate);
          }
        });

        const formatDocStatus = (st) => {
          if (st === 'approved') return 'Verified';
          if (st === 'pending') return 'Pending Review';
          if (st === 'rejected') return 'Rejected';
          return 'Missing';
        };

        let rows = (students || []).map(s => {
          const prof = Array.isArray(s.student_profiles) ? (s.student_profiles[0] || {}) : (s.student_profiles || {});
          const r = reqMap.get(s.user_id) || {};

          const medStatus = formatDocStatus(r.medical_certificate);
          const waiverStatus = formatDocStatus(r.notarized_parent_waiver);
          const idStatus = formatDocStatus(r.validated_student_id || r.valid_parent_id);

          let overall = 'Incomplete';
          if (s.cmo_compliance_status === 'compliant' || (r.medical_certificate === 'approved' && r.notarized_parent_waiver === 'approved' && r.validated_student_id === 'approved' && r.valid_parent_id === 'approved')) {
            overall = 'Fully Compliant';
          } else if (s.cmo_compliance_status === 'pending_review' || r.medical_certificate === 'pending' || r.notarized_parent_waiver === 'pending' || r.validated_student_id === 'pending' || r.valid_parent_id === 'pending') {
            overall = 'In Review';
          }

          return {
            student_number: prof.student_number || '---',
            student_name: prof.full_name || s.email,
            course: getCourseAbbr(prof.course),
            raw_course: prof.course || '',
            section: prof.section || '',
            medical_cert: medStatus,
            parent_consent: waiverStatus,
            waiver: idStatus,
            overall_status: overall,
            raw_date: reqDateMap.get(s.user_id) || s.created_at
          };
        });

        if (course !== 'ALL') rows = rows.filter(r => matchCourseReport(r.raw_course, course));
        if (section !== 'ALL') rows = rows.filter(r => matchSectionReport(r.section, section));
        if (status !== 'ALL') {
          if (status === 'Completed' || status === 'Fully Compliant') {
            rows = rows.filter(r => r.overall_status === 'Fully Compliant');
          } else if (status === 'Pending' || status === 'In Review') {
            rows = rows.filter(r => r.overall_status === 'In Review');
          } else {
            rows = rows.filter(r => r.overall_status.toLowerCase() === status.toLowerCase());
          }
        }
        if (dateFrom || dateTo) {
          rows = rows.filter(r => matchDateRange(r.raw_date, dateFrom, dateTo));
        }

        reportData.rows = rows;
        reportData.summaryMetrics = {};
        break;
      }

      // 3. COMMUNITY REQUESTS
      case 'community_requests': {
        reportData.title = 'Partner Community Service Requests Summary';
        reportData.subtitle = 'Endorsed Barangay Activity Proposals & Project Allocations';
        reportData.columns = [
          { key: 'request_id', label: 'Req ID' },
          { key: 'barangay', label: 'Barangay / Partner' },
          { key: 'activity_type', label: 'Activity Program' },
          { key: 'target_date', label: 'Target Date' },
          { key: 'requested_by', label: 'Community Official' },
          { key: 'status', label: 'Approval Status' }
        ];

        const { data: requests, error: reqErr } = await supabase
          .from('community_requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (reqErr) throw reqErr;

        const { data: deps } = await supabase
          .from('deployments')
          .select(`
            request_id,
            deployment_students (
              student_user_id
            )
          `);

        const { data: studentProfiles } = await supabase
          .from('student_profiles')
          .select('user_id, course, section');

        const profMap = new Map();
        (studentProfiles || []).forEach(p => profMap.set(p.user_id, p));

        const reqStudentMap = new Map();
        (deps || []).forEach(d => {
          if (!d.request_id) return;
          if (!reqStudentMap.has(d.request_id)) reqStudentMap.set(d.request_id, []);
          (d.deployment_students || []).forEach(ds => {
            const p = profMap.get(ds.student_user_id);
            if (p) reqStudentMap.get(d.request_id).push(p);
          });
        });

        let rows = (requests || []).map(r => {
          const shortId = `REQ-${r.request_id.slice(0, 8).toUpperCase()}`;
          const targetDate = r.preferred_start_date
            ? new Date(r.preferred_start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : (r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '---');

          let statusFormatted = 'Pending Review';
          if (r.request_status === 'approved') statusFormatted = 'Approved';
          else if (r.request_status === 'completed') statusFormatted = 'Completed';
          else if (r.request_status === 'rejected') statusFormatted = 'Rejected';

          const attachedStudents = reqStudentMap.get(r.request_id) || [];

          return {
            request_id: shortId,
            barangay: r.community_name || (r.barangay ? `Brgy. ${r.barangay}` : 'Partner Community'),
            activity_type: r.activity_title || r.activity_type || 'CWTS Outreach',
            target_date: targetDate,
            requested_by: r.barangay ? `Brgy. Official (${r.barangay})` : 'Community Liaison',
            status: statusFormatted,
            raw_date: r.preferred_start_date || r.created_at,
            attached_students: attachedStudents
          };
        });

        if (course !== 'ALL') {
          rows = rows.filter(r => {
            if (r.attached_students.length > 0) {
              return r.attached_students.some(s => matchCourseReport(s.course, course));
            }
            return true;
          });
        }

        if (section !== 'ALL') {
          rows = rows.filter(r => {
            if (r.attached_students.length > 0) {
              return r.attached_students.some(s => matchSectionReport(s.section, section));
            }
            return true;
          });
        }

        if (status !== 'ALL') {
          if (status === 'Completed') {
            rows = rows.filter(r => r.status === 'Completed' || r.status === 'Approved');
          } else if (status === 'Pending') {
            rows = rows.filter(r => r.status === 'Pending Review');
          } else {
            rows = rows.filter(r => r.status.toLowerCase() === status.toLowerCase());
          }
        }

        if (dateFrom || dateTo) {
          rows = rows.filter(r => matchDateRange(r.raw_date, dateFrom, dateTo));
        }

        reportData.rows = rows;
        reportData.summaryMetrics = {};
        break;
      }

      // 4. DEPLOYMENT RECORDS
      case 'deployment_records': {
        reportData.title = 'Official CWTS Deployment Master Records';
        reportData.subtitle = 'Batch Schedules, Partner Venues & Assigned Student Volunteers';
        reportData.columns = [
          { key: 'batch_code', label: 'Batch Code' },
          { key: 'project_name', label: 'Deployment Project' },
          { key: 'partner_community', label: 'Partner Barangay' },
          { key: 'assigned_volunteers', label: 'Volunteers' },
          { key: 'schedule', label: 'Schedule' },
          { key: 'status', label: 'Deployment Status' }
        ];

        const { data: deps, error: depErr } = await supabase
          .from('deployments')
          .select(`
            deployment_id,
            deployment_batch_name,
            deployment_status,
            deployment_start_date,
            deployment_end_date,
            created_at,
            request_id,
            community_requests (
              community_name,
              barangay,
              municipality,
              activity_title
            ),
            deployment_students (
              deployment_student_id,
              student_user_id,
              deployment_student_status
            )
          `)
          .order('created_at', { ascending: false });

        if (depErr) throw depErr;

        const { data: studentProfiles } = await supabase
          .from('student_profiles')
          .select('user_id, course, section');
        const profMap = new Map();
        (studentProfiles || []).forEach(p => profMap.set(p.user_id, p));

        let rows = (deps || []).map(d => {
          const batchCode = `DEP-${d.deployment_id.slice(0, 8).toUpperCase()}`;
          const activeStudents = (d.deployment_students || []).filter(s => s.deployment_student_status !== 'removed');
          const volunteers = `${activeStudents.length} Student${activeStudents.length === 1 ? '' : 's'}`;

          let partner = 'Partner Community';
          if (d.community_requests) {
            partner = d.community_requests.community_name || (d.community_requests.barangay ? `Brgy. ${d.community_requests.barangay}` : 'Partner Community');
          }

          let schedule = 'Scheduled Deployment';
          if (d.deployment_start_date) {
            schedule = new Date(d.deployment_start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          }

          let statusLabel = 'Active Ongoing';
          if (d.deployment_status === 'completed') statusLabel = 'Completed';
          else if (d.deployment_status === 'cancelled') statusLabel = 'Cancelled';
          else if (d.deployment_status === 'pending') statusLabel = 'Pending Review';

          const depStudents = activeStudents.map(s => profMap.get(s.student_user_id)).filter(Boolean);

          return {
            batch_code: batchCode,
            project_name: d.deployment_batch_name || (d.community_requests?.activity_title || 'Community Outreach'),
            partner_community: partner,
            assigned_volunteers: volunteers,
            volunteer_count: activeStudents.length,
            schedule: schedule,
            status: statusLabel,
            start_date: d.deployment_start_date,
            created_at: d.created_at,
            students: depStudents
          };
        });

        if (course !== 'ALL') {
          rows = rows.filter(r => r.students.some(s => matchCourseReport(s.course, course)));
        }

        if (section !== 'ALL') {
          rows = rows.filter(r => r.students.some(s => matchSectionReport(s.section, section)));
        }

        if (status !== 'ALL') {
          if (status === 'Completed') {
            rows = rows.filter(r => r.status === 'Completed');
          } else if (status === 'Pending') {
            rows = rows.filter(r => r.status === 'Active Ongoing' || r.status === 'Pending Review');
          } else {
            rows = rows.filter(r => r.status.toLowerCase() === status.toLowerCase());
          }
        }

        if (dateFrom || dateTo) {
          rows = rows.filter(r => matchDateRange(r.start_date || r.created_at, dateFrom, dateTo));
        }

        reportData.rows = rows;
        reportData.summaryMetrics = {};
        break;
      }

      // 5. ATTENDANCE LOGS
      case 'attendance_logs': {
        reportData.title = 'Official CWTS Student Attendance Audit Records';
        reportData.subtitle = 'Barangay On-Site Time-In/Out & Supervisor Verifications';
        reportData.columns = [
          { key: 'date', label: 'Date' },
          { key: 'student_name', label: 'Student Volunteer' },
          { key: 'course', label: 'Course' },
          { key: 'community', label: 'Community Site' },
          { key: 'time_in', label: 'Time In' },
          { key: 'time_out', label: 'Time Out' },
          { key: 'hours_rendered', label: 'Hours Credited' },
          { key: 'status', label: 'Status' }
        ];

        const { data: logs, error: logErr } = await supabase
          .from('attendance_records')
          .select(`
            attendance_id,
            student_user_id,
            deployment_id,
            attendance_date,
            check_in_time,
            check_out_time,
            attendance_status,
            hours_rendered,
            verified_at,
            verified_by,
            student_remarks,
            created_at,
            deployments (
              deployment_batch_name,
              community_requests (
                community_name,
                barangay
              )
            )
          `)
          .order('attendance_date', { ascending: false });

        if (logErr) throw logErr;

        const { data: studentProfiles } = await supabase
          .from('student_profiles')
          .select('user_id, full_name, student_number, course, section');

        const studentProfMap = new Map();
        (studentProfiles || []).forEach(p => studentProfMap.set(p.user_id, p));

        const formatTime = (t) => {
          if (!t) return '---';
          try {
            const parts = String(t).split(':');
            let h = parseInt(parts[0], 10);
            const m = parts[1] || '00';
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
          } catch (e) {
            return String(t);
          }
        };

        let rows = (logs || []).map(l => {
          const prof = studentProfMap.get(l.student_user_id) || {};
          let customHours = null;
          if (l.student_remarks) {
            const match = String(l.student_remarks).match(/\[CREDITED:([0-9.]+)\]/);
            if (match) {
              const parsedVal = parseFloat(match[1]);
              if (!isNaN(parsedVal)) customHours = parsedVal;
            }
          }
          const isVerified = Boolean(l.verified_at || l.verified_by || (l.student_remarks && /\[CREDITED:[0-9.]+\]/.test(l.student_remarks)));
          const hrs = (customHours !== null) ? customHours : Number(l.hours_rendered || 0);

          let siteName = 'Deployment Venue';
          if (l.deployments) {
            siteName = l.deployments.community_requests?.community_name || l.deployments.deployment_batch_name || 'Community Site';
          }

          return {
            date: l.attendance_date || '---',
            student_name: prof.full_name || 'Student Volunteer',
            course: getCourseAbbr(prof.course),
            raw_course: prof.course || '',
            section: prof.section || '',
            community: siteName,
            time_in: formatTime(l.check_in_time),
            time_out: formatTime(l.check_out_time),
            hours_rendered: `${hrs.toFixed(1)}h`,
            raw_hours: hrs,
            status: isVerified ? 'Verified' : 'Pending',
            raw_date: l.attendance_date || l.created_at
          };
        });

        if (course !== 'ALL') rows = rows.filter(r => matchCourseReport(r.raw_course, course));
        if (section !== 'ALL') rows = rows.filter(r => matchSectionReport(r.section, section));
        if (status !== 'ALL') {
          if (status === 'Completed' || status === 'Verified') {
            rows = rows.filter(r => r.status === 'Verified');
          } else if (status === 'Pending') {
            rows = rows.filter(r => r.status === 'Pending');
          } else {
            rows = rows.filter(r => r.status.toLowerCase() === status.toLowerCase());
          }
        }
        if (dateFrom || dateTo) {
          rows = rows.filter(r => matchDateRange(r.raw_date, dateFrom, dateTo));
        }

        reportData.rows = rows;
        reportData.summaryMetrics = {};
        break;
      }

      // 6. RENDERED SERVICE HOURS
      case 'rendered_hours': {
        reportData.title = 'Cumulative Rendered Service Hours Audit Summary';
        reportData.subtitle = 'Mandated 90-Hour CWTS Civic Service Fulfillment Audit';
        reportData.columns = [
          { key: 'student_number', label: 'Student No.' },
          { key: 'student_name', label: 'Student Name' },
          { key: 'course', label: 'Course' },
          { key: 'total_rendered', label: 'Hours Rendered' },
          { key: 'target_hours', label: 'Target Hours' },
          { key: 'progress', label: 'Completion %' },
          { key: 'status', label: 'Clearance Status' }
        ];

        const { data: students, error: stuErr } = await supabase
          .from('users')
          .select(`
            user_id,
            email,
            created_at,
            student_profiles (
              full_name,
              student_number,
              course,
              section
            )
          `)
          .eq('role', 'student');

        if (stuErr) throw stuErr;

        const { data: logs, error: logErr } = await supabase
          .from('attendance_records')
          .select('student_user_id, hours_rendered, verified_at, verified_by, student_remarks, attendance_date, created_at');

        if (logErr) throw logErr;

        // When date range is specified, only count hours rendered within the requested window
        const targetLogs = (dateFrom || dateTo)
          ? (logs || []).filter(l => matchDateRange(l.attendance_date || l.created_at, dateFrom, dateTo))
          : (logs || []);

        const studentCreditedMap = new Map();
        targetLogs.forEach(l => {
          let customHours = null;
          if (l.student_remarks) {
            const match = String(l.student_remarks).match(/\[CREDITED:([0-9.]+)\]/);
            if (match) {
              const parsedVal = parseFloat(match[1]);
              if (!isNaN(parsedVal)) customHours = parsedVal;
            }
          }
          const isVerified = Boolean(l.verified_at || l.verified_by || (l.student_remarks && /\[CREDITED:[0-9.]+\]/.test(l.student_remarks)));
          if (isVerified) {
            const val = (customHours !== null) ? customHours : Number(l.hours_rendered || 0);
            studentCreditedMap.set(l.student_user_id, (studentCreditedMap.get(l.student_user_id) || 0) + val);
          }
        });

        const targetHours = 90.0;
        let rows = (students || []).map(s => {
          const prof = Array.isArray(s.student_profiles) ? (s.student_profiles[0] || {}) : (s.student_profiles || {});
          const totalHrs = studentCreditedMap.get(s.user_id) || 0;
          const progressPct = ((totalHrs / targetHours) * 100).toFixed(1);
          const isCompleted = totalHrs >= targetHours;

          return {
            student_number: prof.student_number || '---',
            student_name: prof.full_name || s.email,
            course: getCourseAbbr(prof.course),
            raw_course: prof.course || '',
            section: prof.section || '',
            total_rendered: `${totalHrs.toFixed(1)}h`,
            raw_hours: totalHrs,
            target_hours: `${targetHours.toFixed(1)}h`,
            progress: `${Math.min(100, Number(progressPct)).toFixed(1)}%`,
            status: isCompleted ? 'Completed' : 'In Progress',
            created_at: s.created_at
          };
        });

        if (course !== 'ALL') rows = rows.filter(r => matchCourseReport(r.raw_course, course));
        if (section !== 'ALL') rows = rows.filter(r => matchSectionReport(r.section, section));
        if (status !== 'ALL') {
          if (status === 'Completed') rows = rows.filter(r => r.status === 'Completed');
          else if (status === 'Pending') rows = rows.filter(r => r.status === 'In Progress');
        }

        reportData.rows = rows;
        reportData.summaryMetrics = {};
        break;
      }

      // 7. COMMUNITY FEEDBACK
      case 'community_feedback': {
        reportData.title = 'Partner Community Feedback & Commendation Summary';
        reportData.subtitle = 'Qualitative Assessment & Ratings from Community Supervisors';
        reportData.columns = [
          { key: 'date', label: 'Date' },
          { key: 'community', label: 'Barangay / Community' },
          { key: 'official_name', label: 'Supervisor' },
          { key: 'rating', label: 'Rating (out of 5)' },
          { key: 'feedback_comment', label: 'Feedback & Remarks' }
        ];

        const { data: fbData, error: fbErr } = await supabase
          .from('student_feedback')
          .select(`
            feedback_id,
            deployment_id,
            student_user_id,
            community_name,
            activity_title,
            rating,
            feedback_type,
            comments,
            submitted_by,
            date_submitted,
            created_at
          `)
          .order('created_at', { ascending: false });

        if (fbErr) throw fbErr;

        const { data: studentProfiles } = await supabase
          .from('student_profiles')
          .select('user_id, course, section');
        const profMap = new Map();
        (studentProfiles || []).forEach(p => profMap.set(p.user_id, p));

        let rows = (fbData || []).map(f => {
          const prof = profMap.get(f.student_user_id) || {};
          const dateStr = f.date_submitted || f.created_at;
          const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '---';
          const ratingNum = Number(f.rating) || 5;

          return {
            date: formattedDate,
            community: f.community_name || 'Partner Community',
            official_name: f.submitted_by || 'Community Supervisor',
            rating: `${ratingNum.toFixed(1)} / 5.0 ★`,
            raw_rating: ratingNum,
            feedback_comment: f.comments || 'No remarks provided.',
            raw_date: dateStr,
            raw_course: prof.course || '',
            raw_section: prof.section || ''
          };
        });

        if (course !== 'ALL') {
          rows = rows.filter(r => r.raw_course ? matchCourseReport(r.raw_course, course) : true);
        }
        if (section !== 'ALL') {
          rows = rows.filter(r => r.raw_section ? matchSectionReport(r.raw_section, section) : true);
        }
        if (status !== 'ALL') {
          if (status === 'Completed') {
            rows = rows.filter(r => (r.raw_rating || 0) >= 4.0);
          } else if (status === 'Pending') {
            rows = rows.filter(r => (r.raw_rating || 0) < 4.0);
          }
        }
        if (dateFrom || dateTo) {
          rows = rows.filter(r => matchDateRange(r.raw_date, dateFrom, dateTo));
        }

        reportData.rows = rows;
        reportData.summaryMetrics = {};
        break;
      }

      // 8. EVALUATION RECORDS
      case 'evaluation_records': {
        reportData.title = 'Official CWTS Student Performance Evaluation Report';
        reportData.subtitle = 'Community Supervisor Multi-Criteria Scores & Final Academic Grades';
        reportData.columns = [
          { key: 'student_number', label: 'Student No.' },
          { key: 'student_name', label: 'Student Volunteer' },
          { key: 'course', label: 'Course' },
          { key: 'punctuality', label: 'Punctuality' },
          { key: 'engagement', label: 'Engagement' },
          { key: 'teamwork', label: 'Teamwork' },
          { key: 'initiative', label: 'Initiative' },
          { key: 'overall_score', label: 'Overall (5.0)' },
          { key: 'grade', label: 'Final Grade' }
        ];

        const { data: evals, error: evalErr } = await supabase
          .from('student_evaluations')
          .select('*')
          .order('created_at', { ascending: false });

        if (evalErr) throw evalErr;

        const { data: studentProfiles } = await supabase
          .from('student_profiles')
          .select('user_id, full_name, student_number, course, section');

        const studentProfMap = new Map();
        (studentProfiles || []).forEach(p => studentProfMap.set(p.user_id, p));

        let rows = (evals || []).map(e => {
          const prof = studentProfMap.get(e.student_user_id) || {};
          const punc = Number(e.rating_punctuality || e.criteria?.punctuality?.score || 0).toFixed(1);
          const eng = Number(e.rating_community_engagement || e.criteria?.community_engagement?.score || 0).toFixed(1);
          const team = Number(e.rating_teamwork || e.criteria?.teamwork?.score || 0).toFixed(1);
          const init = Number(e.rating_initiative_attitude || e.criteria?.initiative_attitude?.score || 0).toFixed(1);
          const overall = Number(e.overall_score || 0).toFixed(2);
          const grade = e.performance_grade || 'Satisfactory';

          return {
            student_number: prof.student_number || '---',
            student_name: e.student_name || prof.full_name || 'Student Volunteer',
            course: getCourseAbbr(prof.course || e.course),
            raw_course: prof.course || e.course || '',
            section: prof.section || '',
            punctuality: punc,
            engagement: eng,
            teamwork: team,
            initiative: init,
            overall_score: overall,
            raw_score: Number(overall),
            grade: grade,
            raw_date: e.evaluation_date || e.created_at
          };
        });

        if (course !== 'ALL') rows = rows.filter(r => matchCourseReport(r.raw_course, course));
        if (section !== 'ALL') rows = rows.filter(r => matchSectionReport(r.section, section));
        if (status !== 'ALL') {
          if (status === 'Completed') {
            rows = rows.filter(r => (r.raw_score || 0) >= 3.0);
          } else if (status === 'Pending') {
            rows = rows.filter(r => (r.raw_score || 0) < 3.0);
          }
        }
        if (dateFrom || dateTo) {
          rows = rows.filter(r => matchDateRange(r.raw_date, dateFrom, dateTo));
        }

        reportData.rows = rows;
        reportData.summaryMetrics = {};
        break;
      }

      default:
        return res.status(400).json({ success: false, message: 'Invalid report type requested.' });
    }

    return res.json({
      success: true,
      metadata,
      report: reportData
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while generating report.'
    });
  }
}

module.exports = {
  generateReport
};
