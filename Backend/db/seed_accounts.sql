-- ============================================
-- SEED DATA: Admin and Member Accounts
-- Run this after schema.sql to create test accounts
-- ONLY these 7 accounts can access the registration system
-- ============================================

-- Insert Admin Users into users table (NO phone numbers)
INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, user_type) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'admin1@nimuneg.org', '$2b$10$6m1MRiOpOhs7TE9LheUEweLqVngaogKb4qO.BQJZq2Z/TuqSAqc3i', 'System', 'Admin (Adham)', NULL, 'member'),
  ('a1000000-0000-0000-0000-000000000002', 'admin2@nimuneg.org', '$2b$10$NUUOHI6TAv1DAO63EfdXKeI2aqxEdC56OGnKeaOzJAlqScXzZTbdS', 'Super', 'Admin (Adham)', NULL, 'member')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone_number = EXCLUDED.phone_number,
  user_type = EXCLUDED.user_type;

-- Insert Member Users into users table (NO phone numbers)
INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, user_type) VALUES
  ('a1000000-0000-0000-0000-000000000003', 'reg@nimuneg.org', '$2b$10$Pt8tmF81MGuQGkUXRM/y2uM.7qCTTzKehMZbvXeP58QZKrFhRsMhO', 'Registration', 'Affairs', NULL, 'member'),
  ('a1000000-0000-0000-0000-000000000004', 'socials@nimuneg.org', '$2b$10$oeNidDEeNiMihU1WT5jWOuJyOGVVeVEzearuo.pSgEoDMARS5tdpC', 'Socials', 'Events', NULL, 'member'),
  ('a1000000-0000-0000-0000-000000000005', 'pr@nimuneg.org', '$2b$10$u3Oh.xK03OH8orWcqFeGiOf6cmvtbt6KnMVB47SFa1iHYOAbOtIxK', 'Public', 'Relations', NULL, 'member'),
  ('a1000000-0000-0000-0000-000000000006', 'media@nimuneg.org', '$2b$10$2V3KFBPzSPX9Lq4XLB7Kfu/UYKf3ulUgZRG1.FPGEoCVxbRrUuV.O', 'Media', 'Design', NULL, 'member'),
  ('a1000000-0000-0000-0000-000000000007', 'ops@nimuneg.org', '$2b$10$SqK8TTPbH0mWqyTOuYrCyOJOn7zNegsoLkL2frv2VG8/uF82ZdCzi', 'Operations', 'Logistics', NULL, 'member')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  password_hash = EXCLUDED.password_hash,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone_number = EXCLUDED.phone_number,
  user_type = EXCLUDED.user_type;

-- Insert Admins into members table (role contains 'Admin' for admin privileges)
INSERT INTO members (id, user_id, role, committee, claim_token) VALUES
  ('ADMIN-01', 'a1000000-0000-0000-0000-000000000001', 'System Administrator', 'Executive', 'ADM001'),
  ('ADMIN-02', 'a1000000-0000-0000-0000-000000000002', 'Super Administrator', 'Executive', 'ADM002')
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  role = EXCLUDED.role,
  committee = EXCLUDED.committee,
  claim_token = EXCLUDED.claim_token;

-- Insert Regular Members into members table
INSERT INTO members (id, user_id, role, committee, claim_token) VALUES
  ('REG-SC', 'a1000000-0000-0000-0000-000000000003', 'Staff Member', 'Registration Affairs', 'REG001'),
  ('SOC-SC', 'a1000000-0000-0000-0000-000000000004', 'Staff Member', 'Socials & Events', 'SOC001'),
  ('PR-SC', 'a1000000-0000-0000-0000-000000000005', 'Staff Member', 'Public Relations', 'PR0001'),
  ('MED-SC', 'a1000000-0000-0000-0000-000000000006', 'Staff Member', 'Media & Design', 'MED001'),
  ('OPS-SC', 'a1000000-0000-0000-0000-000000000007', 'Staff Member', 'Operations & Logistics', 'OPS001')
ON CONFLICT (id) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  role = EXCLUDED.role,
  committee = EXCLUDED.committee,
  claim_token = EXCLUDED.claim_token;

-- ============================================
-- LOGIN CREDENTIALS
-- ============================================
-- ADMIN ACCOUNTS:
--   Email: admin1@nimuneg.org | Password: 3}PG8U+9FcSp
--   Email: admin2@nimuneg.org | Password: '£I}707Gva;4
--
-- MEMBER ACCOUNTS (Committee-based passwords):
--   Email: reg@nimuneg.org     | Password: reg-nimun26
--   Email: socials@nimuneg.org | Password: socials-nimun26
--   Email: pr@nimuneg.org      | Password: pr-nimun26
--   Email: media@nimuneg.org   | Password: media-nimun26
--   Email: ops@nimuneg.org     | Password: ops-nimun26
-- ============================================
