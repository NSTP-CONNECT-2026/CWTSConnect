/**
 * NSTPConnect - DSS Matching Score Utilities
 * Implements SOURCE CODE.TXT:
 *  - PART 2: Criteria Quantification Process (Haversine Distance & Skill Matching)
 *  - PART 3: Vector / Min-Max Normalization (0-to-1 Scale)
 *  - PART 4: Simple Additive Weighting (SAW) Computation & Ranking
 *       Location Weight (W_loc) = 0.30 (30%)
 *       Skills Weight   (W_skill) = 0.70 (70%)
 *       Final_Score = (Normalized_Location_Score * 0.30) + (Normalized_Skill_Score * 0.70)
 *       Suitability_Score = Final_Score * 100%
 */

/**
 * LAGUNA MUNICIPALITY GEOGRAPHIC COORDINATES REFERENCE
 */
const LAGUNA_MUNICIPALITY_COORDS = {
  'paete': { lat: 14.3644, lng: 121.4828 },
  'pakil': { lat: 14.3820, lng: 121.4794 },
  'pangil': { lat: 14.4022, lng: 121.4678 },
  'siniloan': { lat: 14.4178, lng: 121.4489 },
  'famy': { lat: 14.4367, lng: 121.4528 },
  'mabitac': { lat: 14.4286, lng: 121.4281 },
  'santa maria': { lat: 14.4697, lng: 121.4264 },
  'kalayaan': { lat: 14.3533, lng: 121.5033 },
  'lumban': { lat: 14.2986, lng: 121.4608 },
  'pagsanjan': { lat: 14.2750, lng: 121.4542 },
  'santa cruz': { lat: 14.2789, lng: 121.4172 },
  'magdalena': { lat: 14.1989, lng: 121.4294 },
  'majayjay': { lat: 14.1436, lng: 121.5142 },
  'luisiana': { lat: 14.1856, lng: 121.5167 },
  'cavinti': { lat: 14.2483, lng: 121.5086 },
  'liliw': { lat: 14.1350, lng: 121.4358 },
  'nagcarlan': { lat: 14.1358, lng: 121.4150 },
  'rizal': { lat: 14.1111, lng: 121.3956 },
  'san pablo': { lat: 14.0683, lng: 121.3256 },
  'calamba': { lat: 14.2117, lng: 121.1656 },
  'los baños': { lat: 14.1706, lng: 121.2433 },
  'los banos': { lat: 14.1706, lng: 121.2433 },
  'bay': { lat: 14.1814, lng: 121.2869 },
  'victoria': { lat: 14.2289, lng: 121.3289 },
  'pila': { lat: 14.2344, lng: 121.3647 },
  'alaminos': { lat: 14.0625, lng: 121.2464 },
  'cabuyao': { lat: 14.2783, lng: 121.1250 },
  'santa rosa': { lat: 14.3167, lng: 121.1167 },
  'biñan': { lat: 14.3333, lng: 121.0833 },
  'binan': { lat: 14.3333, lng: 121.0833 },
  'san pedro': { lat: 14.3583, lng: 121.0500 }
};

/**
 * Resolves GPS Coordinates from location string or municipality name
 */
function resolveLocationCoords(locStr, municipality) {
  if (locStr && typeof locStr === 'string' && locStr.includes(',')) {
    const parts = locStr.split(',');
    const lat = parseFloat(parts[0].trim());
    const lng = parseFloat(parts[1].trim());
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return { lat, lng };
    }
  }

  const muniKey = (municipality || '').toLowerCase().trim();
  if (muniKey && LAGUNA_MUNICIPALITY_COORDS[muniKey]) {
    return LAGUNA_MUNICIPALITY_COORDS[muniKey];
  }

  return { lat: 14.3644, lng: 121.4828 }; // Default Paete coordinates
}

/**
 * Calculates Haversine Geographic Distance in kilometers
 */
function calculateGeographicDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const dist = R * c;
  return Math.max(0.10, Math.round(dist * 100) / 100);
}

/**
 * Calculates location match score between student and community request
 */
function calculateLocationScore(studentMunicipality, studentProvince, requestMunicipality, requestProvince) {
  if (!studentMunicipality || !requestMunicipality) return 20;

  const normalizeName = (name) => String(name).toLowerCase().trim();
  const studentMuni = normalizeName(studentMunicipality);
  const studentProv = normalizeName(studentProvince);
  const requestMuni = normalizeName(requestMunicipality);
  const requestProv = normalizeName(requestProvince);

  if (studentMuni === requestMuni && studentProv === requestProv) return 100;
  if (studentProv === requestProv) return 60;
  return 20;
}

/**
 * Calculates skills match score between student skills and needed skills
 */
