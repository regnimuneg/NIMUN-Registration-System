-- ============================================
-- NIMUN'26 Supabase full reset schema
-- ============================================
--
-- WARNING: This script deletes all existing application data.
-- Run it only when you are ready to reseed the database.
--
-- This reset recreates the current Supabase schema and keeps past_awards
-- columns ready for the next seed files.

BEGIN;

-- ============================================
-- DROP EXISTING DATA / TABLES
-- ============================================

DROP TABLE IF EXISTS public.password_reset_tokens CASCADE;
DROP TABLE IF EXISTS public.reward_activations CASCADE;
DROP TABLE IF EXISTS public.activity_timeline CASCADE;
DROP TABLE IF EXISTS public.food_history CASCADE;
DROP TABLE IF EXISTS public.attendance_records CASCADE;
DROP TABLE IF EXISTS public.voucher_claims CASCADE;
DROP TABLE IF EXISTS public.vouchers CASCADE;
DROP TABLE IF EXISTS public.delegates CASCADE;
DROP TABLE IF EXISTS public.members CASCADE;
DROP TABLE IF EXISTS public.invitations CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- USERS
-- ============================================

CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR,
    password_hash VARCHAR NOT NULL,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    phone_number VARCHAR,
    photo_url TEXT,
    user_type VARCHAR NOT NULL CHECK (
        user_type IN (
            'delegate',
            'member',
            'invitation',
            'executive',
            'high board'
        )
    ),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PASSWORD RESET TOKENS
-- ============================================

CREATE TABLE public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token VARCHAR NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DELEGATES
-- ============================================

