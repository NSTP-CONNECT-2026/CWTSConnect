-- ============================================================
-- NSTPConnect - Request Types (School Offered Services) Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- TABLE: request_types
-- Stores services offered by the institution that communities can request
CREATE TABLE IF NOT EXISTS request_types (
  type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_request_types_name ON request_types(name);
CREATE INDEX IF NOT EXISTS idx_request_types_active ON request_types(is_active);
CREATE INDEX IF NOT EXISTS idx_request_types_created_at ON request_types(created_at DESC);

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_request_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_update_request_types_updated_at ON request_types;
CREATE TRIGGER trg_update_request_types_updated_at
  BEFORE UPDATE ON request_types
  FOR EACH ROW EXECUTE FUNCTION update_request_types_updated_at();

-- Initial Seed Data: Standard Services Offered by CWTS / NSTP
INSERT INTO request_types (name, description, required_skills, is_active)
VALUES
  (
    'Clean-up Drive & Environmental Sanitation',
    'Community-wide clean-up operations, coastal care, waste segregation drives, and waterway clearing led by student volunteers.',
    ARRAY['Environmental Awareness', 'Community Organizing', 'Documentation'],
    true
  ),
  (
    'Community Tree Planting & Urban Greening',
    'Reforestation, watershed protection, and urban greening activities to promote biodiversity and environmental resilience.',
    ARRAY['Environmental Awareness', 'Leadership', 'Documentation'],
    true
  ),
  (
    'Literacy & Tutorial Outreach Program',
    'Basic reading, writing, mathematics, and storytelling sessions for elementary pupils and out-of-school children.',
    ARRAY['Teaching', 'Public Speaking', 'Community Organizing'],
    true
  ),
  (
    'Computer Literacy & Basic IT Skills Training',
    'Hands-on digital literacy workshops for youth, barangay staff, and seniors covering computer basics, office tools, and internet safety.',
    ARRAY['Computer Literacy', 'Teaching', 'Documentation'],
    true
  ),
  (
    'Community Health & First Aid Awareness Outreach',
    'Basic health education, vital signs monitoring assistance, emergency first aid demonstrations, and hygiene advocacy.',
    ARRAY['First Aid', 'Health Education', 'Public Speaking'],
    true
  ),
  (
    'Disaster Risk Reduction & Emergency Preparedness Seminar',
    'Community drills, emergency grab-bag workshops, disaster mitigation mapping, and basic rescue preparedness training.',
    ARRAY['First Aid', 'Leadership', 'Community Organizing'],
    true
  ),
  (
    'Nutritional Feeding & Health Advocacy Program',
    'Supplementary feeding drives for undernourished children accompanied by nutrition and dietary health education for parents.',
    ARRAY['Health Education', 'Community Organizing', 'Event Management'],
    true
  ),
  (
    'Community Profiling & Needs Survey Assistance',
    'Household census support, community mapping, and socio-economic survey conducting for local government planning.',
    ARRAY['Survey Conducting', 'Data Entry', 'Documentation'],
    true
  )
ON CONFLICT (name) DO NOTHING;
