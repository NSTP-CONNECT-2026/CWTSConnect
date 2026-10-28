/**
 * NSTPConnect - Feedback & Performance Evaluation Service
 * Handles data access for:
 *  - Community feedback (activity/batch commendations and suggestions)
 *  - Individual student performance evaluations (4-criteria rubrics)
 * Seamlessly integrates with Supabase, with automatic fallback to persistent JSON storage.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const supabase = require('../config/supabaseClient');

const DATA_DIR = path.join(__dirname, '../../data');
const STORE_FILE = path.join(DATA_DIR, 'feedback_evaluations_store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating data directory:', err);
  }
}

/**
 * Deduplicates feedback list ensuring strictly at most one record per student per deployment
 */
function deduplicateFeedbackList(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const result = [];

  for (const fb of list) {
    if (fb.student_user_id) {
      const key = `${fb.deployment_id}_${fb.student_user_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(fb);
      }
    } else {
      const key = `batch_${fb.deployment_id}_${fb.feedback_id || fb.comments}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(fb);
      }
    }
  }

  return result;
}

/**
 * Deduplicates evaluation list ensuring strictly at most one record per student per deployment
 */
function deduplicateEvaluationList(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const result = [];

  for (const ev of list) {
    if (ev.student_user_id && ev.deployment_id) {
      const key = `${ev.deployment_id}_${ev.student_user_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(ev);
      }
    } else {
      const key = `eval_${ev.evaluation_id || ev.deployment_id}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(ev);
      }
    }
  }

  return result;
}

// Local store helper functions
function readLocalStore() {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      return { feedback: [], evaluations: [] };
    }
    const raw = fs.readFileSync(STORE_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    const rawFb = Array.isArray(parsed.feedback) ? parsed.feedback : [];
    const rawEv = Array.isArray(parsed.evaluations) ? parsed.evaluations : [];
    return {
      feedback: deduplicateFeedbackList(rawFb),
      evaluations: deduplicateEvaluationList(rawEv)
    };
  } catch (err) {
    console.error('Error reading feedback evaluations store:', err);
    return { feedback: [], evaluations: [] };
  }
}

function writeLocalStore(data) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing feedback evaluations store:', err);
  }
}

/**
 * Calculates grade based on overall score
 */
function calculatePerformanceGrade(overallScore) {
  const score = Number(overallScore);
  if (score >= 4.75) return 'Outstanding';
  if (score >= 4.00) return 'Very Satisfactory';
  if (score >= 3.00) return 'Satisfactory';
  return 'Needs Improvement';
}

/**
 * Gets deployments and assigned students for a community official
 */
