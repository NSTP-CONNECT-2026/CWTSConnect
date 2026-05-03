-- ============================================================
-- NSTPConnect Database Schema
-- Run this in your Supabase SQL Editor to set up the tables.
-- ============================================================

-- TABLE 1: users
-- Stores login credentials and account status for all system users.
CREATE TABLE IF NOT EXISTS users (
  user_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          VARCHAR(50) NOT NULL DEFAULT 'student'
                  CHECK (role IN ('student', 'community_official', 'nstp_official')),
  account_status VARCHAR(50) NOT NULL DEFAULT 'pending_verification'
                  CHECK (account_status IN ('pending_verification', 'active', 'inactive', 'blocked')),
  profile_status VARCHAR(50) NOT NULL DEFAULT 'incomplete'
                  CHECK (profile_status IN ('incomplete', 'complete')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE 2: student_profiles
-- Stores personal and academic info. Filled in after login via Profile Management.
CREATE TABLE IF NOT EXISTS student_profiles (
  profile_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  full_name       VARCHAR(255),
  student_number  VARCHAR(100) UNIQUE,
  course          VARCHAR(255),
  year_level      VARCHAR(50),
  section         VARCHAR(50),
  nstp_component  VARCHAR(100),
  contact_number  VARCHAR(20),
  birthdate       DATE,
  sex             VARCHAR(10),
  complete_address TEXT,
  barangay        VARCHAR(255),
  municipality    VARCHAR(255),
  province        VARCHAR(255),
  skills          TEXT,
  emergency_contact_name VARCHAR(255),
  emergency_contact_number VARCHAR(20),
  emergency_contact_relationship VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- TABLE 3: otp_verifications
-- Stores OTP codes used for email verification.
CREATE TABLE IF NOT EXISTS otp_verifications (
  otp_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      VARCHAR(255) NOT NULL,
  otp_code   VARCHAR(6) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_used    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast OTP lookup by email
CREATE INDEX IF NOT EXISTS idx_otp_email ON otp_verifications(email);

-- Index for fast student number lookup
CREATE INDEX IF NOT EXISTS idx_student_number ON student_profiles(student_number);

-- Auto-update updated_at on users table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_profiles_updated_at
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();