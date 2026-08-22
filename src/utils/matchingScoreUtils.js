/**
 * NSTPConnect - DSS Matching Score Utilities
 * Handles scoring calculations for student-to-community matching
 */

/**
 * Calculates location match score between student and community request
 * @param {string} studentMunicipality - Student's municipality
 * @param {string} studentProvince - Student's province
 * @param {string} requestMunicipality - Request's municipality
 * @param {string} requestProvince - Request's province
 * @returns {number} Score from 0-100
 */
function calculateLocationScore(studentMunicipality, studentProvince, requestMunicipality, requestProvince) {
  // Handle null/undefined values
  if (!studentMunicipality || !studentProvince || !requestMunicipality || !requestProvince) {
    return 20; // Default low score if location data is missing
  }

  // Normalize strings for comparison
  const normalizeName = (name) => String(name).toLowerCase().trim();
  
  const studentMuni = normalizeName(studentMunicipality);
  const studentProv = normalizeName(studentProvince);
  const requestMuni = normalizeName(requestMunicipality);
  const requestProv = normalizeName(requestProvince);

  // Same municipality = highest score
  if (studentMuni === requestMuni && studentProv === requestProv) {
    return 100;
  }

  // Same province, different municipality = medium score
  if (studentProv === requestProv) {
    return 60;
  }

  // Different province = low score
  return 20;
}

/**
 * Calculates skills match score between student skills and needed skills
 * @param {Array} studentSkills - Array of student skills
 * @param {Array} neededSkills - Array of needed skills
 * @returns {number} Score from 0-100
 */
function calculateSkillsScore(studentSkills, neededSkills) {
  // Ensure both are arrays
  const studentSkillsArray = Array.isArray(studentSkills) ? studentSkills : [];
  const neededSkillsArray = Array.isArray(neededSkills) ? neededSkills : [];

  if (studentSkillsArray.length === 0 || neededSkillsArray.length === 0) {
    return 0;
  }

  // Normalize skills for comparison
  const normalizeSkill = (skill) => {
    if (typeof skill === 'string') {
      return skill.toLowerCase().trim();
    }
    return String(skill).toLowerCase().trim();
  };
  
  const normalizedStudentSkills = studentSkillsArray.map(normalizeSkill);
  const normalizedNeededSkills = neededSkillsArray.map(normalizeSkill);

  // Count matching skills
  let matchingSkills = 0;
  normalizedNeededSkills.forEach(neededSkill => {
    if (normalizedStudentSkills.includes(neededSkill)) {
      matchingSkills++;
    }
  });

  // Calculate percentage match
  const matchPercentage = (matchingSkills / normalizedNeededSkills.length) * 100;
  
  // Return score based on match percentage
  if (matchPercentage >= 80) return 100;
  if (matchPercentage >= 60) return 85;
  if (matchPercentage >= 40) return 70;
  if (matchPercentage >= 20) return 50;
  if (matchPercentage > 0) return 30;
  
  return 0;
}

/**
 * Calculates Community Request Type Match score by matching student skills with the activity type
 * @param {Array} studentSkills - Array of student skills
 * @param {string} activityType - Community request activity type
 * @returns {number} Score from 0-100
 */