async function getCommunityDeploymentsAndStudents(userId) {
  // 1. Get community requests belonging to this official
  let { data: requests, error: reqErr } = await supabase
    .from('community_requests')
    .select('request_id, user_id, activity_title, activity_type, community_name, barangay, municipality, province, preferred_start_date')
    .eq('user_id', userId);

  if (reqErr) {
    console.warn('Warning querying user community requests:', reqErr.message);
  }

  // Fallback: If no direct requests found for this official, fetch all community requests
  // so partner community officials can still manage deployments
  if (!requests || requests.length === 0) {
    const { data: allReqs } = await supabase
      .from('community_requests')
      .select('request_id, user_id, activity_title, activity_type, community_name, barangay, municipality, province, preferred_start_date');
    if (allReqs && allReqs.length > 0) {
      requests = allReqs;
    }
  }

  if (!requests || requests.length === 0) {
    return {
      deployments: [],
      students: [],
      stats: { totalDeployments: 0, totalStudents: 0, totalEvaluated: 0, pendingEvaluations: 0, averageScore: 5.0 }
    };
  }

  const requestIds = requests.map(r => r.request_id);
  const reqMap = new Map(requests.map(r => [r.request_id, r]));

  // 2. Get deployments
  let { data: deployments, error: depErr } = await supabase
    .from('deployments')
    .select('*')
    .in('request_id', requestIds)
    .order('created_at', { ascending: false });

  if (depErr) {
    console.warn('Warning querying deployments by request_id:', depErr.message);
  }

  // If no deployments under those requests, fetch all active/completed deployments
  if (!deployments || deployments.length === 0) {
    const { data: allDeps } = await supabase
      .from('deployments')
      .select('*')
      .order('created_at', { ascending: false });
    if (allDeps && allDeps.length > 0) {
      deployments = allDeps;
    }
  }

  if (!deployments || deployments.length === 0) {
    return {
      deployments: [],
      students: [],
      stats: { totalDeployments: 0, totalStudents: 0, totalEvaluated: 0, pendingEvaluations: 0, averageScore: 5.0 }
    };
  }

  const depIds = deployments.map(d => d.deployment_id);

  // 3. Get assigned students
  const { data: depStudents, error: dsErr } = await supabase
    .from('deployment_students')
    .select('deployment_id, student_user_id, deployment_student_status')
    .in('deployment_id', depIds)
    .neq('deployment_student_status', 'removed');

  if (dsErr) {
    console.warn('Warning: error fetching deployment students:', dsErr.message);
  }

  let studentsList = [];
  if (depStudents && depStudents.length > 0) {
    const seenDepStudent = new Set();
    const uniqueDepStudents = depStudents.filter(ds => {
      const key = `${ds.deployment_id}_${ds.student_user_id}`;
      if (seenDepStudent.has(key)) return false;
      seenDepStudent.add(key);
      return true;
    });

    const studentUserIds = [...new Set(uniqueDepStudents.map(ds => ds.student_user_id))];

    const { data: userProfiles } = await supabase
      .from('student_profiles')
      .select('user_id, full_name, student_number, course, section, year_level')
      .in('user_id', studentUserIds);

    const profMap = new Map((userProfiles || []).map(p => [p.user_id, p]));

    // Fetch existing evaluations to mark evaluated status
    const existingEvaluations = await getEvaluationsForDeployments(depIds, userId);
    const evalMap = new Map();
    existingEvaluations.forEach(ev => {
      evalMap.set(`${ev.deployment_id}_${ev.student_user_id}`, ev);
    });

    studentsList = uniqueDepStudents.map(ds => {
      const profile = profMap.get(ds.student_user_id) || {};
      const dep = deployments.find(d => d.deployment_id === ds.deployment_id) || {};
      const req = reqMap.get(dep.request_id) || {};
      const existingEval = evalMap.get(`${ds.deployment_id}_${ds.student_user_id}`) || null;

      return {
        deployment_id: ds.deployment_id,
        student_user_id: ds.student_user_id,
        student_name: profile.full_name || 'Student Volunteer',
        student_number: profile.student_number || '---',
        course: profile.course || 'BSIT',
        section: profile.section ? (String(profile.section).toLowerCase().startsWith('section') ? profile.section : `Section ${String(profile.section).replace(/^sec\.?\s*/i, '')}`) : 'Section A',
        year_level: profile.year_level || '1st Year',
        deployment_batch_name: dep.deployment_batch_name || 'Deployment Batch',
        activity_title: req.activity_title || dep.deployment_batch_name || 'Community Service Activity',
        community_name: req.community_name || req.barangay || 'Community',
        is_evaluated: Boolean(existingEval),
        evaluation: existingEval
      };
    });
  }

  const enrichedDeployments = deployments.map(d => {
    const req = reqMap.get(d.request_id) || {};
    const assignedStudents = studentsList.filter(s => s.deployment_id === d.deployment_id);
    const evaluatedCount = assignedStudents.filter(s => s.is_evaluated).length;

    return {
      ...d,
      activity_title: req.activity_title || d.deployment_batch_name,
      activity_type: req.activity_type || 'Community Service',
      community_name: req.community_name || req.barangay || 'Partner Community',
      barangay: req.barangay || '',
      municipality: req.municipality || '',
      assigned_students_count: assignedStudents.length,
      evaluated_students_count: evaluatedCount,
      pending_students_count: Math.max(0, assignedStudents.length - evaluatedCount)
    };
  });

  const totalEvaluated = studentsList.filter(s => s.is_evaluated).length;
  const pendingCount = Math.max(0, studentsList.length - totalEvaluated);
  const totalScoreSum = studentsList
    .filter(s => s.is_evaluated && s.evaluation?.overall_score)
    .reduce((acc, s) => acc + Number(s.evaluation.overall_score), 0);
  const averageScore = totalEvaluated > 0 ? Number((totalScoreSum / totalEvaluated).toFixed(2)) : 5.0;

  return {
    deployments: enrichedDeployments,
    students: studentsList,
    stats: {
      totalDeployments: enrichedDeployments.length,
      totalStudents: studentsList.length,
      totalEvaluated,
      pendingEvaluations: pendingCount,
      averageScore
    }
  };
}

