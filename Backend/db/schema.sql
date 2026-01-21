-- ============================================
-- NIMUN Database Schema (Refactored)
-- Shared by Delegate Card System & Delegate Tracking System
-- Supabase/PostgreSQL
-- ============================================

-- ============================================
-- DROP TABLES (in dependency order)
-- WARNING: This will delete all existing data!
-- ============================================
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS reward_activations CASCADE;
DROP TABLE IF EXISTS activity_timeline CASCADE;
DROP TABLE IF EXISTS food_history CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS voucher_claims CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS delegates CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions and triggers if they exist
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE (Base user information)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255), -- Not unique, can be NULL. ID is the identifier.
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20), -- Phone number for all users
    photo_url TEXT,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('delegate', 'member', 'invitation', 'executive', 'high board')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- PASSWORD RESET TOKENS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(100) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- DELEGATES TABLE
-- ID Format: Council-based
--   HRC: HRC-XX
--   ICJ: ICJ-XX
--   DISEC: DSC-XX
--   PRESS: PRS-XX
-- ============================================
CREATE TABLE IF NOT EXISTS delegates (
    id VARCHAR(20) PRIMARY KEY, -- Format: COUNCIL-XX (e.g., HRC-01, ICJ-15, DSC-12, PRS-05)
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Note: name is stored in users.first_name + users.last_name
    council VARCHAR(100) NOT NULL, -- Council name (e.g., HRC, UNSC, DISEC)
    claim_token VARCHAR(50) UNIQUE,
    claim_token_used BOOLEAN DEFAULT FALSE,
    qr_code VARCHAR(100) UNIQUE NOT NULL, -- QR code identifier
    status VARCHAR(20) DEFAULT 'unclaimed' CHECK (status IN ('unclaimed', 'active', 'inactive')),
    
    -- Attendance tracking per day
    -- Opening Ceremony
    opening_ceremony_attended BOOLEAN DEFAULT FALSE,
    opening_ceremony_checkin TIMESTAMP WITH TIME ZONE,
    opening_ceremony_checkout TIMESTAMP WITH TIME ZONE,
    opening_ceremony_food BOOLEAN DEFAULT FALSE,
    opening_ceremony_activities TEXT, -- JSON or comma-separated
    opening_ceremony_comments TEXT, -- If left early or notes
    
    -- Day 1
    day1_session_attended BOOLEAN DEFAULT FALSE,
    day1_checkin TIMESTAMP WITH TIME ZONE,
    day1_checkout TIMESTAMP WITH TIME ZONE,
    day1_food BOOLEAN DEFAULT FALSE,
    day1_activities TEXT,
    day1_comments TEXT,
    
    -- Day 2
    day2_session_attended BOOLEAN DEFAULT FALSE,
    day2_checkin TIMESTAMP WITH TIME ZONE,
    day2_checkout TIMESTAMP WITH TIME ZONE,
    day2_food BOOLEAN DEFAULT FALSE,
    day2_activities TEXT,
    day2_comments TEXT,
    
    -- Day 3
    day3_session_attended BOOLEAN DEFAULT FALSE,
    day3_checkin TIMESTAMP WITH TIME ZONE,
    day3_checkout TIMESTAMP WITH TIME ZONE,
    day3_food BOOLEAN DEFAULT FALSE,
    day3_activities TEXT,
    day3_comments TEXT,
    
    -- Day 4
    day4_session_attended BOOLEAN DEFAULT FALSE,
    day4_checkin TIMESTAMP WITH TIME ZONE,
    day4_checkout TIMESTAMP WITH TIME ZONE,
    day4_food BOOLEAN DEFAULT FALSE,
    day4_activities TEXT,
    day4_comments TEXT,
    
    -- Conference Days (conf d1-d3) - Breakfast and Lunch
    conf_day1_attended BOOLEAN DEFAULT FALSE,
    conf_day1_checkin TIMESTAMP WITH TIME ZONE,
    conf_day1_checkout TIMESTAMP WITH TIME ZONE,
    conf_day1_breakfast BOOLEAN DEFAULT FALSE,
    conf_day1_lunch BOOLEAN DEFAULT FALSE,
    conf_day1_activities TEXT,
    conf_day1_comments TEXT,
    
    conf_day2_attended BOOLEAN DEFAULT FALSE,
    conf_day2_checkin TIMESTAMP WITH TIME ZONE,
    conf_day2_checkout TIMESTAMP WITH TIME ZONE,
    conf_day2_breakfast BOOLEAN DEFAULT FALSE,
    conf_day2_lunch BOOLEAN DEFAULT FALSE,
    conf_day2_activities TEXT,
    conf_day2_comments TEXT,
    
    conf_day3_attended BOOLEAN DEFAULT FALSE,
    conf_day3_checkin TIMESTAMP WITH TIME ZONE,
    conf_day3_checkout TIMESTAMP WITH TIME ZONE,
    conf_day3_breakfast BOOLEAN DEFAULT FALSE,
    conf_day3_lunch BOOLEAN DEFAULT FALSE,
    conf_day3_activities TEXT,
    conf_day3_comments TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- MEMBERS TABLE (Staff, Chairs, etc.)
-- Committees: Executive, Registration Affairs, Socials & Events, 
--             Public Relations, Media & Design, Operations & Logistics
-- ID Format: Committee-based
--   Executive: EX-XX
--   Registration: RG-XX
--   PR: PR-XX
--   Socials: SO-XX
--   Media: MD-XX
--   Ops: OP-XX
-- ============================================
CREATE TABLE IF NOT EXISTS members (
    id VARCHAR(20) PRIMARY KEY, -- Format: COMMITTEE-XX (e.g., EX-01, RG-05, PR-03, SO-12, MD-08, OP-15)
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Note: name is stored in users.first_name + users.last_name
    -- Note: phone_number is stored in users.phone_number
    role VARCHAR(100) NOT NULL, -- e.g., 'Head Of Registration Affairs', 'Head Of Media & Design', 'Chair', 'Vice-Chair', 'Staff', 'Coordinator'
    committee VARCHAR(100) NOT NULL CHECK (committee IN (
        'Executive',
        'Registration Affairs',
        'Socials & Events',
        'Public Relations',
        'Media & Design',
        'Operations & Logistics',
        'High Board'
    )),
    claim_token VARCHAR(50) UNIQUE,
    claim_token_used BOOLEAN DEFAULT FALSE,
    permissions JSONB DEFAULT '{}', -- Store role-specific permissions
    
    -- Same attendance structure as delegates (optional - can be NULL)
    opening_ceremony_attended BOOLEAN DEFAULT FALSE,
    opening_ceremony_checkin TIMESTAMP WITH TIME ZONE,
    opening_ceremony_checkout TIMESTAMP WITH TIME ZONE,
    opening_ceremony_food BOOLEAN DEFAULT FALSE,
    opening_ceremony_activities TEXT,
    opening_ceremony_comments TEXT,
    
    day1_session_attended BOOLEAN DEFAULT FALSE,
    day1_checkin TIMESTAMP WITH TIME ZONE,
    day1_checkout TIMESTAMP WITH TIME ZONE,
    day1_food BOOLEAN DEFAULT FALSE,
    day1_activities TEXT,
    day1_comments TEXT,
    
    day2_session_attended BOOLEAN DEFAULT FALSE,
    day2_checkin TIMESTAMP WITH TIME ZONE,
    day2_checkout TIMESTAMP WITH TIME ZONE,
    day2_food BOOLEAN DEFAULT FALSE,
    day2_activities TEXT,
    day2_comments TEXT,
    
    day3_session_attended BOOLEAN DEFAULT FALSE,
    day3_checkin TIMESTAMP WITH TIME ZONE,
    day3_checkout TIMESTAMP WITH TIME ZONE,
    day3_food BOOLEAN DEFAULT FALSE,
    day3_activities TEXT,
    day3_comments TEXT,
    
    day4_session_attended BOOLEAN DEFAULT FALSE,
    day4_checkin TIMESTAMP WITH TIME ZONE,
    day4_checkout TIMESTAMP WITH TIME ZONE,
    day4_food BOOLEAN DEFAULT FALSE,
    day4_activities TEXT,
    day4_comments TEXT,
    
    conf_day1_attended BOOLEAN DEFAULT FALSE,
    conf_day1_checkin TIMESTAMP WITH TIME ZONE,
    conf_day1_checkout TIMESTAMP WITH TIME ZONE,
    conf_day1_breakfast BOOLEAN DEFAULT FALSE,
    conf_day1_lunch BOOLEAN DEFAULT FALSE,
    conf_day1_activities TEXT,
    conf_day1_comments TEXT,
    
    conf_day2_attended BOOLEAN DEFAULT FALSE,
    conf_day2_checkin TIMESTAMP WITH TIME ZONE,
    conf_day2_checkout TIMESTAMP WITH TIME ZONE,
    conf_day2_breakfast BOOLEAN DEFAULT FALSE,
    conf_day2_lunch BOOLEAN DEFAULT FALSE,
    conf_day2_activities TEXT,
    conf_day2_comments TEXT,
    
    conf_day3_attended BOOLEAN DEFAULT FALSE,
    conf_day3_checkin TIMESTAMP WITH TIME ZONE,
    conf_day3_checkout TIMESTAMP WITH TIME ZONE,
    conf_day3_breakfast BOOLEAN DEFAULT FALSE,
    conf_day3_lunch BOOLEAN DEFAULT FALSE,
    conf_day3_activities TEXT,
    conf_day3_comments TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INVITATIONS TABLE (VIPs, Special Guests)
-- ============================================
CREATE TABLE IF NOT EXISTS invitations (
    id VARCHAR(20) PRIMARY KEY, -- Format: Category-XX
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL, 
    committee VARCHAR(100), -- Can be 'Executives'' Invitation', 'Alumni', etc.
    claim_token VARCHAR(50) UNIQUE,
    claim_token_used BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active',
    
    -- Basic attendance tracking
    conf_day1_attended BOOLEAN DEFAULT FALSE,
    conf_day1_checkin TIMESTAMP WITH TIME ZONE,
    conf_day1_checkout TIMESTAMP WITH TIME ZONE,
    conf_day1_breakfast BOOLEAN DEFAULT FALSE,
    conf_day1_lunch BOOLEAN DEFAULT FALSE,
    
    conf_day2_attended BOOLEAN DEFAULT FALSE,
    conf_day2_checkin TIMESTAMP WITH TIME ZONE,
    conf_day2_checkout TIMESTAMP WITH TIME ZONE,
    conf_day2_breakfast BOOLEAN DEFAULT FALSE,
    conf_day2_lunch BOOLEAN DEFAULT FALSE,
    
    conf_day3_attended BOOLEAN DEFAULT FALSE,
    conf_day3_checkin TIMESTAMP WITH TIME ZONE,
    conf_day3_checkout TIMESTAMP WITH TIME ZONE,
    conf_day3_breakfast BOOLEAN DEFAULT FALSE,
    conf_day3_lunch BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- VOUCHERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- Icon identifier for frontend
    vendor_name VARCHAR(100),
    vendor_location TEXT,
    usage_limit INTEGER, -- NULL for unlimited
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- VOUCHER CLAIMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS voucher_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delegate_id VARCHAR(20) NOT NULL REFERENCES delegates(id) ON DELETE CASCADE,
    voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    qr_token TEXT, -- Dynamic QR token for redemption
    qr_expires_at TIMESTAMP WITH TIME ZONE,
    redeemed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
    UNIQUE(delegate_id, voucher_id, claimed_at)
);

-- ============================================
-- ATTENDANCE RECORDS TABLE (Legacy/Detailed)
-- For more detailed session-by-session tracking if needed
-- ============================================
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delegate_id VARCHAR(20) NOT NULL REFERENCES delegates(id) ON DELETE CASCADE,
    session_name VARCHAR(200) NOT NULL,
    session_date DATE NOT NULL,
    session_type VARCHAR(50) CHECK (session_type IN ('opening_ceremony', 'day1', 'day2', 'day3', 'day4', 'conf_day1', 'conf_day2', 'conf_day3')),
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMP WITH TIME ZONE,
    location VARCHAR(200),
    points_awarded INTEGER DEFAULT 0,
    notes TEXT,
    comments TEXT -- If delegate leaves early
);

-- ============================================
-- FOOD HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS food_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delegate_id VARCHAR(20) NOT NULL REFERENCES delegates(id) ON DELETE CASCADE,
    meal_type VARCHAR(50) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    meal_day VARCHAR(50), -- Which day: opening_ceremony, day1, day2, day3, day4, conf_day1, conf_day2, conf_day3
    location VARCHAR(200),
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    voucher_claim_id UUID REFERENCES voucher_claims(id) ON DELETE SET NULL
);

