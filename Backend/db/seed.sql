-- ============================================
-- NIMUN'26 Database Seed Script
-- Run this in Supabase SQL Editor to seed initial accounts
-- ============================================

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- Seed Admin Account
-- ============================================
-- Admin account credentials:
-- Email: admin@nimuneg.org
-- Password: admin123
-- Member ID: ADMIN-01
-- Role: Head of Administration (contains "Admin" → grants admin access)

DO $$
DECLARE
    admin_user_id UUID;
    admin_email VARCHAR := 'adhamabdelaal@nimuneg.org';
    admin_password VARCHAR := 'adhoma2026';
    admin_password_hash VARCHAR;
    admin_name VARCHAR := 'System Administrator';
    admin_member_id VARCHAR := 'ADMIN-01';
    admin_role VARCHAR := 'Head of Administration';
BEGIN
    -- Generate bcrypt hash for admin password
    admin_password_hash := crypt(admin_password, gen_salt('bf', 10));
    
    -- Check if admin user already exists
    SELECT id INTO admin_user_id FROM users WHERE email = admin_email;
    
    IF admin_user_id IS NULL THEN
        -- Create admin user account
        INSERT INTO users (email, password_hash, first_name, last_name, user_type)
        VALUES (admin_email, admin_password_hash, 'System', 'Administrator', 'member')
        RETURNING id INTO admin_user_id;
        
        RAISE NOTICE '✅ Created admin user account: %', admin_email;
    ELSE
        -- Update password hash if user exists
        UPDATE users
        SET password_hash = admin_password_hash
        WHERE id = admin_user_id;
        RAISE NOTICE '⚠️  Admin user already exists, updated password: %', admin_email;
    END IF;
    
    -- Check if admin member record exists
    IF NOT EXISTS (SELECT 1 FROM members WHERE user_id = admin_user_id) THEN
        -- Create admin member record
        INSERT INTO members (id, user_id, name, phone_number, role, committee)
        VALUES (admin_member_id, admin_user_id, admin_name, '0000000000', admin_role, 'Executive');
        
        RAISE NOTICE '✅ Created admin member record: %', admin_member_id;
    ELSE
        -- Update existing member to ensure admin role
        UPDATE members
        SET role = admin_role, committee = 'Executive'
        WHERE user_id = admin_user_id;
        
        RAISE NOTICE '✅ Updated admin member record';
    END IF;
END $$;

-- ============================================
-- Seed Member Accounts
-- ============================================
-- This creates user accounts for all members in the members table
-- Each member can log in with:
-- - Email: {member_id}@nimuneg.org (e.g., ex-01@nimuneg.org)
-- - OR Member ID: EX-01
-- - Password: Their member ID (e.g., EX-01) - bcrypt hashed

DO $$
DECLARE
    member_record RECORD;
    member_user_id UUID;
    member_email VARCHAR;
    member_password_hash VARCHAR;
    name_parts TEXT[];
    first_name VARCHAR;
    last_name VARCHAR;
    created_count INT := 0;
    updated_count INT := 0;
BEGIN
    -- Loop through all members without user accounts
    FOR member_record IN 
        SELECT m.id, m.name, m.committee, m.role
        FROM members m
        WHERE m.user_id IS NULL
    LOOP
        -- Generate email from member ID
        member_email := LOWER(member_record.id) || '@nimuneg.org';
        
        -- Split name into first and last
        name_parts := string_to_array(member_record.name, ' ');
        first_name := name_parts[1];
        last_name := array_to_string(name_parts[2:], ' ');
        
        IF last_name IS NULL OR last_name = '' THEN
            last_name := '';
        END IF;
        
        -- Generate bcrypt hash of member ID as password
        member_password_hash := crypt(member_record.id, gen_salt('bf', 10));
        
        -- Create user account
        INSERT INTO users (email, password_hash, first_name, last_name, user_type)
        VALUES (member_email, member_password_hash, first_name, COALESCE(last_name, ''), 'member')
        RETURNING id INTO member_user_id;
        
        -- Link member to user account
        UPDATE members
        SET user_id = member_user_id
        WHERE id = member_record.id;
        
        created_count := created_count + 1;
        RAISE NOTICE '✅ Created account for % (%)', member_record.id, member_record.name;
    END LOOP;
    
    RAISE NOTICE '✨ Member seeding complete! Created % accounts', created_count;
    
    -- Also update any existing members that have user accounts but wrong password format
    FOR member_record IN 
        SELECT m.id, m.user_id, u.password_hash
        FROM members m
        JOIN users u ON m.user_id = u.id
        WHERE u.user_type = 'member'
        AND (u.password_hash NOT LIKE '$2%' OR u.password_hash = 'temp_password_hash')
    LOOP
        -- Update password hash to bcrypt hash of member ID
        UPDATE users
        SET password_hash = crypt(member_record.id, gen_salt('bf', 10))
        WHERE id = member_record.user_id;
        
        updated_count := updated_count + 1;
        RAISE NOTICE '✅ Updated password hash for %', member_record.id;
    END LOOP;
    
    IF updated_count > 0 THEN
        RAISE NOTICE '✨ Updated % existing member passwords', updated_count;
    END IF;
END $$;

-- ============================================
-- Verify Seeded Accounts
-- ============================================

-- Check admin account
SELECT 
    'Admin Account' as account_type,
    u.email,
    u.first_name || ' ' || u.last_name as name,
    m.id as member_id,
    m.role,
    u.created_at
FROM users u
JOIN members m ON m.user_id = u.id
WHERE m.role ILIKE '%admin%'
ORDER BY u.created_at DESC;

-- Check member accounts (first 10)
SELECT 
    'Member Account' as account_type,
    u.email,
    u.first_name || ' ' || u.last_name as name,
    m.id as member_id,
    m.committee,
    m.role,
    u.created_at
FROM users u
JOIN members m ON m.user_id = u.id
WHERE u.user_type = 'member'
AND m.role NOT ILIKE '%admin%'
ORDER BY u.created_at DESC
LIMIT 10;

-- Summary
SELECT 
    COUNT(*) FILTER (WHERE m.role ILIKE '%admin%') as admin_count,
    COUNT(*) FILTER (WHERE m.role NOT ILIKE '%admin%') as member_count,
    COUNT(*) as total_accounts
FROM users u
JOIN members m ON m.user_id = u.id
WHERE u.user_type = 'member';