/**
 * Helper to fetch evaluations for specified deployments (Supabase with local store fallback)
 */
async function getEvaluationsForDeployments(deploymentIds, evaluatorUserId) {
  try {
    const { data, error } = await supabase
      .from('student_evaluations')
      .select('*')
      .in('deployment_id', deploymentIds);

    if (!error && Array.isArray(data) && data.length > 0) {
      return deduplicateEvaluationList(data);
    }
  } catch (err) {
    // Supabase table may not exist yet, fallback to local store
  }

  const store = readLocalStore();
  const list = store.evaluations.filter(ev => 
    deploymentIds.includes(ev.deployment_id) && (!evaluatorUserId || ev.evaluator_user_id === evaluatorUserId)
  );
  return deduplicateEvaluationList(list);
}

/**
 * Gets all feedback records for community official
 */
async function getFeedbackRecords(userId) {
  try {
    const { data, error } = await supabase
      .from('student_feedback')
      .select('*')
      .eq('community_user_id', userId)
      .order('date_submitted', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return deduplicateFeedbackList(data);
    }
  } catch (err) {
    // fallback
  }

  const store = readLocalStore();
  const list = store.feedback.filter(fb => fb.community_user_id === userId)
    .sort((a, b) => new Date(b.date_submitted || 0) - new Date(a.date_submitted || 0));
  return deduplicateFeedbackList(list);
}

/**
 * Gets all evaluation records for community official
 */