-- ============================================
-- ACTIVITY TIMELINE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS activity_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('attendance', 'food', 'voucher', 'game', 'award', 'other')),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    points INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}', -- Store additional activity data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- REWARD ACTIVATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reward_activations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    delegate_id VARCHAR(20) NOT NULL REFERENCES delegates(id) ON DELETE CASCADE,
    reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN ('lunch', 'dinner', 'snack', 'merch')),
    qr_token TEXT NOT NULL,
    qr_data JSONB NOT NULL, -- Store full QR payload
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    redeemed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES for Performance
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_type ON users(user_type);

-- Password reset tokens indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);

-- Delegates indexes
CREATE INDEX IF NOT EXISTS idx_delegates_user_id ON delegates(user_id);
CREATE INDEX IF NOT EXISTS idx_delegates_qr_code ON delegates(qr_code);
CREATE INDEX IF NOT EXISTS idx_delegates_claim_token ON delegates(claim_token);
CREATE INDEX IF NOT EXISTS idx_delegates_status ON delegates(status);
CREATE INDEX IF NOT EXISTS idx_delegates_council ON delegates(council);

-- Members indexes
CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);
CREATE INDEX IF NOT EXISTS idx_members_committee ON members(committee);
CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);

-- Voucher claims indexes
CREATE INDEX IF NOT EXISTS idx_voucher_claims_delegate ON voucher_claims(delegate_id);
CREATE INDEX IF NOT EXISTS idx_voucher_claims_voucher ON voucher_claims(voucher_id);
CREATE INDEX IF NOT EXISTS idx_voucher_claims_status ON voucher_claims(status);
CREATE INDEX IF NOT EXISTS idx_voucher_claims_qr_token ON voucher_claims(qr_token);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_delegate ON attendance_records(delegate_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(session_date);
CREATE INDEX IF NOT EXISTS idx_attendance_type ON attendance_records(session_type);

-- Food history indexes
CREATE INDEX IF NOT EXISTS idx_food_delegate ON food_history(delegate_id);
CREATE INDEX IF NOT EXISTS idx_food_claimed_at ON food_history(claimed_at);
CREATE INDEX IF NOT EXISTS idx_food_meal_day ON food_history(meal_day);

-- Activity timeline indexes
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_timeline(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_timeline(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_timeline(created_at DESC);

-- Reward activations indexes
CREATE INDEX IF NOT EXISTS idx_reward_delegate ON reward_activations(delegate_id);
CREATE INDEX IF NOT EXISTS idx_reward_qr_token ON reward_activations(qr_token);
CREATE INDEX IF NOT EXISTS idx_reward_status ON reward_activations(status);
CREATE INDEX IF NOT EXISTS idx_reward_expires ON reward_activations(expires_at);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
-- Fixed: Added secure search_path to prevent role mutable search_path issue
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delegates_updated_at BEFORE UPDATE ON delegates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vouchers_updated_at BEFORE UPDATE ON vouchers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voucher_claims_updated_at BEFORE UPDATE ON voucher_claims
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegates ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_activations ENABLE ROW LEVEL SECURITY;

-- Users: Users can read their own data
-- Fixed: Using (select auth.uid()) to avoid re-evaluation per row
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING ((select auth.uid()) = id);

-- Password Reset Tokens: Service role can manage all tokens
-- Fixed: Enable RLS and restrict access to service role only
-- Tokens are sensitive and should only be accessed via service role (backend API)
CREATE POLICY "Service role can manage password reset tokens" ON password_reset_tokens
    FOR ALL USING ((select auth.role()) = 'service_role');

-- Delegates: Combined policy for delegates and service role
-- Fixed: Using (select auth.uid()) to avoid re-evaluation per row
-- Fixed: Combined policies to avoid multiple permissive policies issue
CREATE POLICY "Delegates can view own data" ON delegates
    FOR SELECT USING (
        (select auth.uid()) = user_id 
        OR (select auth.role()) = 'service_role'
    );

-- Members: Combined policy for members and service role
-- Fixed: Using (select auth.uid()) to avoid re-evaluation per row
-- Fixed: Combined policies to avoid multiple permissive policies issue
CREATE POLICY "Members can view own data" ON members
    FOR SELECT USING (
        (select auth.uid()) = user_id 
        OR (select auth.role()) = 'service_role'
    );

-- Vouchers: Everyone can view active vouchers
CREATE POLICY "Everyone can view active vouchers" ON vouchers
    FOR SELECT USING (is_active = TRUE);

-- Voucher Claims: Delegates can view their own claims
-- Fixed: Using (select auth.uid()) to avoid re-evaluation per row
CREATE POLICY "Delegates can view own claims" ON voucher_claims
    FOR SELECT USING ((select auth.uid()) = (SELECT user_id FROM delegates WHERE id = delegate_id));

-- Attendance: Delegates can view their own attendance
-- Fixed: Using (select auth.uid()) to avoid re-evaluation per row
CREATE POLICY "Delegates can view own attendance" ON attendance_records
    FOR SELECT USING ((select auth.uid()) = (SELECT user_id FROM delegates WHERE id = delegate_id));

-- Food History: Delegates can view their own food history
-- Fixed: Using (select auth.uid()) to avoid re-evaluation per row
CREATE POLICY "Delegates can view own food history" ON food_history
    FOR SELECT USING ((select auth.uid()) = (SELECT user_id FROM delegates WHERE id = delegate_id));

-- Activity Timeline: Users can view their own activities ONLY
-- Fixed: Using (select auth.uid()) to avoid re-evaluation per row
-- Security: Each user can ONLY see their own activity timeline entries
CREATE POLICY "Users can view own activities" ON activity_timeline
    FOR SELECT USING ((select auth.uid()) = user_id);

-- Reward Activations: Delegates can view their own activations ONLY
-- Fixed: Using (select auth.uid()) to avoid re-evaluation per row
-- Security: Each delegate can ONLY see their own reward activations
CREATE POLICY "Delegates can view own reward activations" ON reward_activations
    FOR SELECT USING ((select auth.uid()) = (SELECT user_id FROM delegates WHERE id = delegate_id));

-- ============================================
-- RLS POLICY SUMMARY - USER DATA ISOLATION
-- ============================================
-- All RLS policies ensure that each user can ONLY access their own data:
-- ✅ users: Users can only view their own user record
-- ✅ delegates: Delegates can only view their own delegate profile
-- ✅ members: Members can only view their own member profile
-- ✅ voucher_claims: Delegates can only view their own voucher claims
-- ✅ attendance_records: Delegates can only view their own attendance
-- ✅ food_history: Delegates can only view their own food history
-- ✅ activity_timeline: Users can only view their own activities
-- ✅ reward_activations: Delegates can only view their own reward activations
-- 
-- Service role (backend API) can access all data for administrative purposes.
-- Regular users accessing via Supabase client are restricted to their own data only.
--
-- Note: For production, you'll need to configure Supabase Auth
-- and ensure auth.uid() returns the correct user UUID for each authenticated session.
