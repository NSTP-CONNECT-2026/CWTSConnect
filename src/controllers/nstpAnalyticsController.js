/**
 * NSTPConnect — Comprehensive Analytics Controller for NSTP Coordinator
 * Aggregates live data across the 7 major system records:
 *  1. Requirement Compliance (CMO)
 *  2. Community Requests
 *  3. Deployment Records
 *  4. Attendance Logs
 *  5. Rendered Service Hours
 *  6. Community Feedback
 *  7. Student Evaluations
 */

const supabase = require('../config/supabaseClient');
const { getAllCommunityRequests } = require('../services/communityRequestService');

/**
 * Normalizes course string to acronym (e.g. "Bachelor of Science in Information Technology" -> "BSIT")
 */
function normalizeCourseAcronym(courseStr) {
  if (!courseStr) return 'Other';
  const c = courseStr.trim();
  if (/information technology/i.test(c) || /^bsit$/i.test(c)) return 'BSIT';
  if (/computer science/i.test(c) || /^bscs$/i.test(c)) return 'BSCS';
  if (/business administration/i.test(c) || /^bsba$/i.test(c)) return 'BSBA';
  if (/criminology/i.test(c) || /^bs\s*crim$/i.test(c)) return 'BS Crim';
  if (/hospitality/i.test(c) || /^bshm$/i.test(c) || /^bshrm$/i.test(c)) return 'BSHM';
  if (/tourism/i.test(c) || /^bstm$/i.test(c)) return 'BSTM';
  if (/secondary education/i.test(c) || /^bsed$/i.test(c)) return 'BSED';
  if (/elementary education/i.test(c) || /^beed$/i.test(c)) return 'BEED';
  if (/accountancy/i.test(c) || /^bsa\s*\(acct\)$/i.test(c)) return 'BSA (Acct)';
  if (/agriculture/i.test(c) || /^bsa\s*\(agri\)$/i.test(c)) return 'BSA (Agri)';
  return c;
}

/**
 * GET /api/nstp/analytics
 * Returns comprehensive aggregated metrics, distributions, and chart series from live database
 */
