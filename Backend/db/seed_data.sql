-- ============================================
-- NIMUN'26 Comprehensive Database Seed Data
-- Councils: UNHRC (HRC), ICJ, DISEC (DSC), PRESS (PRS)
-- Committees: Executive, Registration Affairs, Socials, PR, Media & Design, Operations
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ADMIN ACCOUNT
-- Email: adhamabdelaal@nimuneg.org | Password: adhoma2026
-- ============================================
DO $$
DECLARE
    admin_user_id UUID;
    admin_password_hash VARCHAR;
BEGIN
    admin_password_hash := crypt('adhoma2026', gen_salt('bf', 10));
    
    INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, user_type)
    VALUES (
        'aaaaaaaa-0000-0000-0000-000000000001',
        'adhamabdelaal@nimuneg.org',
        admin_password_hash,
        'Adham',
        'Abdelaal',
        '+201000000001',
        'member'
    )
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
    RETURNING id INTO admin_user_id;
    
    INSERT INTO members (id, user_id, role, committee, permissions, opening_ceremony_attended)
    VALUES (
        'ADMIN-01',
        'aaaaaaaa-0000-0000-0000-000000000001',
        'Head of Administration',
        'Executive',
        '{"admin": true, "super_admin": true, "manage_all": true}',
        TRUE
    )
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, permissions = EXCLUDED.permissions;
    
    RAISE NOTICE '✅ Admin account created: adhamabdelaal@nimuneg.org';
END $$;

-- ============================================
-- MEMBER USERS (Staff) - Password: member ID
-- ============================================
DO $$
BEGIN
    -- Executive Committee
    INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, user_type) VALUES
    ('bbbbbbbb-0001-0000-0000-000000000001', 'ex-01@nimuneg.org', crypt('EX-01', gen_salt('bf', 10)), 'Mohamed', 'Secretary', '+201100000001', 'member'),
    ('bbbbbbbb-0001-0000-0000-000000000002', 'ex-02@nimuneg.org', crypt('EX-02', gen_salt('bf', 10)), 'Mariam', 'Deputy', '+201100000002', 'member')
    ON CONFLICT (email) DO NOTHING;
    
    -- Registration Affairs
    INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, user_type) VALUES
    ('bbbbbbbb-0002-0000-0000-000000000001', 'rg-01@nimuneg.org', crypt('RG-01', gen_salt('bf', 10)), 'Ali', 'Registration', '+201100000003', 'member'),
    ('bbbbbbbb-0002-0000-0000-000000000002', 'rg-02@nimuneg.org', crypt('RG-02', gen_salt('bf', 10)), 'Sara', 'RegStaff', '+201100000004', 'member')
    ON CONFLICT (email) DO NOTHING;
    
    -- Socials & Events
    INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, user_type) VALUES
    ('bbbbbbbb-0003-0000-0000-000000000001', 'so-01@nimuneg.org', crypt('SO-01', gen_salt('bf', 10)), 'Hana', 'Events', '+201100000005', 'member'),
    ('bbbbbbbb-0003-0000-0000-000000000002', 'so-02@nimuneg.org', crypt('SO-02', gen_salt('bf', 10)), 'Layla', 'Social', '+201100000006', 'member')
    ON CONFLICT (email) DO NOTHING;
    
    -- Public Relations
    INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, user_type) VALUES
    ('bbbbbbbb-0004-0000-0000-000000000001', 'pr-01@nimuneg.org', crypt('PR-01', gen_salt('bf', 10)), 'Yasmin', 'PR', '+201100000007', 'member'),
    ('bbbbbbbb-0004-0000-0000-000000000002', 'pr-02@nimuneg.org', crypt('PR-02', gen_salt('bf', 10)), 'Nour', 'Comm', '+201100000008', 'member')
    ON CONFLICT (email) DO NOTHING;
    
    -- Media & Design
    INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, user_type) VALUES
    ('bbbbbbbb-0005-0000-0000-000000000001', 'md-01@nimuneg.org', crypt('MD-01', gen_salt('bf', 10)), 'Khaled', 'Designer', '+201100000009', 'member'),
    ('bbbbbbbb-0005-0000-0000-000000000002', 'md-02@nimuneg.org', crypt('MD-02', gen_salt('bf', 10)), 'Ahmed', 'Video', '+201100000010', 'member')
    ON CONFLICT (email) DO NOTHING;
    
    -- Operations & Logistics
    INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, user_type) VALUES
    ('bbbbbbbb-0006-0000-0000-000000000001', 'op-01@nimuneg.org', crypt('OP-01', gen_salt('bf', 10)), 'Amira', 'Logistics', '+201100000011', 'member'),
    ('bbbbbbbb-0006-0000-0000-000000000002', 'op-02@nimuneg.org', crypt('OP-02', gen_salt('bf', 10)), 'Youssef', 'Operations', '+201100000012', 'member')
    ON CONFLICT (email) DO NOTHING;
    
    RAISE NOTICE '✅ Member accounts created';