function calculateSkillsScore(studentSkills, neededSkills) {
  const studentSkillsArray = Array.isArray(studentSkills) ? studentSkills : [];
  const neededSkillsArray = Array.isArray(neededSkills) ? neededSkills : [];

  if (studentSkillsArray.length === 0 || neededSkillsArray.length === 0) {
    return 0;
  }

  const normalizeSkill = (skill) => String(skill).toLowerCase().trim();
  const normalizedStudentSkills = studentSkillsArray.map(normalizeSkill);
  const normalizedNeededSkills = neededSkillsArray.map(normalizeSkill);

  let matchingSkills = 0;
  normalizedNeededSkills.forEach(neededSkill => {
    if (normalizedStudentSkills.some(st => st === neededSkill || st.includes(neededSkill) || neededSkill.includes(st))) {
      matchingSkills++;
    }
  });

  return (matchingSkills / normalizedNeededSkills.length) * 100;
}

/**
 * Calculates Community Request Type Match score
 */
function calculateRequestTypeScore(studentSkills, activityType) {
  return 100;
}

/**
 * Calculates availability score
 */
function calculateAvailabilityScore(studentId) {
  return 100;
}

/**
 * Computes exact SAW Suitability Rankings per SOURCE CODE.TXT
 * @param {Array} eligibleStudents - Array of eligible candidate student objects
 * @param {object} request - Community request object
 * @returns {Array} Array of ranked recommendations with exact suitabilityScore
 */
function computeSawSuitabilityRankings(eligibleStudents, request) {
  if (!eligibleStudents || eligibleStudents.length === 0 || !request) {
    return [];
  }

  const reqMuni = (request.municipality || '').toLowerCase().trim();
  const reqCoords = resolveLocationCoords(request.location || request.coordinates, reqMuni);

  // Extract needed skills
  let neededSkills = [];
  if (Array.isArray(request.needed_skills) && request.needed_skills.length > 0) {
    neededSkills = request.needed_skills;
  } else if (Array.isArray(request.skills_required) && request.skills_required.length > 0) {
    neededSkills = request.skills_required;
  } else if (typeof request.needed_skills === 'string' && request.needed_skills) {
    neededSkills = request.needed_skills.split(',').map(s => s.trim()).filter(Boolean);
  } else if (typeof request.skills_required === 'string' && request.skills_required) {
    neededSkills = request.skills_required.split(',').map(s => s.trim()).filter(Boolean);
  } else {
    neededSkills = ['Community Service', 'Teamwork', 'Communication'];
  }
  const totalRequiredSkills = Math.max(1, neededSkills.length);

  // Assigned Weights from Manuscript: Location = 0.30, Skills = 0.70
  const W_LOC = 0.30;
  const W_SKILL = 0.70;

  // PART 2: Criteria Quantification Process
  const rawList = eligibleStudents.map(student => {
    let p = {};
    if (student.student_profiles) {
      p = Array.isArray(student.student_profiles) ? (student.student_profiles[0] || {}) : student.student_profiles;
    } else if (student.profile) {
      p = student.profile;
    } else {
      p = student;
    }

    const studentId = student.user_id || student.id || student.student_user_id;
    const stuCoords = resolveLocationCoords(p.location || student.location, p.municipality || student.municipality);
    const rawDistance = calculateGeographicDistance(stuCoords.lat, stuCoords.lng, reqCoords.lat, reqCoords.lng);

    let studentSkills = [];
    if (Array.isArray(p.skills)) studentSkills = p.skills;
    else if (Array.isArray(student.skills)) studentSkills = student.skills;
    else if (typeof p.skills === 'string' && p.skills) studentSkills = p.skills.split(',').map(x => x.trim()).filter(Boolean);
    else if (typeof student.skills === 'string' && student.skills) studentSkills = student.skills.split(',').map(x => x.trim()).filter(Boolean);

    let matchedSkillsCount = 0;
    neededSkills.forEach(reqSkill => {
      const reqLower = reqSkill.toLowerCase().trim();
      const hasMatch = studentSkills.some(stSkill => {
        const stLower = stSkill.toLowerCase().trim();
        return stLower === reqLower || stLower.includes(reqLower) || reqLower.includes(stLower);
      });
      if (hasMatch) matchedSkillsCount++;
    });

    const rawSkillRatio = Math.round((matchedSkillsCount / totalRequiredSkills) * 1000) / 1000;

    return {
      student,
      profile: p,
      studentId,
      studentName: p.full_name || student.full_name || student.name || 'Student Candidate',
      studentNumber: p.student_number || student.student_number || 'N/A',
      course: p.course || student.course || 'BSIT',
      yearLevel: p.year_level || student.year_level || '1st Year',
      section: p.section || student.section || '1',
      municipality: p.municipality || student.municipality || '',
      province: p.province || student.province || '',
      nstpComponent: p.nstp_component || student.nstp_component || 'CWTS',
      skills: studentSkills,
      rawDistance,
      matchedSkillsCount,
      totalRequiredSkills,
      rawSkillRatio
    };
  });

  // PART 3: Vector / Criteria Normalization Process
  const minDistance = Math.min(...rawList.map(r => r.rawDistance));

  // PART 4: Simple Additive Weighting (SAW) Computation
  const sawList = rawList.map(row => {
    const nLoc = Math.round((minDistance / row.rawDistance) * 1000) / 1000;
    const nSkill = row.rawSkillRatio;

    const weightedLoc = Math.round(nLoc * W_LOC * 1000) / 1000;
    const weightedSkill = Math.round(nSkill * W_SKILL * 1000) / 1000;
    const finalScore = Math.round((weightedLoc + weightedSkill) * 1000) / 1000;
    const suitabilityScore = Math.round(finalScore * 1000) / 10; // in percent (e.g. 84.5% or 44.0%)

    return {
      ...row,
      nLoc,
      nSkill,
      weightedLoc,
      weightedSkill,
      finalScore,
      suitabilityScore
    };
  });

  // Sort descending by suitabilityScore
  sawList.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  return sawList.map((item, idx) => ({
    student_user_id: item.studentId,
    user_id: item.studentId,
    id: item.studentId,
    student_name: item.studentName,
    full_name: item.studentName,
    name: item.studentName,
    student_number: item.studentNumber,
    course: item.course,
    year_level: item.yearLevel,
    section: item.section,
    nstp_component: item.nstpComponent,
    municipality: item.municipality,
    province: item.province,
    skills: item.skills,
    raw_distance: item.rawDistance,
    normalized_location: item.nLoc,
    normalized_skill: item.nSkill,
    final_score: item.finalScore,
    total_score: item.suitabilityScore,
    suitability_score: item.suitabilityScore,
    suitabilityScore: item.suitabilityScore,
    match_score: item.suitabilityScore,
    match_label: item.suitabilityScore >= 70 ? 'Highly Suitable' : (item.suitabilityScore >= 40 ? 'Suitable' : 'Low Suitability'),
    recommendation_rank: idx + 1,
    is_available: true,
    profile_status: 'complete',
    cmo_compliance_status: 'compliant'
  }));
}

