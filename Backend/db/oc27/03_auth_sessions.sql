-- ============================================
-- OC Conference '27: server-side login sessions
-- Run after 01_schema.sql. Safe to run more than once.
--
-- The API now checks every request against this table. Only a SHA-256 hash
-- of each login token is stored, so a database leak does not leak sessions.
-- ============================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.auth_sessions (
    token_hash CHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    member_id VARCHAR REFERENCES public.members(id) ON DELETE CASCADE ON UPDATE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON public.auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON public.auth_sessions(expires_at);

-- Only the backend (service role / direct Postgres connection) may touch sessions.
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;

COMMIT;