function calculateRequestTypeScore(studentSkills, activityType) {
  const studentSkillsArray = Array.isArray(studentSkills) ? studentSkills : [];
  if (!activityType) {
    return 30; // Fallback score if no activity type provided
  }

  const activitySkillsMap = {
    'Clean-up Drive': ['Environmental Awareness', 'Leadership', 'First Aid', 'Community Organizing'],
    'Tree Planting': ['Environmental Awareness', 'Leadership', 'First Aid', 'Community Organizing'],
    'Literacy Program': ['Teaching', 'Public Speaking', 'Leadership', 'Documentation'],
    'Computer Literacy Training': ['Computer Literacy', 'Teaching', 'Data Entry'],
    'Feeding Program': ['Health Education', 'First Aid', 'Leadership', 'Event Management'],
    'Disaster Preparedness': ['First Aid', 'Public Speaking', 'Leadership', 'Community Organizing'],
    'Community Survey': ['Survey Conducting', 'Data Entry', 'Documentation', 'Computer Literacy'],
    'Health Awareness Program': ['Health Education', 'Public Speaking', 'First Aid'],
    'Others': ['Community Organizing', 'Leadership']
  };

  const relevantSkills = activitySkillsMap[activityType] || ['Community Organizing', 'Leadership'];
  
  // Count matching skills
  const normalize = (s) => String(s).toLowerCase().trim();
  const normalizedStudentSkills = studentSkillsArray.map(normalize);
  const normalizedRelevantSkills = relevantSkills.map(normalize);

  let matchCount = 0;
  normalizedRelevantSkills.forEach(skill => {
    if (normalizedStudentSkills.includes(skill)) {
      matchCount++;
    }
  });

  if (matchCount >= 2) {
    return 100; // Strong match (2 or more relevant skills)
  }
  if (matchCount === 1) {
    return 75; // Moderate match (1 relevant skill)
  }
  if (studentSkillsArray.length > 0) {
    return 30; // General match (student has skills, but not specific to this activity)
  }
  return 0; // No match (no skills listed)
}

/**
 * Calculates availability score (placeholder for future deployment tracking)
 * @param {string} studentId - Student user ID
 * @returns {number} Score from 0-100
 */
function calculateAvailabilityScore(studentId) {
  // For now, all eligible students are considered available
  // This will be updated when deployment tracking is implemented
  return 100;
}

/**
 * Calculates overall match score using weighted criteria
 * @param {object} student - Student profile data
 * @param {object} request - Community request data
 * @returns {object} Detailed scoring breakdown
 */
function calculateOverallMatchScore(student, request) {
  // Calculate individual scores
  const locationScore = calculateLocationScore(
    student.municipality,
    student.province,
    request.municipality,
    request.province
  );

  const skillsScore = calculateSkillsScore(
    student.skills,
    request.needed_skills
  );

  const componentScore = calculateRequestTypeScore(
    student.skills,
    request.activity_type
  );

  const availabilityScore = calculateAvailabilityScore(student.user_id);

  // Weighted scoring (totals 100%)
  const weights = {
    skills: 0.40,      // 40% - Most important
    location: 0.30,    // 30% - Very important for logistics
    component: 0.20,   // 20% - Important for program requirements
    availability: 0.10 // 10% - Basic eligibility check
  };

  // Calculate weighted total
  const totalScore = Math.round(
    (skillsScore * weights.skills) +
    (locationScore * weights.location) +
    (componentScore * weights.component) +
    (availabilityScore * weights.availability)
  );

  // Determine match label
  let matchLabel;
  if (totalScore >= 90) {
    matchLabel = 'Excellent';
  } else if (totalScore >= 75) {
    matchLabel = 'Good';
  } else if (totalScore >= 60) {
    matchLabel = 'Fair';
  } else {
    matchLabel = 'Poor';
  }

  return {
    totalScore,
    matchLabel,
    breakdown: {
      locationScore,
      skillsScore,
      componentScore,
      availabilityScore
    }
  };
}

/**
 * Sorts students by match score (highest first)
 * @param {Array} matchResults - Array of match result objects
 * @returns {Array} Sorted array with recommendation ranks
 */
function rankMatchResults(matchResults) {
  // Sort by total score (descending)
  const sorted = matchResults.sort((a, b) => b.totalScore - a.totalScore);

  // Add recommendation rank
  return sorted.map((result, index) => ({
    ...result,
    recommendationRank: index + 1
  }));
}

module.exports = {
  calculateLocationScore,
  calculateSkillsScore,
  calculateRequestTypeScore,
  calculateAvailabilityScore,
  calculateOverallMatchScore,
  rankMatchResults
};