END $$;

-- Members table entries
INSERT INTO members (id, user_id, role, committee, permissions, opening_ceremony_attended, opening_ceremony_food) VALUES
('EX-01', 'bbbbbbbb-0001-0000-0000-000000000001', 'Secretary General', 'Executive', '{"admin": true, "manage_delegates": true, "manage_members": true}', TRUE, TRUE),
('EX-02', 'bbbbbbbb-0001-0000-0000-000000000002', 'Deputy Secretary General', 'Executive', '{"admin": true, "manage_delegates": true}', TRUE, TRUE),
('RG-01', 'bbbbbbbb-0002-0000-0000-000000000001', 'Head Of Registration Affairs', 'Registration Affairs', '{"manage_delegates": true, "check_in": true}', TRUE, TRUE),
('RG-02', 'bbbbbbbb-0002-0000-0000-000000000002', 'Registration Staff', 'Registration Affairs', '{"check_in": true}', TRUE, TRUE),
('SO-01', 'bbbbbbbb-0003-0000-0000-000000000001', 'Head Of Socials & Events', 'Socials & Events', '{"manage_events": true, "manage_vouchers": true}', TRUE, TRUE),
('SO-02', 'bbbbbbbb-0003-0000-0000-000000000002', 'Social Events Coordinator', 'Socials & Events', '{"manage_events": true}', TRUE, TRUE),
('PR-01', 'bbbbbbbb-0004-0000-0000-000000000001', 'Head Of Public Relations', 'Public Relations', '{"manage_pr": true}', TRUE, TRUE),
('PR-02', 'bbbbbbbb-0004-0000-0000-000000000002', 'PR Coordinator', 'Public Relations', '{"manage_pr": true}', TRUE, FALSE),
('MD-01', 'bbbbbbbb-0005-0000-0000-000000000001', 'Head Of Media & Design', 'Media & Design', '{"manage_media": true}', TRUE, TRUE),
('MD-02', 'bbbbbbbb-0005-0000-0000-000000000002', 'Video Producer', 'Media & Design', '{"manage_media": true}', TRUE, TRUE),
('OP-01', 'bbbbbbbb-0006-0000-0000-000000000001', 'Head Of Operations & Logistics', 'Operations & Logistics', '{"manage_operations": true}', TRUE, TRUE),
('OP-02', 'bbbbbbbb-0006-0000-0000-000000000002', 'Logistics Coordinator', 'Operations & Logistics', '{"manage_operations": true}', TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- DELEGATE USERS - Password: delegate ID
-- Councils: HRC, ICJ, DSC (DISEC), PRS (PRESS)
-- ============================================
DO $$
BEGIN
    -- HRC (UNHRC) Delegates
    INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, date_of_birth, user_type) VALUES
    ('cccccccc-0001-0000-0000-000000000001', 'hrc01@delegate.nimuneg.org', crypt('HRC-01', gen_salt('bf', 10)), 'Ahmed', 'Hassan', '+201200000001', '2003-05-15', 'delegate'),
    ('cccccccc-0001-0000-0000-000000000002', 'hrc02@delegate.nimuneg.org', crypt('HRC-02', gen_salt('bf', 10)), 'Sarah', 'Omar', '+201200000002', '2004-08-22', 'delegate'),
    ('cccccccc-0001-0000-0000-000000000003', 'hrc03@delegate.nimuneg.org', crypt('HRC-03', gen_salt('bf', 10)), 'Youssef', 'Ali', '+201200000003', '2005-02-10', 'delegate'),
    ('cccccccc-0001-0000-0000-000000000004', 'hrc04@delegate.nimuneg.org', crypt('HRC-04', gen_salt('bf', 10)), 'Nadia', 'Farouk', '+201200000004', '2004-11-05', 'delegate'),
    ('cccccccc-0001-0000-0000-000000000005', 'hrc05@delegate.nimuneg.org', crypt('HRC-05', gen_salt('bf', 10)), 'Karim', 'Mostafa', '+201200000005', '2003-07-18', 'delegate')
    ON CONFLICT (email) DO NOTHING;
    
    -- ICJ Delegates
    INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, date_of_birth, user_type) VALUES
    ('cccccccc-0002-0000-0000-000000000001', 'icj01@delegate.nimuneg.org', crypt('ICJ-01', gen_salt('bf', 10)), 'Nour', 'Mahmoud', '+201200000006', '2003-11-30', 'delegate'),
    ('cccccccc-0002-0000-0000-000000000002', 'icj02@delegate.nimuneg.org', crypt('ICJ-02', gen_salt('bf', 10)), 'Omar', 'Khaled', '+201200000007', '2004-04-18', 'delegate'),
    ('cccccccc-0002-0000-0000-000000000003', 'icj03@delegate.nimuneg.org', crypt('ICJ-03', gen_salt('bf', 10)), 'Layla', 'Ibrahim', '+201200000008', '2005-01-25', 'delegate'),
    ('cccccccc-0002-0000-0000-000000000004', 'icj04@delegate.nimuneg.org', crypt('ICJ-04', gen_salt('bf', 10)), 'Tarek', 'Samir', '+201200000009', '2003-09-12', 'delegate')
    ON CONFLICT (email) DO NOTHING;
    
    -- DSC (DISEC) Delegates
    INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, date_of_birth, user_type) VALUES
    ('cccccccc-0003-0000-0000-000000000001', 'dsc01@delegate.nimuneg.org', crypt('DSC-01', gen_salt('bf', 10)), 'Fatma', 'Ahmed', '+201200000010', '2005-07-25', 'delegate'),
    ('cccccccc-0003-0000-0000-000000000002', 'dsc02@delegate.nimuneg.org', crypt('DSC-02', gen_salt('bf', 10)), 'Mohamed', 'Saeed', '+201200000011', '2003-09-12', 'delegate'),
    ('cccccccc-0003-0000-0000-000000000003', 'dsc03@delegate.nimuneg.org', crypt('DSC-03', gen_salt('bf', 10)), 'Aya', 'Nasser', '+201200000012', '2004-03-08', 'delegate'),
    ('cccccccc-0003-0000-0000-000000000004', 'dsc04@delegate.nimuneg.org', crypt('DSC-04', gen_salt('bf', 10)), 'Hassan', 'Abdel', '+201200000013', '2005-06-20', 'delegate')
    ON CONFLICT (email) DO NOTHING;
    
    -- PRS (PRESS) Delegates
    INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, date_of_birth, user_type) VALUES
    ('cccccccc-0004-0000-0000-000000000001', 'prs01@delegate.nimuneg.org', crypt('PRS-01', gen_salt('bf', 10)), 'Dina', 'Adel', '+201200000014', '2004-12-05', 'delegate'),
    ('cccccccc-0004-0000-0000-000000000002', 'prs02@delegate.nimuneg.org', crypt('PRS-02', gen_salt('bf', 10)), 'Rania', 'Fathy', '+201200000015', '2005-03-28', 'delegate'),
    ('cccccccc-0004-0000-0000-000000000003', 'prs03@delegate.nimuneg.org', crypt('PRS-03', gen_salt('bf', 10)), 'Sherif', 'Medhat', '+201200000016', '2004-06-14', 'delegate')
    ON CONFLICT (email) DO NOTHING;
    
    RAISE NOTICE '✅ Delegate accounts created';
