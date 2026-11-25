-- NSTPConnect Audit Logs Table Schema
-- Execute in Supabase SQL Editor if desired for cloud synchronization

CREATE TABLE IF NOT EXISTS public.audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    actor_name VARCHAR(150),
    actor_role VARCHAR(50),
    action_type VARCHAR(100),
    target_type VARCHAR(50),
    target_id VARCHAR(100),
    target_name VARCHAR(150),
    description TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_role ON public.audit_logs(actor_role);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
