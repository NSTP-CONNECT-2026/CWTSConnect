-- ============================================================
-- NSTPConnect - Supabase Storage Setup for CMO Requirements
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Create storage bucket for CMO requirements
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-cmo-requirements', 'student-cmo-requirements', true)
ON CONFLICT (id) DO NOTHING;