async function getEvaluationRecords(userId) {
  try {
    const { data, error } = await supabase
      .from('student_evaluations')
      .select('*')
      .eq('evaluator_user_id', userId)
      .order('evaluation_date', { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return deduplicateEvaluationList(data);
    }
  } catch (err) {
    // fallback
  }

  const store = readLocalStore();
  const list = store.evaluations.filter(ev => ev.evaluator_user_id === userId)
    .sort((a, b) => new Date(b.evaluation_date || 0) - new Date(a.evaluation_date || 0));
  return deduplicateEvaluationList(list);
}

/**
 * Saves or updates community feedback
 */
async function saveCommunityFeedback(userId, sessionUser, payload) {
  const { deployment_id, student_user_id, rating, feedback_type, comments, activity_title, community_name } = payload;

  if (!deployment_id || !comments) {
    throw new Error('Deployment and comments are required.');
  }

  // Sanitize student_user_id (ensure valid UUID or null)
  const validStudentUserId = (student_user_id && typeof student_user_id === 'string' && student_user_id.trim() !== '' && student_user_id !== 'null')
    ? student_user_id.trim()
    : null;

  const feedbackRecord = {
    feedback_id: crypto.randomUUID(),
    deployment_id,
    student_user_id: validStudentUserId,
    community_user_id: userId,
    community_name: community_name || 'Partner Community',
    activity_title: activity_title || 'Community Service Activity',
    rating: Math.max(1, Math.min(5, parseInt(rating, 10) || 5)),
    feedback_type: feedback_type || 'General Feedback',
    comments: comments.trim(),
    submitted_by: sessionUser?.full_name || 'Community Official',
    date_submitted: new Date().toISOString().split('T')[0]
  };

  try {
    let existing = null;
    if (validStudentUserId) {
      const { data: exList } = await supabase
        .from('student_feedback')
        .select('feedback_id')
        .eq('deployment_id', deployment_id)
        .eq('student_user_id', validStudentUserId)
        .order('date_submitted', { ascending: false });

      if (Array.isArray(exList) && exList.length > 0) {
        existing = exList[0];
        // Strictly purge any extra duplicate records in Supabase
        if (exList.length > 1) {
          const extraIds = exList.slice(1).map(x => x.feedback_id);
          await supabase.from('student_feedback').delete().in('feedback_id', extraIds);
        }
      }
    }

    if (existing) {
      const { data, error } = await supabase
        .from('student_feedback')
        .update({
          rating: feedbackRecord.rating,
          comments: feedbackRecord.comments,
          submitted_by: feedbackRecord.submitted_by,
          date_submitted: feedbackRecord.date_submitted,
          updated_at: new Date().toISOString()
        })
        .eq('feedback_id', existing.feedback_id)
        .select()
        .single();

      if (!error && data) {
        feedbackRecord.feedback_id = data.feedback_id;
      }
    } else {
      const { data, error } = await supabase
        .from('student_feedback')
        .insert(feedbackRecord)
        .select()
        .single();

      if (!error && data) {
        feedbackRecord.feedback_id = data.feedback_id;
      }
    }
  } catch (err) {
    console.warn('Notice: student_feedback table error or not available in Supabase, using local store.');
  }

  // Always sync to local store for persistence reliability
  const store = readLocalStore();
  if (validStudentUserId) {
    // Strictly remove all previous records for this student and deployment
    store.feedback = store.feedback.filter(
      f => !(f.deployment_id === deployment_id && f.student_user_id === validStudentUserId)
    );
  } else {
    store.feedback = store.feedback.filter(f => f.feedback_id !== feedbackRecord.feedback_id);
  }
  store.feedback.unshift(feedbackRecord);
  writeLocalStore(store);

  return feedbackRecord;
}

/**
 * Saves or updates community feedback for all students in a batch
 */
async function saveBatchCommunityFeedback(userId, sessionUser, payload) {
  const { deployment_id, rating, comments, activity_title, community_name, student_user_ids, students: studentList } = payload;

  if (!deployment_id || !comments) {
    throw new Error('Deployment and comments are required.');
  }

  // If explicit students list with student_user_id and deployment_id is provided
  if (Array.isArray(studentList) && studentList.length > 0) {
    const results = [];
    for (const item of studentList) {
      const res = await saveCommunityFeedback(userId, sessionUser, {
        deployment_id: item.deployment_id || deployment_id,
        student_user_id: item.student_user_id,
        rating,
        comments,
        activity_title: item.activity_title || activity_title,
        community_name: item.community_name || community_name
      });
      results.push(res);
    }
    return results;
  }

  let studentIds = Array.isArray(student_user_ids) ? student_user_ids : [];
  if (studentIds.length === 0) {
    let query = supabase
      .from('deployment_students')
      .select('student_user_id, deployment_id')
      .neq('deployment_student_status', 'removed');

    if (deployment_id !== 'all') {
      query = query.eq('deployment_id', deployment_id);
    }

    const { data: depStudents } = await query;

    if (depStudents && depStudents.length > 0) {
      const results = [];
      for (const ds of depStudents) {
        const res = await saveCommunityFeedback(userId, sessionUser, {
          deployment_id: ds.deployment_id,
          student_user_id: ds.student_user_id,
          rating,
          comments,
          activity_title,
          community_name
        });
        results.push(res);
      }
      return results;
    }
  }

  const results = [];
  for (const sId of studentIds) {
    const res = await saveCommunityFeedback(userId, sessionUser, {
      deployment_id,
      student_user_id: sId,
      rating,
      comments,
      activity_title,
      community_name
    });
    results.push(res);
  }

  return results;
}

/**
 * Saves or updates student performance evaluation
 */
async function saveStudentEvaluation(userId, sessionUser, payload) {
  const {
    deployment_id,
    student_user_id,
    student_name,
    rating_punctuality,
    rating_community_engagement,
    rating_teamwork,
    rating_initiative_attitude,
    evaluator_remarks,
    activity_title,
    community_name
  } = payload;

  if (!deployment_id || !student_user_id) {
    throw new Error('Deployment and student volunteer selection are required.');
  }

  const p = Math.max(1.0, Math.min(5.0, parseFloat(rating_punctuality) || 5.0));
  const ce = Math.max(1.0, Math.min(5.0, parseFloat(rating_community_engagement) || 5.0));
  const tw = Math.max(1.0, Math.min(5.0, parseFloat(rating_teamwork) || 5.0));
  const ia = Math.max(1.0, Math.min(5.0, parseFloat(rating_initiative_attitude) || 5.0));

  const overallScore = parseFloat(((p + ce + tw + ia) / 4).toFixed(2));
  const performanceGrade = calculatePerformanceGrade(overallScore);

  const evaluationRecord = {
    evaluation_id: crypto.randomUUID(),
    deployment_id,
    student_user_id,
    student_name: student_name || 'Student Volunteer',
    evaluator_user_id: userId,
    evaluator_name: sessionUser?.full_name || 'Community Official',
    community_name: community_name || 'Partner Community',
    activity_title: activity_title || 'Community Service Activity',
    rating_punctuality: p,
    rating_community_engagement: ce,
    rating_teamwork: tw,
    rating_initiative_attitude: ia,
    overall_score: overallScore,
    performance_grade: performanceGrade,
    criteria: {
      punctuality: { score: p, label: 'Punctuality & Attendance' },
      community_engagement: { score: ce, label: 'Community Engagement & Rapport' },
      teamwork: { score: tw, label: 'Teamwork & Cooperation' },
      initiative_attitude: { score: ia, label: 'Initiative & Work Attitude' }
    },
    evaluator_remarks: (evaluator_remarks || 'Student demonstrated commendable service and cooperation.').trim(),
    evaluation_date: new Date().toISOString().split('T')[0]
  };

  try {
    const { data: existing } = await supabase
      .from('student_evaluations')
      .select('evaluation_id')
      .eq('deployment_id', deployment_id)
      .eq('student_user_id', student_user_id)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('student_evaluations')
        .update({
          rating_punctuality: p,
          rating_community_engagement: ce,
          rating_teamwork: tw,
          rating_initiative_attitude: ia,
          overall_score: overallScore,
          performance_grade: performanceGrade,
          criteria: evaluationRecord.criteria,
          evaluator_remarks: evaluationRecord.evaluator_remarks,
          evaluation_date: evaluationRecord.evaluation_date,
          updated_at: new Date().toISOString()
        })
        .eq('evaluation_id', existing.evaluation_id)
        .select()
        .single();

      if (!error && data) {
        evaluationRecord.evaluation_id = data.evaluation_id;
      }
    } else {
      const { data, error } = await supabase
        .from('student_evaluations')
        .insert(evaluationRecord)
        .select()
        .single();

      if (!error && data) {
        evaluationRecord.evaluation_id = data.evaluation_id;
      }
    }
  } catch (err) {
    console.warn('Notice: student_evaluations table not available in Supabase, using local store.');
  }

  // Always sync to local store
  const store = readLocalStore();
  store.evaluations = (store.evaluations || []).filter(
    ev => !(ev.deployment_id === deployment_id && ev.student_user_id === student_user_id) && ev.evaluation_id !== evaluationRecord.evaluation_id
  );
  store.evaluations.unshift(evaluationRecord);
  store.evaluations = deduplicateEvaluationList(store.evaluations);
  writeLocalStore(store);

  // Dispatch notification to evaluated student
  try {
    const notificationService = require('./notificationService');
    await notificationService.createNotification({
      user_id: student_user_id,
      title: 'Performance Evaluation Completed',
      message: `Your performance evaluation for ${evaluationRecord.activity_title || 'community service'} has been recorded. Rating: ${evaluationRecord.overall_score}/5 (${evaluationRecord.performance_grade || 'Completed'}).`,
      notification_type: 'completion_milestone',
      related_deployment_id: deployment_id,
      action_url: 'dashboard.html',
      action_label: 'View Dashboard'
    });
  } catch (notifErr) {
    console.warn('Evaluation notification warning:', notifErr.message);
  }

  return evaluationRecord;
}