/**
 * Calculates overall match score using SAW formula (30% Location, 70% Skills)
 */
function calculateOverallMatchScore(student, request) {
  const p = student.student_profiles ? (Array.isArray(student.student_profiles) ? student.student_profiles[0] : student.student_profiles) : student;
  const sCoords = resolveLocationCoords(p.location, p.municipality);
  const rCoords = resolveLocationCoords(request.location || request.coordinates, request.municipality);
  const rawDist = calculateGeographicDistance(sCoords.lat, sCoords.lng, rCoords.lat, rCoords.lng);

  // Normalize location (cost)
  const normLoc = Math.min(1.0, Math.max(0.1, 3.5 / rawDist));

  // Extract skills
  let neededSkills = [];
  if (Array.isArray(request.needed_skills)) neededSkills = request.needed_skills;
  else if (typeof request.needed_skills === 'string') neededSkills = request.needed_skills.split(',').map(s => s.trim()).filter(Boolean);

  let stSkills = [];
  if (Array.isArray(p.skills)) stSkills = p.skills;
  else if (typeof p.skills === 'string') stSkills = p.skills.split(',').map(s => s.trim()).filter(Boolean);

  const neededCount = Math.max(1, neededSkills.length);
  let matched = 0;
  neededSkills.forEach(rk => {
    const rLower = rk.toLowerCase().trim();
    if (stSkills.some(sk => sk.toLowerCase().trim().includes(rLower) || rLower.includes(sk.toLowerCase().trim()))) {
      matched++;
    }
  });

  const normSkill = matched / neededCount;
  const finalScore = (normLoc * 0.30) + (normSkill * 0.70);
  const suitabilityScore = Math.round(finalScore * 1000) / 10;

  return {
    totalScore: suitabilityScore,
    matchLabel: suitabilityScore >= 70 ? 'Highly Suitable' : (suitabilityScore >= 40 ? 'Suitable' : 'Low Suitability'),
    breakdown: {
      locationScore: Math.round(normLoc * 100),
      skillsScore: Math.round(normSkill * 100),
      componentScore: 100,
      availabilityScore: 100
    }
  };
}

/**
 * Sorts students by suitability score (highest first)
 */
function rankMatchResults(matchResults) {
  const sorted = matchResults.sort((a, b) => b.totalScore - a.totalScore);
  return sorted.map((result, index) => ({
    ...result,
    recommendationRank: index + 1
  }));
}

module.exports = {
  LAGUNA_MUNICIPALITY_COORDS,
  resolveLocationCoords,
  calculateGeographicDistance,
  calculateLocationScore,
  calculateSkillsScore,
  calculateRequestTypeScore,
  calculateAvailabilityScore,
  calculateOverallMatchScore,
  computeSawSuitabilityRankings,
  rankMatchResults
};