END $$;

-- ============================================
-- DELEGATES TABLE
-- ============================================
INSERT INTO delegates (id, user_id, council, claim_token, claim_token_used, qr_code, status,
    opening_ceremony_attended, opening_ceremony_checkin, opening_ceremony_food,
    day1_session_attended, day1_checkin, day1_food) VALUES
-- HRC (UNHRC)
('HRC-01', 'cccccccc-0001-0000-0000-000000000001', 'UNHRC', 'CLM-HRC-001', TRUE, 'QR-HRC-001', 'active', TRUE, '2026-01-15 09:00:00+02', TRUE, TRUE, '2026-01-16 08:30:00+02', TRUE),
('HRC-02', 'cccccccc-0001-0000-0000-000000000002', 'UNHRC', 'CLM-HRC-002', TRUE, 'QR-HRC-002', 'active', TRUE, '2026-01-15 09:15:00+02', TRUE, TRUE, '2026-01-16 08:45:00+02', TRUE),
('HRC-03', 'cccccccc-0001-0000-0000-000000000003', 'UNHRC', 'CLM-HRC-003', TRUE, 'QR-HRC-003', 'active', TRUE, '2026-01-15 09:30:00+02', TRUE, FALSE, NULL, FALSE),
('HRC-04', 'cccccccc-0001-0000-0000-000000000004', 'UNHRC', 'CLM-HRC-004', FALSE, 'QR-HRC-004', 'unclaimed', FALSE, NULL, FALSE, FALSE, NULL, FALSE),
('HRC-05', 'cccccccc-0001-0000-0000-000000000005', 'UNHRC', 'CLM-HRC-005', FALSE, 'QR-HRC-005', 'unclaimed', FALSE, NULL, FALSE, FALSE, NULL, FALSE),
-- ICJ
('ICJ-01', 'cccccccc-0002-0000-0000-000000000001', 'ICJ', 'CLM-ICJ-001', TRUE, 'QR-ICJ-001', 'active', TRUE, '2026-01-15 08:45:00+02', TRUE, TRUE, '2026-01-16 08:15:00+02', TRUE),
('ICJ-02', 'cccccccc-0002-0000-0000-000000000002', 'ICJ', 'CLM-ICJ-002', TRUE, 'QR-ICJ-002', 'active', TRUE, '2026-01-15 09:30:00+02', FALSE, TRUE, '2026-01-16 09:00:00+02', TRUE),
('ICJ-03', 'cccccccc-0002-0000-0000-000000000003', 'ICJ', 'CLM-ICJ-003', TRUE, 'QR-ICJ-003', 'active', TRUE, '2026-01-15 09:45:00+02', TRUE, FALSE, NULL, FALSE),
('ICJ-04', 'cccccccc-0002-0000-0000-000000000004', 'ICJ', 'CLM-ICJ-004', FALSE, 'QR-ICJ-004', 'unclaimed', FALSE, NULL, FALSE, FALSE, NULL, FALSE),
-- DSC (DISEC)
('DSC-01', 'cccccccc-0003-0000-0000-000000000001', 'DISEC', 'CLM-DSC-001', TRUE, 'QR-DSC-001', 'active', TRUE, '2026-01-15 09:00:00+02', TRUE, TRUE, '2026-01-16 09:00:00+02', TRUE),
('DSC-02', 'cccccccc-0003-0000-0000-000000000002', 'DISEC', 'CLM-DSC-002', TRUE, 'QR-DSC-002', 'active', TRUE, '2026-01-15 09:20:00+02', TRUE, TRUE, '2026-01-16 08:50:00+02', TRUE),
('DSC-03', 'cccccccc-0003-0000-0000-000000000003', 'DISEC', 'CLM-DSC-003', FALSE, 'QR-DSC-003', 'unclaimed', FALSE, NULL, FALSE, FALSE, NULL, FALSE),
('DSC-04', 'cccccccc-0003-0000-0000-000000000004', 'DISEC', 'CLM-DSC-004', FALSE, 'QR-DSC-004', 'unclaimed', FALSE, NULL, FALSE, FALSE, NULL, FALSE),
-- PRS (PRESS)
('PRS-01', 'cccccccc-0004-0000-0000-000000000001', 'PRESS', 'CLM-PRS-001', TRUE, 'QR-PRS-001', 'active', TRUE, '2026-01-15 08:30:00+02', TRUE, TRUE, '2026-01-16 08:00:00+02', TRUE),
('PRS-02', 'cccccccc-0004-0000-0000-000000000002', 'PRESS', 'CLM-PRS-002', TRUE, 'QR-PRS-002', 'active', TRUE, '2026-01-15 09:45:00+02', TRUE, FALSE, NULL, FALSE),
('PRS-03', 'cccccccc-0004-0000-0000-000000000003', 'PRESS', 'CLM-PRS-003', FALSE, 'QR-PRS-003', 'unclaimed', FALSE, NULL, FALSE, FALSE, NULL, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VOUCHERS
-- ============================================
INSERT INTO vouchers (id, name, description, icon, vendor_name, vendor_location, usage_limit, valid_from, valid_until, is_active) VALUES
('dddddddd-0000-0000-0000-000000000001', 'Free Coffee', 'Complimentary coffee from our café partner', 'coffee', 'NIMUN Café', 'Main Hall', 1, '2026-01-15 00:00:00+02', '2026-01-20 23:59:59+02', TRUE),
('dddddddd-0000-0000-0000-000000000002', '10% Merch Discount', 'Get 10% off on NIMUN merchandise', 'tag', 'NIMUN Merch Store', 'Booth 5', 3, '2026-01-15 00:00:00+02', '2026-01-20 23:59:59+02', TRUE),
('dddddddd-0000-0000-0000-000000000003', 'Free Snack Pack', 'Claim a free snack pack', 'cookie', 'Snack Corner', 'Near Entrance', 1, '2026-01-16 00:00:00+02', '2026-01-20 23:59:59+02', TRUE),
('dddddddd-0000-0000-0000-000000000004', 'Priority Seating', 'Priority seating for events', 'star', 'NIMUN Events', 'Various', NULL, '2026-01-15 00:00:00+02', '2026-01-20 23:59:59+02', TRUE),
('dddddddd-0000-0000-0000-000000000005', 'Workshop Access', 'Free exclusive workshop access', 'book', 'NIMUN Academy', 'Training Room', 50, '2026-01-17 00:00:00+02', '2026-01-19 23:59:59+02', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VOUCHER CLAIMS
-- ============================================
INSERT INTO voucher_claims (id, delegate_id, voucher_id, claimed_at, qr_token, qr_expires_at, redeemed_at, status) VALUES
('eeeeeeee-0000-0000-0000-000000000001', 'HRC-01', 'dddddddd-0000-0000-0000-000000000001', '2026-01-15 10:30:00+02', 'QRT-001', '2026-01-15 11:30:00+02', '2026-01-15 10:45:00+02', 'redeemed'),
('eeeeeeee-0000-0000-0000-000000000002', 'HRC-02', 'dddddddd-0000-0000-0000-000000000001', '2026-01-15 11:00:00+02', 'QRT-002', '2026-01-15 12:00:00+02', NULL, 'active'),
('eeeeeeee-0000-0000-0000-000000000003', 'ICJ-01', 'dddddddd-0000-0000-0000-000000000001', '2026-01-15 14:00:00+02', 'QRT-003', '2026-01-15 15:00:00+02', '2026-01-15 14:15:00+02', 'redeemed'),
('eeeeeeee-0000-0000-0000-000000000004', 'DSC-01', 'dddddddd-0000-0000-0000-000000000002', '2026-01-16 12:00:00+02', 'QRT-004', '2026-01-16 18:00:00+02', NULL, 'active'),
('eeeeeeee-0000-0000-0000-000000000005', 'PRS-01', 'dddddddd-0000-0000-0000-000000000002', '2026-01-16 14:30:00+02', 'QRT-005', '2026-01-16 20:30:00+02', '2026-01-16 15:00:00+02', 'redeemed')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ATTENDANCE RECORDS
-- ============================================
INSERT INTO attendance_records (id, delegate_id, session_name, session_date, session_type, check_in_time, check_out_time, location, points_awarded, notes) VALUES
('ffffffff-0000-0000-0000-000000000001', 'HRC-01', 'Opening Ceremony', '2026-01-15', 'opening_ceremony', '2026-01-15 09:00:00+02', '2026-01-15 12:00:00+02', 'Grand Ballroom', 10, 'Full attendance'),
('ffffffff-0000-0000-0000-000000000002', 'HRC-02', 'Opening Ceremony', '2026-01-15', 'opening_ceremony', '2026-01-15 09:15:00+02', '2026-01-15 12:00:00+02', 'Grand Ballroom', 10, 'Full attendance'),
('ffffffff-0000-0000-0000-000000000003', 'ICJ-01', 'Opening Ceremony', '2026-01-15', 'opening_ceremony', '2026-01-15 08:45:00+02', '2026-01-15 12:00:00+02', 'Grand Ballroom', 10, 'Early arrival'),
('ffffffff-0000-0000-0000-000000000004', 'DSC-01', 'Opening Ceremony', '2026-01-15', 'opening_ceremony', '2026-01-15 09:00:00+02', '2026-01-15 12:00:00+02', 'Grand Ballroom', 10, 'Full attendance'),
('ffffffff-0000-0000-0000-000000000005', 'PRS-01', 'Opening Ceremony', '2026-01-15', 'opening_ceremony', '2026-01-15 08:30:00+02', '2026-01-15 12:00:00+02', 'Grand Ballroom', 10, 'Early coverage'),
('ffffffff-0000-0000-0000-000000000006', 'HRC-01', 'Day 1 Session', '2026-01-16', 'day1', '2026-01-16 08:30:00+02', '2026-01-16 17:00:00+02', 'HRC Room', 15, 'Excellent'),
('ffffffff-0000-0000-0000-000000000007', 'ICJ-01', 'Day 1 Session', '2026-01-16', 'day1', '2026-01-16 08:15:00+02', '2026-01-16 16:30:00+02', 'ICJ Court', 15, 'Strong arguments')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- FOOD HISTORY
-- ============================================
INSERT INTO food_history (id, delegate_id, meal_type, meal_day, location, claimed_at) VALUES
('11111111-0000-0000-0000-000000000001', 'HRC-01', 'lunch', 'opening_ceremony', 'Dining Hall', '2026-01-15 12:30:00+02'),
('11111111-0000-0000-0000-000000000002', 'HRC-02', 'lunch', 'opening_ceremony', 'Dining Hall', '2026-01-15 12:45:00+02'),
('11111111-0000-0000-0000-000000000003', 'ICJ-01', 'lunch', 'opening_ceremony', 'Dining Hall', '2026-01-15 12:15:00+02'),
('11111111-0000-0000-0000-000000000004', 'DSC-01', 'lunch', 'opening_ceremony', 'Dining Hall', '2026-01-15 13:00:00+02'),
('11111111-0000-0000-0000-000000000005', 'PRS-01', 'lunch', 'opening_ceremony', 'Dining Hall', '2026-01-15 12:20:00+02'),
('11111111-0000-0000-0000-000000000006', 'HRC-01', 'lunch', 'day1', 'Dining Hall', '2026-01-16 13:00:00+02'),
('11111111-0000-0000-0000-000000000007', 'ICJ-01', 'lunch', 'day1', 'Dining Hall', '2026-01-16 12:45:00+02')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ACTIVITY TIMELINE
-- ============================================
INSERT INTO activity_timeline (id, user_id, activity_type, title, description, points, metadata, created_at) VALUES
('22222222-0000-0000-0000-000000000001', 'cccccccc-0001-0000-0000-000000000001', 'attendance', 'Checked in to Opening', 'Opening ceremony', 10, '{"session": "opening"}', '2026-01-15 09:00:00+02'),
('22222222-0000-0000-0000-000000000002', 'cccccccc-0001-0000-0000-000000000001', 'food', 'Claimed Lunch', 'Opening ceremony lunch', 0, '{"meal": "lunch"}', '2026-01-15 12:30:00+02'),
('22222222-0000-0000-0000-000000000003', 'cccccccc-0001-0000-0000-000000000001', 'voucher', 'Redeemed Coffee', 'Free coffee voucher', 5, '{"voucher": "coffee"}', '2026-01-15 10:45:00+02'),
('22222222-0000-0000-0000-000000000004', 'cccccccc-0002-0000-0000-000000000001', 'attendance', 'Checked in to Opening', 'Opening ceremony', 10, '{"session": "opening"}', '2026-01-15 08:45:00+02'),
('22222222-0000-0000-0000-000000000005', 'cccccccc-0003-0000-0000-000000000001', 'attendance', 'Checked in to Day 1', 'DISEC session', 15, '{"session": "day1"}', '2026-01-16 09:00:00+02')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- REWARD ACTIVATIONS
-- ============================================
INSERT INTO reward_activations (id, delegate_id, reward_type, qr_token, qr_data, expires_at, redeemed_at, status, created_at) VALUES
('33333333-0000-0000-0000-000000000001', 'HRC-01', 'lunch', 'RWD-001', '{"delegate_id": "HRC-01", "type": "lunch"}', '2026-01-16 14:00:00+02', '2026-01-16 13:00:00+02', 'redeemed', '2026-01-16 12:00:00+02'),
('33333333-0000-0000-0000-000000000002', 'DSC-01', 'snack', 'RWD-002', '{"delegate_id": "DSC-01", "type": "snack"}', '2026-01-16 18:00:00+02', NULL, 'active', '2026-01-16 15:00:00+02'),
('33333333-0000-0000-0000-000000000003', 'ICJ-01', 'merch', 'RWD-003', '{"delegate_id": "ICJ-01", "type": "merch"}', '2026-01-17 20:00:00+02', NULL, 'active', '2026-01-17 10:00:00+02')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VERIFICATION
-- ============================================
SELECT 'SEEDING COMPLETE!' as status;
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL SELECT 'Members', COUNT(*) FROM members
UNION ALL SELECT 'Delegates', COUNT(*) FROM delegates
UNION ALL SELECT 'Vouchers', COUNT(*) FROM vouchers;

-- ============================================
-- LOGIN CREDENTIALS
-- ============================================
-- Admin: adhamabdelaal@nimuneg.org / adhoma2026
-- Members: {id}@nimuneg.org / {ID} (e.g., ex-01@nimuneg.org / EX-01)
-- Delegates: {id}@delegate.nimuneg.org / {ID} (e.g., hrc01@delegate.nimuneg.org / HRC-01)