/**
 * Saves or updates student performance evaluations for all students in a batch
 */
async function saveBatchStudentEvaluation(userId, sessionUser, payload) {
  const {
    deployment_id,
    rating_punctuality,
    rating_community_engagement,
    rating_teamwork,
    rating_initiative_attitude,
    evaluator_remarks,
    activity_title,
    community_name,
    students: studentList
  } = payload;

  if (!deployment_id || !evaluator_remarks) {
    throw new Error('Deployment and evaluator remarks are required.');
  }

  let list = Array.isArray(studentList) ? studentList : [];
  if (list.length === 0) {
    let query = supabase
      .from('deployment_students')
      .select('student_user_id, deployment_id')
      .neq('deployment_student_status', 'removed');

    if (deployment_id !== 'all') {
      query = query.eq('deployment_id', deployment_id);
    }

    const { data: depStudents } = await query;
    if (depStudents && depStudents.length > 0) {
      list = depStudents;
    }
  }

  const results = [];
  for (const item of list) {
    const res = await saveStudentEvaluation(userId, sessionUser, {
      deployment_id: item.deployment_id || deployment_id,
      student_user_id: item.student_user_id,
      student_name: item.student_name || 'Student Volunteer',
      rating_punctuality,
      rating_community_engagement,
      rating_teamwork,
      rating_initiative_attitude,
      evaluator_remarks,
      activity_title: item.activity_title || activity_title,
      community_name: item.community_name || community_name
    });
    results.push(res);
  }
  return results;
}

