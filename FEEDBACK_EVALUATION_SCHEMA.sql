-- ============================================================
-- NSTPConnect - Feedback & Student Performance Evaluation Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- 1. Table: student_feedback (Activity-level / Batch Community Feedback)
CREATE TABLE IF NOT EXISTS student_feedback (
  feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES deployments(deployment_id) ON DELETE CASCADE,
  student_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  community_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  community_name TEXT NOT NULL DEFAULT 'Partner Community',
  activity_title TEXT NOT NULL DEFAULT 'Community Service Activity',
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  feedback_type VARCHAR(50) DEFAULT 'General Feedback',
  comments TEXT NOT NULL,
  submitted_by TEXT,
  date_submitted DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Table: student_evaluations (Individual Student Performance Evaluation)
CREATE TABLE IF NOT EXISTS student_evaluations (
  evaluation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES deployments(deployment_id) ON DELETE CASCADE,
  student_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  evaluator_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  evaluator_name TEXT,
  student_name TEXT NOT NULL,
  community_name TEXT NOT NULL DEFAULT 'Partner Community',
  activity_title TEXT NOT NULL DEFAULT 'Community Service Activity',
  rating_punctuality DECIMAL(3,1) NOT NULL DEFAULT 5.0 CHECK (rating_punctuality >= 1.0 AND rating_punctuality <= 5.0),
  rating_community_engagement DECIMAL(3,1) NOT NULL DEFAULT 5.0 CHECK (rating_community_engagement >= 1.0 AND rating_community_engagement <= 5.0),
  rating_teamwork DECIMAL(3,1) NOT NULL DEFAULT 5.0 CHECK (rating_teamwork >= 1.0 AND rating_teamwork <= 5.0),
  rating_initiative_attitude DECIMAL(3,1) NOT NULL DEFAULT 5.0 CHECK (rating_initiative_attitude >= 1.0 AND rating_initiative_attitude <= 5.0),
  overall_score DECIMAL(3,2) NOT NULL DEFAULT 5.00 CHECK (overall_score >= 1.00 AND overall_score <= 5.00),
  performance_grade VARCHAR(50) NOT NULL DEFAULT 'Outstanding',
  criteria JSONB,
  evaluator_remarks TEXT,
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(deployment_id, student_user_id)
);

-- 3. Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_student_feedback_deployment ON student_feedback(deployment_id);
CREATE INDEX IF NOT EXISTS idx_student_feedback_community_user ON student_feedback(community_user_id);
CREATE INDEX IF NOT EXISTS idx_student_evaluations_deployment ON student_evaluations(deployment_id);
CREATE INDEX IF NOT EXISTS idx_student_evaluations_student ON student_evaluations(student_user_id);
CREATE INDEX IF NOT EXISTS idx_student_evaluations_evaluator ON student_evaluations(evaluator_user_id);

-- 4. Unique constraint to strictly prevent duplicate rating and feedback per student per deployment
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_feedback_unique_student_deployment 
ON student_feedback(deployment_id, student_user_id) 
WHERE student_user_id IS NOT NULL;
