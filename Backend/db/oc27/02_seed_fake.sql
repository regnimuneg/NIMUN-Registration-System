-- ============================================
-- OC Conference '27: FAKE starter data (no real people)
-- Run after 01_schema.sql in the NEW '27 Supabase project only.
--
-- Creates:
--   ADMIN-01   one admin account (role contains "Admin")
--   MEMBER-01  one check-in member account
--   TEST-D-001..003  three fake delegates (unclaimed, with claim codes)
--
-- No passwords are stored in this file. Random passwords are generated
-- inside the database and shown ONCE in the last SELECT. Save them
-- somewhere private, then change the admin email to a real one.
-- All emails use example.com, which can never receive mail.
-- ============================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TEMP TABLE seed_oc27_accounts (
    id VARCHAR PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    plain_password VARCHAR NOT NULL,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    role VARCHAR NOT NULL,
    committee VARCHAR NOT NULL,
    permissions JSONB NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_oc27_accounts VALUES
    ('ADMIN-01',  'admin@example.com',  encode(gen_random_bytes(15), 'base64'), 'Test', 'Admin',  'System Admin',  'Executive',
        '{"admin": true, "super_admin": true, "manage_all": true}'::JSONB),
    ('MEMBER-01', 'member@example.com', encode(gen_random_bytes(15), 'base64'), 'Test', 'Member', 'Portal Member', 'Registration Affairs',
        '{"check_in": true}'::JSONB);

INSERT INTO public.users (id, email, password_hash, first_name, last_name, phone_number, user_type)
SELECT uuid_generate_v5('6ba7b811-9dad-11d1-80b4-00c04fd430c8'::UUID, 'oc27-access:' || id),
       email, crypt(plain_password, gen_salt('bf', 10)), first_name, last_name, NULL, 'member'
FROM seed_oc27_accounts;

INSERT INTO public.members (id, user_id, role, committee, claim_token, permissions, award, past_awards)
SELECT id, uuid_generate_v5('6ba7b811-9dad-11d1-80b4-00c04fd430c8'::UUID, 'oc27-access:' || id),
       role, committee, NULL, permissions, NULL, '{}'::TEXT[]
FROM seed_oc27_accounts;

-- Fake delegates. Unclaimed accounts get a random, unknown password; the
-- claim flow sets a real one.
CREATE TEMP TABLE seed_oc27_delegates (
    id VARCHAR PRIMARY KEY,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    council VARCHAR NOT NULL,
    claim_code VARCHAR NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_oc27_delegates VALUES
    ('TEST-D-001', 'Test', 'Delegate One',   'Test Council A', 'TST001'),
    ('TEST-D-002', 'Test', 'Delegate Two',   'Test Council A', 'TST002'),
    ('TEST-D-003', 'Test', 'Delegate Three', 'Test Council B', 'TST003');

INSERT INTO public.users (id, email, password_hash, first_name, last_name, phone_number, user_type)
SELECT uuid_generate_v5('6ba7b811-9dad-11d1-80b4-00c04fd430c8'::UUID, 'oc27:' || id),
       NULL, crypt(encode(gen_random_bytes(24), 'hex'), gen_salt('bf', 10)), first_name, last_name, NULL, 'delegate'
FROM seed_oc27_delegates;

INSERT INTO public.delegates (id, user_id, council, claim_token, qr_code, status, award, past_awards)
SELECT id, uuid_generate_v5('6ba7b811-9dad-11d1-80b4-00c04fd430c8'::UUID, 'oc27:' || id),
       council, claim_code, id, 'unclaimed', NULL, '{}'::TEXT[]
FROM seed_oc27_delegates;

-- One-time credentials output. Save privately; it is not stored anywhere else.
SELECT id AS member_id, email, plain_password AS password
FROM seed_oc27_accounts
ORDER BY id;

COMMIT;
