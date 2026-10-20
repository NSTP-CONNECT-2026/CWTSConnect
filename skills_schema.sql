-- ============================================================
-- NSTPConnect - Skills Master List Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- TABLE: skills
-- Stores catalog of skills required for community activities & student matching
CREATE TABLE IF NOT EXISTS skills (
  skill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(100) DEFAULT 'General',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_skills_active ON skills(is_active);

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_skills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_update_skills_updated_at ON skills;
CREATE TRIGGER trg_update_skills_updated_at
  BEFORE UPDATE ON skills
  FOR EACH ROW EXECUTE FUNCTION update_skills_updated_at();

-- Initial Seed Data: Standard 15 CWTS Skills
INSERT INTO skills (name, category, description, is_active)
VALUES
  ('Teaching', 'Education', 'Tutoring, teaching basic literacy, math, and facilitating educational workshops.', true),
  ('First Aid', 'Health & Safety', 'Basic emergency first aid, CPR knowledge, vital signs monitoring, and safety assistance.', true),
  ('Leadership', 'Management & Leadership', 'Team facilitation, group delegation, youth leadership, and peer mentoring.', true),
  ('Computer Literacy', 'Information Technology', 'Basic computer operation, office software, internet navigation, and digital skills teaching.', true),
  ('Event Management', 'Management & Leadership', 'Logistics preparation, stage and crowd management, registration handling, and event coordination.', true),
  ('Documentation', 'Administration', 'Minutes taking, incident recording, activity reporting, and administrative filing.', true),
  ('Public Speaking', 'Communication', 'Program hosting, orientation delivery, community announcements, and seminar presentation.', true),
  ('Community Organizing', 'Social Services', 'Mobilizing residents, community dialogue facilitation, and stakeholder engagement.', true),
  ('Environmental Awareness', 'Environment', 'Solid waste segregation advocacy, tree caring, coastal cleanup guidance, and environmental education.', true),
  ('Health Education', 'Health & Safety', 'Handwashing and sanitation campaigns, basic nutrition advocacy, and healthy lifestyle talks.', true),
  ('Photography', 'Media & Creative', 'High-quality activity photo coverage, photo documentation, and project archiving.', true),
  ('Video Editing', 'Media & Creative', 'Audio-visual production, documentary reel trimming, and recap video creation.', true),
  ('Social Media Management', 'Media & Creative', 'Graphic poster creation, social page posting, announcement drafting, and outreach dissemination.', true),
  ('Data Entry', 'Administration', 'Digitizing handwritten surveys, spreadsheet encoding, tallying, and record validation.', true),
  ('Survey Conducting', 'Research & Assessment', 'House-to-house interview administration, questionnaire distribution, and field data gathering.', true)
ON CONFLICT (name) DO NOTHING;
