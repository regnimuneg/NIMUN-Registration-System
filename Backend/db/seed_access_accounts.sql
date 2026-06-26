-- ============================================
-- NIMUN'26 seed: access accounts
-- Creates 2 admin accounts and 10 member accounts
-- Run after Backend/db/reset_schema_for_reseed.sql
-- Can also be run after Backend/db/seed_full_participants.sql
-- ============================================

-- Login format: email or member ID
-- Strong generated passwords are stored only in this seed file and in the final credentials SELECT.
-- Store the credentials somewhere private after running the seed.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TEMP TABLE seed_access_accounts (
    id VARCHAR PRIMARY KEY,
    email VARCHAR NOT NULL UNIQUE,
    plain_password VARCHAR NOT NULL,
    first_name VARCHAR NOT NULL,
    last_name VARCHAR NOT NULL,
    phone_number VARCHAR,
    role VARCHAR NOT NULL,
    committee VARCHAR NOT NULL,
    permissions JSONB NOT NULL
) ON COMMIT DROP;

INSERT INTO seed_access_accounts (
    id, email, plain_password, first_name, last_name, phone_number, role, committee, permissions
) VALUES
    ('ADMIN-01', 'admin1@nimuneg.org', 'h8$Yi$@UnBbhC&S3WTt4', 'NIMUN', 'Admin One', '+200000000001', 'System Admin', 'Executive', '{"admin": true, "super_admin": true, "manage_all": true}'::JSONB),
    ('ADMIN-02', 'admin2@nimuneg.org', '3rpKL9C@wHW3#qSgj44i', 'NIMUN', 'Admin Two', '+200000000002', 'System Admin', 'Executive', '{"admin": true, "super_admin": true, "manage_all": true}'::JSONB),
    ('MEMBER-01', 'member1@nimuneg.org', '%xm4iLSqeUmN4HK5W4th', 'NIMUN', 'Member 01', '+200000000003', 'Portal Member', 'Registration Affairs', '{"check_in": true}'::JSONB),
    ('MEMBER-02', 'member2@nimuneg.org', 'NC3kaXzyvVMfJeuQLW3$', 'NIMUN', 'Member 02', '+200000000004', 'Portal Member', 'Registration Affairs', '{"check_in": true}'::JSONB),
    ('MEMBER-03', 'member3@nimuneg.org', 'Zdx9ed5qsNr$RPei!GUs', 'NIMUN', 'Member 03', '+200000000005', 'Portal Member', 'Registration Affairs', '{"check_in": true}'::JSONB),
    ('MEMBER-04', 'member4@nimuneg.org', 'FJ9Fbv9r@AUVuN&x5MmB', 'NIMUN', 'Member 04', '+200000000006', 'Portal Member', 'Registration Affairs', '{"check_in": true}'::JSONB),
    ('MEMBER-05', 'member5@nimuneg.org', 'pb#%J6sF5XxGdh!zJ7Mt', 'NIMUN', 'Member 05', '+200000000007', 'Portal Member', 'Registration Affairs', '{"check_in": true}'::JSONB),
    ('MEMBER-06', 'member6@nimuneg.org', '@3pKakwRXz4ZSdVziTmB', 'NIMUN', 'Member 06', '+200000000008', 'Portal Member', 'Registration Affairs', '{"check_in": true}'::JSONB),
    ('MEMBER-07', 'member7@nimuneg.org', 'kCMBeK&YEhe3m6GdtVWo', 'NIMUN', 'Member 07', '+200000000009', 'Portal Member', 'Registration Affairs', '{"check_in": true}'::JSONB),
    ('MEMBER-08', 'member8@nimuneg.org', '2wkCQiuQuJFsEvJ#Lmfj', 'NIMUN', 'Member 08', '+200000000010', 'Portal Member', 'Registration Affairs', '{"check_in": true}'::JSONB),
    ('MEMBER-09', 'member9@nimuneg.org', 'rV@8oKjpgz#!Z?aM8Um7', 'NIMUN', 'Member 09', '+200000000011', 'Portal Member', 'Registration Affairs', '{"check_in": true}'::JSONB),
    ('MEMBER-10', 'member10@nimuneg.org', 'aC8wTzAx62oqhhE4Ucc?', 'NIMUN', 'Member 10', '+200000000012', 'Portal Member', 'Registration Affairs', '{"check_in": true}'::JSONB);

INSERT INTO public.users (
    id, email, password_hash, first_name, last_name, phone_number, user_type
)
SELECT
    uuid_generate_v5('6ba7b811-9dad-11d1-80b4-00c04fd430c8'::UUID, 'nimun-2026-access:' || id),
    email,
    crypt(plain_password, gen_salt('bf', 10)),
    first_name,
    last_name,
    phone_number,
    'member'
FROM seed_access_accounts
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone_number = EXCLUDED.phone_number,
    user_type = EXCLUDED.user_type,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO public.members (
    id, user_id, role, committee, claim_token, permissions, award, past_awards
)
SELECT
    id,
    uuid_generate_v5('6ba7b811-9dad-11d1-80b4-00c04fd430c8'::UUID, 'nimun-2026-access:' || id),
    role,
    committee,
    NULL,
    permissions,
    NULL,
    '{}'::TEXT[]
FROM seed_access_accounts
ON CONFLICT (id) DO UPDATE
SET user_id = EXCLUDED.user_id,
    role = EXCLUDED.role,
    committee = EXCLUDED.committee,
    permissions = EXCLUDED.permissions,
    updated_at = CURRENT_TIMESTAMP;

-- Verification summary
SELECT 'admin_accounts' AS account_type, COUNT(*) AS count
FROM public.members
WHERE id LIKE 'ADMIN-%'
UNION ALL
SELECT 'member_accounts', COUNT(*)
FROM public.members
WHERE id LIKE 'MEMBER-%';

-- One-time credentials output. Save this result privately after running the seed.
SELECT
    id AS member_id,
    email,
    plain_password AS password
FROM seed_access_accounts
ORDER BY id;

COMMIT;