/**
 * Gets all coordinator feedback logs and student evaluation records across all deployments
 */
async function getAllCoordinatorFeedbackAndEvaluations() {
  // 1. Fetch deployments
  let { data: deployments, error: depError } = await supabase
    .from('deployments')
    .select('deployment_id, deployment_batch_name, request_id, deployment_status, created_at')
    .order('created_at', { ascending: false });

  if (depError) {
    console.warn('Warning fetching deployments:', depError.message);
    deployments = [];
  }

  // 2. Fetch requests
  const { data: requests } = await supabase
    .from('community_requests')
    .select('request_id, activity_title, activity_type, community_name, barangay, municipality, preferred_start_date');

  const reqMap = new Map((requests || []).map(r => [r.request_id, r]));
  const depMap = new Map((deployments || []).map(d => {
    const req = reqMap.get(d.request_id) || {};
    return [d.deployment_id, {
      ...d,
      activity_title: req.activity_title || d.deployment_batch_name,
      community_name: req.community_name || req.barangay || 'Partner Community'
    }];
  }));

  // 3. Fetch profiles
  const { data: profiles } = await supabase
    .from('student_profiles')
    .select('user_id, full_name, student_number, course, section, year_level');
  const profMap = new Map((profiles || []).map(p => [p.user_id, p]));

  // 3b. Fetch deployment students to resolve individual student volunteers for feedback
  const { data: depStudents } = await supabase
    .from('deployment_students')
    .select('deployment_id, student_user_id')
    .neq('deployment_student_status', 'removed');

  const depStudentsMap = new Map();
  (depStudents || []).forEach(ds => {
    if (!depStudentsMap.has(ds.deployment_id)) {
      depStudentsMap.set(ds.deployment_id, []);
    }
    depStudentsMap.get(ds.deployment_id).push(ds.student_user_id);
  });

  // 4. Fetch feedback records (Supabase + local store fallback)
  let feedbackList = [];
  try {
    const { data: fbData } = await supabase
      .from('student_feedback')
      .select('*')
      .order('date_submitted', { ascending: false });
    if (Array.isArray(fbData) && fbData.length > 0) feedbackList = fbData;
  } catch (e) {}

  const store = readLocalStore();
  if (store.feedback && store.feedback.length > 0) {
    store.feedback.forEach(fb => {
      const exists = feedbackList.some(f => 
        (f.deployment_id === fb.deployment_id && (
          (f.student_user_id && fb.student_user_id && f.student_user_id === fb.student_user_id) ||
          (!f.student_user_id && !fb.student_user_id)
        )) ||
        f.feedback_id === fb.feedback_id
      );
      if (!exists) {
        feedbackList.push(fb);
      }
    });
  }

  // Expand any feedback with null/missing student_user_id to the individual student volunteers deployed
  const expandedFeedbackList = [];
  feedbackList.forEach(fb => {
    if (fb.student_user_id) {
      expandedFeedbackList.push(fb);
    } else {
      const assignedStudents = depStudentsMap.get(fb.deployment_id) || [];
      if (assignedStudents.length > 0) {
        assignedStudents.forEach(sId => {
          expandedFeedbackList.push({
            ...fb,
            feedback_id: `${fb.feedback_id}_${sId}`,
            student_user_id: sId
          });
        });
      } else {
        expandedFeedbackList.push(fb);
      }
    }
  });

  feedbackList = deduplicateFeedbackList(expandedFeedbackList);

  // 5. Fetch evaluation records (Supabase + local store fallback)
  let evaluationsList = [];
  try {
    const { data: evData } = await supabase
      .from('student_evaluations')
      .select('*')
      .order('evaluation_date', { ascending: false });
    if (Array.isArray(evData) && evData.length > 0) evaluationsList = evData;
  } catch (e) {}

  if (store.evaluations && store.evaluations.length > 0) {
    store.evaluations.forEach(ev => {
      const exists = evaluationsList.some(e => 
        (e.deployment_id === ev.deployment_id && e.student_user_id === ev.student_user_id) ||
        e.evaluation_id === ev.evaluation_id
      );
      if (!exists) {
        evaluationsList.push(ev);
      }
    });
  }

  evaluationsList = deduplicateEvaluationList(evaluationsList);

  // 6. Enrich Feedback
  const enrichedFeedback = feedbackList.map(f => {
    const dep = depMap.get(f.deployment_id) || {};
    const prof = f.student_user_id ? profMap.get(f.student_user_id) : null;
    let studentDisplayName = '';
    if (prof) {
      studentDisplayName = prof.student_number
        ? `${prof.full_name} (${prof.student_number})`
        : prof.full_name;
    } else if (f.student_name && f.student_name !== 'All Deployed Students') {
      studentDisplayName = f.student_name;
    } else {
      const assignedStudents = depStudentsMap.get(f.deployment_id) || [];
      if (assignedStudents.length > 0) {
        const fallbackProf = profMap.get(assignedStudents[0]);
        if (fallbackProf) {
          studentDisplayName = fallbackProf.student_number
            ? `${fallbackProf.full_name} (${fallbackProf.student_number})`
            : fallbackProf.full_name;
        }
      }
      if (!studentDisplayName) {
        studentDisplayName = 'Student Volunteer';
      }
    }

    return {
      feedback_id: f.feedback_id,
      deployment_id: f.deployment_id,
      deployment_batch_name: dep.deployment_batch_name || f.deployment_batch_name || 'Deployment Batch',
      community_name: dep.community_name || f.community_name || 'Partner Community',
      activity_title: dep.activity_title || f.activity_title || 'Community Service Activity',
      target_student: studentDisplayName,
      student_user_id: f.student_user_id || null,
      rating: f.rating || 5,
      feedback_type: f.feedback_type || 'Commendation',
      submitted_by: f.submitted_by || 'Community Official',
      date_submitted: f.date_submitted || f.created_at?.split('T')[0] || '---',
      comments: f.comments || ''
    };
  });

  // 7. Enrich Evaluations
  const enrichedEvaluations = evaluationsList.map(ev => {
    const dep = depMap.get(ev.deployment_id) || {};
    const prof = profMap.get(ev.student_user_id) || {};
    return {
      evaluation_id: ev.evaluation_id,
      deployment_id: ev.deployment_id,
      student_user_id: ev.student_user_id,
      student_name: prof.full_name || ev.student_name || 'Student Volunteer',
      student_number: prof.student_number || '---',
      course: prof.course || 'BSIT',
      section: prof.section ? (String(prof.section).toLowerCase().startsWith('section') ? prof.section : `Section ${String(prof.section).replace(/^sec\.?\s*/i, '')}`) : 'Section A',
      year_level: prof.year_level || '1st Year',
      deployment_batch_name: dep.deployment_batch_name || ev.deployment_batch_name || 'Deployment Batch',
      community_name: dep.community_name || ev.community_name || 'Partner Community',
      activity_title: dep.activity_title || ev.activity_title || 'Community Service Activity',
      evaluator_name: ev.evaluator_name || 'Community Official',
      evaluation_date: ev.evaluation_date || ev.created_at?.split('T')[0] || '---',
      overall_score: Number(ev.overall_score || 5).toFixed(2),
      performance_grade: ev.performance_grade || 'Outstanding',
      criteria: ev.criteria || {
        punctuality: { score: ev.rating_punctuality || 5, label: 'Punctuality & Attendance' },
        community_engagement: { score: ev.rating_community_engagement || 5, label: 'Community Engagement & Rapport' },
        teamwork: { score: ev.rating_teamwork || 5, label: 'Teamwork & Cooperation' },
        initiative_attitude: { score: ev.rating_initiative_attitude || 5, label: 'Initiative & Work Attitude' }
      },
      evaluator_remarks: ev.evaluator_remarks || ''
    };
  });

  return {
    deployments: (deployments || []).map(d => ({
      deployment_id: d.deployment_id,
      deployment_batch_name: d.deployment_batch_name,
      activity_title: depMap.get(d.deployment_id)?.activity_title || d.deployment_batch_name,
      community_name: depMap.get(d.deployment_id)?.community_name || 'Partner Community'
    })),
    feedback: enrichedFeedback,
    evaluations: enrichedEvaluations
  };
}