CREATE TABLE public.delegates (
    id VARCHAR NOT NULL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    council VARCHAR NOT NULL,
    claim_token VARCHAR UNIQUE,
    claim_token_used BOOLEAN DEFAULT FALSE,
    qr_code VARCHAR NOT NULL UNIQUE,
    status VARCHAR DEFAULT 'unclaimed' CHECK (
        status IN ('unclaimed', 'active', 'inactive')
    ),
    award VARCHAR,
    past_awards TEXT[] NOT NULL DEFAULT '{}'::TEXT[],

    opening_ceremony_checkin TIMESTAMP WITH TIME ZONE,
    opening_ceremony_checkout TIMESTAMP WITH TIME ZONE,
    opening_ceremony_bus_checkin TIMESTAMP WITH TIME ZONE,
    opening_ceremony_bus_checkout TIMESTAMP WITH TIME ZONE,
    opening_ceremony_activities TEXT,
    opening_ceremony_comments TEXT,
    opening_ceremony_attended BOOLEAN DEFAULT FALSE,
    opening_ceremony_food BOOLEAN DEFAULT FALSE,

    day1_checkin TIMESTAMP WITH TIME ZONE,
    day1_checkout TIMESTAMP WITH TIME ZONE,
    day1_bus_checkin TIMESTAMP WITH TIME ZONE,
    day1_bus_checkout TIMESTAMP WITH TIME ZONE,
    day1_activities TEXT,
    day1_comments TEXT,
    day1_session_attended BOOLEAN DEFAULT FALSE,
    day1_food BOOLEAN DEFAULT FALSE,

    day2_checkin TIMESTAMP WITH TIME ZONE,
    day2_checkout TIMESTAMP WITH TIME ZONE,
    day2_bus_checkin TIMESTAMP WITH TIME ZONE,
    day2_bus_checkout TIMESTAMP WITH TIME ZONE,
    day2_activities TEXT,
    day2_comments TEXT,
    day2_session_attended BOOLEAN DEFAULT FALSE,
    day2_food BOOLEAN DEFAULT FALSE,

    day3_checkin TIMESTAMP WITH TIME ZONE,
    day3_checkout TIMESTAMP WITH TIME ZONE,
    day3_bus_checkin TIMESTAMP WITH TIME ZONE,
    day3_bus_checkout TIMESTAMP WITH TIME ZONE,
    day3_activities TEXT,
    day3_comments TEXT,
    day3_session_attended BOOLEAN DEFAULT FALSE,
    day3_food BOOLEAN DEFAULT FALSE,

    day4_checkin TIMESTAMP WITH TIME ZONE,
    day4_checkout TIMESTAMP WITH TIME ZONE,
    day4_bus_checkin TIMESTAMP WITH TIME ZONE,
    day4_bus_checkout TIMESTAMP WITH TIME ZONE,
    day4_activities TEXT,
    day4_comments TEXT,
    day4_session_attended BOOLEAN DEFAULT FALSE,
    day4_food BOOLEAN DEFAULT FALSE,

    -- Performance Day bus tracking
    performance_day_bus_checkin TIMESTAMP WITH TIME ZONE,
    performance_day_bus_checkout TIMESTAMP WITH TIME ZONE,

    conf_day1_checkin TIMESTAMP WITH TIME ZONE,
    conf_day1_checkout TIMESTAMP WITH TIME ZONE,
    conf_day1_bus_checkin TIMESTAMP WITH TIME ZONE,
    conf_day1_bus_checkout TIMESTAMP WITH TIME ZONE,
    conf_day1_activities TEXT,
    conf_day1_comments TEXT,
    conf_day1_attended BOOLEAN DEFAULT FALSE,
    conf_day1_breakfast BOOLEAN DEFAULT FALSE,
    conf_day1_lunch BOOLEAN DEFAULT FALSE,

    conf_day2_checkin TIMESTAMP WITH TIME ZONE,
    conf_day2_checkout TIMESTAMP WITH TIME ZONE,
    conf_day2_bus_checkin TIMESTAMP WITH TIME ZONE,
    conf_day2_bus_checkout TIMESTAMP WITH TIME ZONE,
    conf_day2_activities TEXT,
    conf_day2_comments TEXT,
    conf_day2_attended BOOLEAN DEFAULT FALSE,
    conf_day2_breakfast BOOLEAN DEFAULT FALSE,
    conf_day2_lunch BOOLEAN DEFAULT FALSE,

    conf_day3_checkin TIMESTAMP WITH TIME ZONE,
    conf_day3_checkout TIMESTAMP WITH TIME ZONE,
    conf_day3_bus_checkin TIMESTAMP WITH TIME ZONE,
    conf_day3_bus_checkout TIMESTAMP WITH TIME ZONE,
    conf_day3_activities TEXT,
    conf_day3_comments TEXT,
    conf_day3_attended BOOLEAN DEFAULT FALSE,
    conf_day3_breakfast BOOLEAN DEFAULT FALSE,
    conf_day3_lunch BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- MEMBERS
-- ============================================

CREATE TABLE public.members (
    id VARCHAR NOT NULL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR NOT NULL,
    committee VARCHAR NOT NULL CHECK (
        committee IN (
            'Executive',
            'Registration Affairs',
            'Socials & Events',
            'Public Relations',
            'Media & Design',
            'Operations & Logistics',
            'High Board'
        )
    ),
    claim_token VARCHAR UNIQUE,
    claim_token_used BOOLEAN DEFAULT FALSE,
    permissions JSONB DEFAULT '{}',
    award VARCHAR,
    past_awards TEXT[] NOT NULL DEFAULT '{}'::TEXT[],

    opening_ceremony_checkin TIMESTAMP WITH TIME ZONE,
    opening_ceremony_checkout TIMESTAMP WITH TIME ZONE,
    opening_ceremony_bus_checkin TIMESTAMP WITH TIME ZONE,
    opening_ceremony_bus_checkout TIMESTAMP WITH TIME ZONE,
    opening_ceremony_activities TEXT,
    opening_ceremony_comments TEXT,
    opening_ceremony_attended BOOLEAN DEFAULT FALSE,
    opening_ceremony_food BOOLEAN DEFAULT FALSE,

    day1_checkin TIMESTAMP WITH TIME ZONE,
    day1_checkout TIMESTAMP WITH TIME ZONE,
    day1_bus_checkin TIMESTAMP WITH TIME ZONE,
    day1_bus_checkout TIMESTAMP WITH TIME ZONE,
    day1_activities TEXT,
    day1_comments TEXT,
    day1_session_attended BOOLEAN DEFAULT FALSE,
    day1_food BOOLEAN DEFAULT FALSE,

    day2_checkin TIMESTAMP WITH TIME ZONE,
    day2_checkout TIMESTAMP WITH TIME ZONE,
    day2_bus_checkin TIMESTAMP WITH TIME ZONE,
    day2_bus_checkout TIMESTAMP WITH TIME ZONE,
    day2_activities TEXT,
    day2_comments TEXT,
    day2_session_attended BOOLEAN DEFAULT FALSE,
    day2_food BOOLEAN DEFAULT FALSE,

    day3_checkin TIMESTAMP WITH TIME ZONE,
    day3_checkout TIMESTAMP WITH TIME ZONE,
    day3_bus_checkin TIMESTAMP WITH TIME ZONE,
    day3_bus_checkout TIMESTAMP WITH TIME ZONE,
    day3_activities TEXT,
    day3_comments TEXT,
    day3_session_attended BOOLEAN DEFAULT FALSE,
    day3_food BOOLEAN DEFAULT FALSE,

    day4_checkin TIMESTAMP WITH TIME ZONE,
    day4_checkout TIMESTAMP WITH TIME ZONE,
    day4_bus_checkin TIMESTAMP WITH TIME ZONE,
    day4_bus_checkout TIMESTAMP WITH TIME ZONE,
    day4_activities TEXT,
    day4_comments TEXT,
    day4_session_attended BOOLEAN DEFAULT FALSE,
    day4_food BOOLEAN DEFAULT FALSE,

    -- Performance Day bus tracking
    performance_day_bus_checkin TIMESTAMP WITH TIME ZONE,
    performance_day_bus_checkout TIMESTAMP WITH TIME ZONE,

    conf_day1_checkin TIMESTAMP WITH TIME ZONE,
    conf_day1_checkout TIMESTAMP WITH TIME ZONE,
    conf_day1_bus_checkin TIMESTAMP WITH TIME ZONE,
    conf_day1_bus_checkout TIMESTAMP WITH TIME ZONE,
    conf_day1_activities TEXT,
    conf_day1_comments TEXT,
    conf_day1_attended BOOLEAN DEFAULT FALSE,
    conf_day1_breakfast BOOLEAN DEFAULT FALSE,
    conf_day1_lunch BOOLEAN DEFAULT FALSE,

    conf_day2_checkin TIMESTAMP WITH TIME ZONE,
    conf_day2_checkout TIMESTAMP WITH TIME ZONE,
    conf_day2_bus_checkin TIMESTAMP WITH TIME ZONE,
    conf_day2_bus_checkout TIMESTAMP WITH TIME ZONE,
    conf_day2_activities TEXT,
    conf_day2_comments TEXT,
    conf_day2_attended BOOLEAN DEFAULT FALSE,
    conf_day2_breakfast BOOLEAN DEFAULT FALSE,
    conf_day2_lunch BOOLEAN DEFAULT FALSE,

    conf_day3_checkin TIMESTAMP WITH TIME ZONE,
    conf_day3_checkout TIMESTAMP WITH TIME ZONE,
    conf_day3_bus_checkin TIMESTAMP WITH TIME ZONE,
    conf_day3_bus_checkout TIMESTAMP WITH TIME ZONE,
    conf_day3_activities TEXT,
    conf_day3_comments TEXT,
    conf_day3_attended BOOLEAN DEFAULT FALSE,
    conf_day3_breakfast BOOLEAN DEFAULT FALSE,
    conf_day3_lunch BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INVITATIONS
-- ============================================

CREATE TABLE public.invitations (
    id VARCHAR NOT NULL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role VARCHAR NOT NULL,
    committee VARCHAR,
    claim_token VARCHAR UNIQUE,
    claim_token_used BOOLEAN DEFAULT FALSE,
    status VARCHAR DEFAULT 'active',

    conf_day1_checkin TIMESTAMP WITH TIME ZONE,
    conf_day1_checkout TIMESTAMP WITH TIME ZONE,
    conf_day1_attended BOOLEAN DEFAULT FALSE,
    conf_day1_breakfast BOOLEAN DEFAULT FALSE,
    conf_day1_lunch BOOLEAN DEFAULT FALSE,

    conf_day2_checkin TIMESTAMP WITH TIME ZONE,
    conf_day2_checkout TIMESTAMP WITH TIME ZONE,
    conf_day2_attended BOOLEAN DEFAULT FALSE,
    conf_day2_breakfast BOOLEAN DEFAULT FALSE,
    conf_day2_lunch BOOLEAN DEFAULT FALSE,

    conf_day3_checkin TIMESTAMP WITH TIME ZONE,
    conf_day3_checkout TIMESTAMP WITH TIME ZONE,
    conf_day3_attended BOOLEAN DEFAULT FALSE,
    conf_day3_breakfast BOOLEAN DEFAULT FALSE,
    conf_day3_lunch BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- VOUCHERS
-- ============================================

CREATE TABLE public.vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    static_code VARCHAR,
    name VARCHAR NOT NULL,
    description TEXT,
    icon VARCHAR,
    vendor_name VARCHAR,
    vendor_location TEXT,
    usage_limit INTEGER,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- VOUCHER CLAIMS
-- ============================================

CREATE TABLE public.voucher_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id VARCHAR REFERENCES public.members(id) ON DELETE CASCADE,
    delegate_id VARCHAR REFERENCES public.delegates(id) ON DELETE CASCADE,
    voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
    qr_token TEXT,
    qr_expires_at TIMESTAMP WITH TIME ZONE,
    redeemed_at TIMESTAMP WITH TIME ZONE,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR DEFAULT 'active' CHECK (
        status IN ('active', 'redeemed', 'expired', 'cancelled')
    ),
    CONSTRAINT voucher_claims_exactly_one_owner CHECK (
        (member_id IS NOT NULL AND delegate_id IS NULL)
        OR (member_id IS NULL AND delegate_id IS NOT NULL)
    )
);

-- ============================================
-- ATTENDANCE RECORDS
-- ============================================

CREATE TABLE public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delegate_id VARCHAR NOT NULL REFERENCES public.delegates(id) ON DELETE CASCADE,
    session_name VARCHAR NOT NULL,
    session_date DATE NOT NULL,
    session_type VARCHAR CHECK (
        session_type IN (
            'opening_ceremony',
            'day1',
            'day2',
            'day3',
            'day4',
            'conf_day1',
            'conf_day2',
            'conf_day3'
        )
    ),
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMP WITH TIME ZONE,
    location VARCHAR,
    points_awarded INTEGER DEFAULT 0,
    notes TEXT,
    comments TEXT
);

-- ============================================
-- FOOD HISTORY
-- ============================================

CREATE TABLE public.food_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delegate_id VARCHAR NOT NULL REFERENCES public.delegates(id) ON DELETE CASCADE,
    meal_type VARCHAR NOT NULL CHECK (
        meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')
    ),
    meal_day VARCHAR,
    location VARCHAR,
    voucher_claim_id UUID REFERENCES public.voucher_claims(id) ON DELETE SET NULL,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ACTIVITY TIMELINE
-- ============================================

CREATE TABLE public.activity_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    activity_type VARCHAR NOT NULL CHECK (
        activity_type IN (
            'attendance',
            'food',
            'voucher',
            'game',
            'award',
            'other',
            'bus'
        )
    ),
    title VARCHAR NOT NULL,
    description TEXT,
    points INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- REWARD ACTIVATIONS
-- ============================================

CREATE TABLE public.reward_activations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delegate_id VARCHAR NOT NULL REFERENCES public.delegates(id) ON DELETE CASCADE,
    reward_type VARCHAR NOT NULL CHECK (
        reward_type IN ('lunch', 'dinner', 'snack', 'merch')
    ),
    qr_token TEXT NOT NULL,
    qr_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    redeemed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR DEFAULT 'active' CHECK (
        status IN ('active', 'redeemed', 'expired', 'cancelled')
    ),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_type ON public.users(user_type);

CREATE INDEX idx_password_reset_user ON public.password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_token ON public.password_reset_tokens(token);
CREATE INDEX idx_password_reset_expires ON public.password_reset_tokens(expires_at);

CREATE INDEX idx_delegates_user_id ON public.delegates(user_id);
CREATE INDEX idx_delegates_qr_code ON public.delegates(qr_code);
CREATE INDEX idx_delegates_claim_token ON public.delegates(claim_token);
CREATE INDEX idx_delegates_status ON public.delegates(status);
CREATE INDEX idx_delegates_council ON public.delegates(council);

CREATE INDEX idx_members_user_id ON public.members(user_id);
CREATE INDEX idx_members_committee ON public.members(committee);
CREATE INDEX idx_members_role ON public.members(role);
CREATE INDEX idx_members_claim_token ON public.members(claim_token);

CREATE INDEX idx_invitations_user_id ON public.invitations(user_id);
CREATE INDEX idx_invitations_status ON public.invitations(status);
CREATE INDEX idx_invitations_claim_token ON public.invitations(claim_token);

CREATE INDEX idx_vouchers_static_code ON public.vouchers(static_code);
CREATE INDEX idx_vouchers_active ON public.vouchers(is_active);
CREATE INDEX idx_vouchers_valid_until ON public.vouchers(valid_until);

CREATE INDEX idx_voucher_claims_delegate ON public.voucher_claims(delegate_id);
CREATE INDEX idx_voucher_claims_member ON public.voucher_claims(member_id);
CREATE INDEX idx_voucher_claims_voucher ON public.voucher_claims(voucher_id);
CREATE INDEX idx_voucher_claims_status ON public.voucher_claims(status);
CREATE INDEX idx_voucher_claims_qr_token ON public.voucher_claims(qr_token);

CREATE INDEX idx_attendance_delegate ON public.attendance_records(delegate_id);
CREATE INDEX idx_attendance_date ON public.attendance_records(session_date);
CREATE INDEX idx_attendance_type ON public.attendance_records(session_type);

CREATE INDEX idx_food_delegate ON public.food_history(delegate_id);
CREATE INDEX idx_food_claimed_at ON public.food_history(claimed_at);
CREATE INDEX idx_food_meal_day ON public.food_history(meal_day);

CREATE INDEX idx_activity_user ON public.activity_timeline(user_id);
CREATE INDEX idx_activity_type ON public.activity_timeline(activity_type);
CREATE INDEX idx_activity_created ON public.activity_timeline(created_at DESC);

CREATE INDEX idx_reward_delegate ON public.reward_activations(delegate_id);
CREATE INDEX idx_reward_qr_token ON public.reward_activations(qr_token);
CREATE INDEX idx_reward_status ON public.reward_activations(status);
CREATE INDEX idx_reward_expires ON public.reward_activations(expires_at);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_delegates_updated_at
BEFORE UPDATE ON public.delegates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_members_updated_at
BEFORE UPDATE ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invitations_updated_at
BEFORE UPDATE ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vouchers_updated_at
BEFORE UPDATE ON public.vouchers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Do not add an update trigger to voucher_claims unless updated_at is added.

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delegates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_activations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

CREATE POLICY "Users can view own data"
ON public.users
FOR SELECT
USING (
    (SELECT auth.uid()) = id
    OR (SELECT auth.role()) = 'service_role'
);

CREATE POLICY "Service role can manage password reset tokens"
ON public.password_reset_tokens
FOR ALL
USING (
    (SELECT auth.role()) = 'service_role'
)
WITH CHECK (
    (SELECT auth.role()) = 'service_role'
);

CREATE POLICY "Delegates can view own data"
ON public.delegates
FOR SELECT
USING (
    (SELECT auth.uid()) = user_id
    OR (SELECT auth.role()) = 'service_role'
);

CREATE POLICY "Members can view own data"
ON public.members
FOR SELECT
USING (
    (SELECT auth.uid()) = user_id
    OR (SELECT auth.role()) = 'service_role'
);

CREATE POLICY "Invitations can view own data"
ON public.invitations
FOR SELECT
USING (
    (SELECT auth.uid()) = user_id
    OR (SELECT auth.role()) = 'service_role'
);

CREATE POLICY "Everyone can view active vouchers"
ON public.vouchers
FOR SELECT
USING (
    is_active = TRUE
    OR (SELECT auth.role()) = 'service_role'
);

CREATE POLICY "Users can view own voucher claims"
ON public.voucher_claims
FOR SELECT
USING (
    (SELECT auth.role()) = 'service_role'
    OR (
        delegate_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.delegates d
            WHERE d.id = voucher_claims.delegate_id
              AND d.user_id = (SELECT auth.uid())
        )
    )
    OR (
        member_id IS NOT NULL
        AND EXISTS (
            SELECT 1
            FROM public.members m
            WHERE m.id = voucher_claims.member_id
              AND m.user_id = (SELECT auth.uid())
        )
    )
);

CREATE POLICY "Delegates can view own attendance"
ON public.attendance_records
FOR SELECT
USING (
    (SELECT auth.role()) = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM public.delegates d
        WHERE d.id = attendance_records.delegate_id
          AND d.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Delegates can view own food history"
ON public.food_history
FOR SELECT
USING (
    (SELECT auth.role()) = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM public.delegates d
        WHERE d.id = food_history.delegate_id
          AND d.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "Users can view own activities"
ON public.activity_timeline
FOR SELECT
USING (
    (SELECT auth.uid()) = user_id
    OR (SELECT auth.role()) = 'service_role'
);

CREATE POLICY "Delegates can view own reward activations"
ON public.reward_activations
FOR SELECT
USING (
    (SELECT auth.role()) = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM public.delegates d
        WHERE d.id = reward_activations.delegate_id
          AND d.user_id = (SELECT auth.uid())
    )
);

COMMIT;