async function getNstpAnalytics(req, res) {
  try {
    // 1. Fetch Users
    const { data: allUsers, error: usersErr } = await supabase
      .from('users')
      .select('user_id, email, role, cmo_compliance_status, account_status');

    if (usersErr) throw new Error('Failed to fetch users: ' + usersErr.message);

    const userList = allUsers || [];
    const students = userList.filter(u => u.role === 'student');
    const communityPartners = userList.filter(u => u.role === 'community_official');
    const totalStudents = students.length;

    const usersMetrics = {
      total: totalStudents + communityPartners.length,
      students: totalStudents,
      communityPartners: communityPartners.length
    };

    // 2. Fetch Student Profiles
    const { data: profiles } = await supabase
      .from('student_profiles')
      .select('user_id, full_name, student_number, course, section, year_level');

    const profileMap = new Map();
    (profiles || []).forEach(p => profileMap.set(p.user_id, p));

    // 3. Fetch CMO Requirements
    const { data: cmoReqs } = await supabase
      .from('student_cmo_requirements')
      .select('requirement_id, user_id, requirement_type, status');

    const studentReqsMap = new Map();
    (cmoReqs || []).forEach(r => {
      if (!studentReqsMap.has(r.user_id)) studentReqsMap.set(r.user_id, []);
      studentReqsMap.get(r.user_id).push(r);
    });

    let compliantStudents = 0;
    let pendingStudents = 0;
    let incompleteStudents = 0;

    students.forEach(s => {
      const reqs = studentReqsMap.get(s.user_id) || [];
      const approved = reqs.filter(r => r.status === 'approved').length;
      const pending = reqs.filter(r => r.status === 'pending').length;

      const isCompliant = s.cmo_compliance_status === 'compliant' || approved >= 4;
      const isPending = !isCompliant && (s.cmo_compliance_status === 'pending_review' || (approved + pending === 4 && pending > 0));

      if (isCompliant) {
        compliantStudents++;
      } else if (isPending) {
        pendingStudents++;
      } else {
        incompleteStudents++;
      }
    });

    const complianceRate = totalStudents > 0
      ? ((compliantStudents / totalStudents) * 100).toFixed(1) + '%'
      : '0.0%';

    const complianceData = {
      total: totalStudents,
      compliant: compliantStudents,
      pending: pendingStudents,
      incomplete: incompleteStudents,
      rate: complianceRate
    };

    // 4. Fetch Community Requests (Synced with community-requests.html via communityRequestService)
    const reqList = await getAllCommunityRequests({});
    const totalRequests = reqList.length;

    // Filter categories aligned with community-requests.html
    const expiredRequests = reqList.filter(r => r.is_expired).length;
    const pendingRequests = reqList.filter(r => !r.is_expired && (r.request_status || '').toLowerCase() === 'pending').length;
    const approvedRequests = reqList.filter(r => !r.is_expired && (r.request_status || '').toLowerCase() === 'approved').length;
    const rejectedRequests = reqList.filter(r => ['rejected', 'cancelled'].includes((r.request_status || '').toLowerCase())).length;

    // Of the approved requests, correlate completed vs active/ongoing deployment
    const completedActivities = reqList.filter(r => !r.is_expired && r.deployment_status === 'completed').length;
    const deployedActiveActivities = reqList.filter(r => !r.is_expired && r.is_deployed && r.deployment_status !== 'completed').length;
    const availableApprovedRequests = reqList.filter(r => !r.is_expired && !r.is_deployed && (r.request_status || '').toLowerCase() === 'approved').length;

    // 5. Fetch Deployments & Assigned Students
    const { data: deps } = await supabase
      .from('deployments')
      .select('deployment_id, deployment_batch_name, deployment_status, request_id, deployment_start_date, deployment_end_date');

    const { data: depStudents } = await supabase
      .from('deployment_students')
      .select('deployment_student_id, deployment_id, student_user_id, deployment_student_status');

    const depList = deps || [];
    const depStudList = depStudents || [];

    const activeBatches = depList.filter(d => d.deployment_status === 'active' || d.deployment_status === 'ongoing').length;
    const completedBatches = depList.filter(d => d.deployment_status === 'completed').length;
    const deployedStudentIds = new Set(
      depStudList
        .filter(ds => ds.deployment_student_status !== 'removed')
        .map(ds => ds.student_user_id)
    );

    const deploymentMetrics = {
      totalBatches: depList.length,
      activeBatches: activeBatches,
      completedBatches: completedBatches,
      studentsDeployed: deployedStudentIds.size,
      activeCommunities: depList.length
    };

    const requestMetrics = {
      total: totalRequests,
      approved: approvedRequests,
      pending: pendingRequests,
      completed: completedActivities,
      rejected: rejectedRequests,
      expired: expiredRequests,
      matched: deployedActiveActivities + completedActivities,
      availableApproved: availableApprovedRequests
    };

    // 6. Fetch Attendance Records & Rendered Hours
    const { data: attRecords } = await supabase
      .from('attendance_records')
      .select('attendance_id, student_user_id, deployment_id, attendance_date, check_in_time, check_out_time, attendance_status, hours_rendered, verified_at, verified_by, student_remarks')
      .order('attendance_date', { ascending: true });

    const attList = attRecords || [];
    let totalCreditedHours = 0;
    let presentLogs = 0;
    let excusedLogs = 0;
    const studentCreditedMap = new Map();

    attList.forEach(att => {
      const isPresent = att.attendance_status === 'present' || att.attendance_status === 'late' || Number(att.hours_rendered || 0) > 0;
      if (isPresent) {
        presentLogs++;
      } else if (att.attendance_status === 'excused') {
        excusedLogs++;
      }

      let customHours = null;
      if (att.student_remarks) {
        const match = String(att.student_remarks).match(/\[CREDITED:([0-9.]+)\]/);
        if (match) {
          const parsedVal = parseFloat(match[1]);
          if (!isNaN(parsedVal)) customHours = parsedVal;
        }
      }

      const isCredited = Boolean(att.verified_at || att.verified_by || (att.student_remarks && /\[CREDITED:[0-9.]+\]/.test(att.student_remarks)));
      if (isCredited) {
        const val = (customHours !== null) ? customHours : Number(att.hours_rendered || 0);
        totalCreditedHours = Math.round((totalCreditedHours + val) * 10) / 10;
        const currentStudentHours = studentCreditedMap.get(att.student_user_id) || 0;
        studentCreditedMap.set(att.student_user_id, Math.round((currentStudentHours + val) * 10) / 10);
      }
    });

    const totalLogs = attList.length;
    const presentRate = totalLogs > 0 ? ((presentLogs / totalLogs) * 100).toFixed(1) + '%' : '100.0%';
    const averageHours = totalStudents > 0 ? (totalCreditedHours / totalStudents).toFixed(1) : '0.0';

    const attendanceMetrics = {
      totalLogs: totalLogs,
      presentRate: presentRate,
      totalPresent: presentLogs,
      excused: excusedLogs
    };

    const completedStudents = Array.from(studentCreditedMap.values()).filter(h => h >= 90).length;
    const inProgressStudents = Math.max(0, totalStudents - completedStudents);

    const hoursMetrics = {
      totalRendered: Number(totalCreditedHours.toFixed(1)),
      targetHours: 90.0,
      completedStudents: completedStudents,
      inProgressStudents: inProgressStudents,
      averageHours: Number(averageHours)
    };

    // 7. Fetch Feedback & Evaluations
    const { data: fbData } = await supabase
      .from('student_feedback')
      .select('feedback_id, rating, comments, date_submitted, created_at');

    const fbList = fbData || [];
    const totalFeedback = fbList.length;
    const avgRating = totalFeedback > 0
      ? (fbList.reduce((acc, f) => acc + (Number(f.rating) || 0), 0) / totalFeedback).toFixed(1)
      : '0.0';

    const { data: evalData } = await supabase
      .from('student_evaluations')
      .select('*');

    const evalList = evalData || [];
    const totalEvaluated = evalList.length;
    const avgScore = totalEvaluated > 0
      ? (evalList.reduce((acc, e) => acc + (Number(e.overall_score) || 0), 0) / totalEvaluated).toFixed(2)
      : '0.00';

    let puncSum = 0, engSum = 0, teamSum = 0, initSum = 0;
    let outstandingCount = 0, verySatCount = 0, satCount = 0, needsImprovementCount = 0;

    evalList.forEach(e => {
      const punc = Number(e.rating_punctuality || e.criteria?.punctuality?.score || 0);
      const eng = Number(e.rating_community_engagement || e.criteria?.community_engagement?.score || 0);
      const team = Number(e.rating_teamwork || e.criteria?.teamwork?.score || 0);
      const init = Number(e.rating_initiative_attitude || e.criteria?.initiative_attitude?.score || 0);

      puncSum += punc;
      engSum += eng;
      teamSum += team;
      initSum += init;

      const score = Number(e.overall_score || 0);
      if (score >= 4.75) {
        outstandingCount++;
      } else if (score >= 4.0) {
        verySatCount++;
      } else if (score >= 3.0) {
        satCount++;
      } else {
        needsImprovementCount++;
      }
    });

    const evaluationCriteria = {
      labels: ['Punctuality', 'Engagement', 'Teamwork', 'Initiative'],
      scores: totalEvaluated > 0 ? [
        Number((puncSum / totalEvaluated).toFixed(2)),
        Number((engSum / totalEvaluated).toFixed(2)),
        Number((teamSum / totalEvaluated).toFixed(2)),
        Number((initSum / totalEvaluated).toFixed(2))
      ] : [0, 0, 0, 0]
    };

    const feedbackMetrics = {
      totalFeedback: totalFeedback,
      averageRating: Number(avgRating),
      fiveStarCount: fbList.filter(f => Number(f.rating) === 5).length,
      fourStarCount: fbList.filter(f => Number(f.rating) === 4).length
    };

    const evalMetrics = {
      totalEvaluated: totalEvaluated,
      averageScore: Number(avgScore),
      outstandingCount: outstandingCount,
      verySatisfactoryCount: verySatCount,
      satisfactoryCount: satCount,
      needsImprovementCount: needsImprovementCount
    };

    // 8. Visual Charts Data Preparation

    // Chart 1: Timeline series for line charts (cumulative progression by session date/week)
    let timelineLabels = [];
    let attendanceTimeline = [];
    let hoursTimeline = [];

    if (attList.length > 0) {
      let cumulativeHours = 0;
      let cumulativeAtt = 0;

      // Group logs by attendance date
      const dateMap = new Map();
      attList.forEach(att => {
        const d = att.attendance_date || 'Session';
        if (!dateMap.has(d)) dateMap.set(d, { logs: 0, hours: 0 });
        const entry = dateMap.get(d);
        entry.logs += 1;

        let customHours = null;
        if (att.student_remarks) {
          const match = String(att.student_remarks).match(/\[CREDITED:([0-9.]+)\]/);
          if (match) {
            const parsedVal = parseFloat(match[1]);
            if (!isNaN(parsedVal)) customHours = parsedVal;
          }
        }
        const isCredited = Boolean(att.verified_at || att.verified_by || (att.student_remarks && /\[CREDITED:[0-9.]+\]/.test(att.student_remarks)));
        if (isCredited) {
          const val = (customHours !== null) ? customHours : Number(att.hours_rendered || 0);
          entry.hours = Math.round((entry.hours + val) * 10) / 10;
        }
      });

      let sessionIndex = 1;
      dateMap.forEach((val, dateKey) => {
        cumulativeAtt += val.logs;
        cumulativeHours = Math.round((cumulativeHours + val.hours) * 10) / 10;
        
        let label = `Session ${sessionIndex}`;
        if (dateKey && dateKey !== 'Session') {
          const parts = String(dateKey).split('T')[0].split('-');
          if (parts.length === 3) {
            const parsed = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            if (!isNaN(parsed.getTime())) {
              label = parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
          }
        }

        timelineLabels.push(label);
        attendanceTimeline.push(cumulativeAtt);
        hoursTimeline.push(cumulativeHours);
        sessionIndex++;
      });
    } else {
      timelineLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      attendanceTimeline = [0, 0, 0, 0];
      hoursTimeline = [0, 0, 0, 0];
    }

    // Chart 2: Course Hours Distribution
    // Aggregate rendered hours per academic course from student profiles
    const standardCourses = ['BSIT', 'BSBA', 'BSED', 'BSHM', 'BS Crim'];
    const courseHoursMap = new Map();
    standardCourses.forEach(c => courseHoursMap.set(c, 0));

    students.forEach(s => {
      const prof = profileMap.get(s.user_id) || {};
      const courseAcronym = normalizeCourseAcronym(prof.course);
      const studentHours = studentCreditedMap.get(s.user_id) || 0;
      courseHoursMap.set(courseAcronym, (courseHoursMap.get(courseAcronym) || 0) + studentHours);
    });

    const courseLabels = Array.from(courseHoursMap.keys());
    const courseHoursRendered = courseLabels.map(c => Number((courseHoursMap.get(c) || 0).toFixed(1)));

    return res.json({
      success: true,
      summary: {
        users: usersMetrics,
        compliance: complianceData,
        requests: requestMetrics,
        deployments: deploymentMetrics,
        attendance: attendanceMetrics,
        hours: hoursMetrics,
        feedback: feedbackMetrics,
        evaluations: evalMetrics
      },
      charts: {
        timeline: {
          labels: timelineLabels,
          attendance: attendanceTimeline,
          hours: hoursTimeline
        },
        courseHours: {
          labels: courseLabels,
          rendered: courseHoursRendered
        },
        evaluationCriteria: evaluationCriteria,
        requestsDistribution: {
          labels: ['Completed Activities', 'Active / Deployed', 'Pending Review', 'Rejected', 'Expired (Lapsed)'],
          data: [completedActivities, deployedActiveActivities, pendingRequests, rejectedRequests, expiredRequests],
          colors: ['#0B3D2E', '#2F7D5B', '#F59E0B', '#EF4444', '#94A3B8']
        },
        complianceDistribution: {
          labels: ['Verified & Compliant', 'Pending Review', 'Incomplete'],
          data: [complianceData.compliant, complianceData.pending, complianceData.incomplete]
        },
        gradesDistribution: {
          labels: ['Outstanding (4.75 - 5.0)', 'Very Satisfactory (4.0 - 4.74)', 'Satisfactory (3.0 - 3.99)', 'Needs Improvement (< 3.0)'],
          data: [outstandingCount, verySatCount, satCount, needsImprovementCount],
          colors: ['#0B3D2E', '#2F7D5B', '#F59E0B', '#EF4444']
        }
      }
    });
  } catch (error) {
    console.error('Error computing NSTP Analytics:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getNstpAnalytics
};