/**
 * Gets feedback and evaluations for a specific student volunteer
 */
async function getStudentFeedbackAndEvaluations(studentUserId) {
  const coordinatorData = await getAllCoordinatorFeedbackAndEvaluations();

  // Find deployments student is assigned to
  const { data: depStudents } = await supabase
    .from('deployment_students')
    .select('deployment_id')
    .eq('student_user_id', studentUserId);

  const studentDepIds = (depStudents || []).map(ds => ds.deployment_id);

  const studentFeedback = coordinatorData.feedback.filter(
    f => f.student_user_id === studentUserId || (!f.student_user_id && studentDepIds.includes(f.deployment_id))
  );

  const studentEvaluations = coordinatorData.evaluations.filter(
    e => e.student_user_id === studentUserId
  );

  return {
    feedback: studentFeedback,
    evaluations: studentEvaluations
  };
}

module.exports = {
  getCommunityDeploymentsAndStudents,
  getFeedbackRecords,
  getEvaluationRecords,
  saveCommunityFeedback,
  saveBatchCommunityFeedback,
  saveStudentEvaluation,
  saveBatchStudentEvaluation,
  calculatePerformanceGrade,
  getAllCoordinatorFeedbackAndEvaluations,
  getStudentFeedbackAndEvaluations
};

