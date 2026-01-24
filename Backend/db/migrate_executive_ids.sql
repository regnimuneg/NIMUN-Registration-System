-- Migration script to renumber Executive IDs to EX-01 through EX-22
-- Creates sequential IDs while preserving existing EX-01 through EX-05 and EX-11
-- ADMIN-01 and ADMIN-02 are NOT touched

-- First, let's use temporary IDs to avoid conflicts during the renumbering
-- We'll use TEMP-XX format temporarily

BEGIN;

-- Step 1: Map current scattered IDs to temporary IDs
-- These are the executives that need new sequential IDs

-- Current: EX-34 (Head Of Press) -> Will become EX-06
UPDATE members SET id = 'TEMP-06' WHERE id = 'EX-34';

-- Current: EX-35 (Head of Public Relations) -> Will become EX-07
UPDATE members SET id = 'TEMP-07' WHERE id = 'EX-35';

-- Current: EX-36 (President Of ICJ) -> Will become EX-08
UPDATE members SET id = 'TEMP-08' WHERE id = 'EX-36';

-- Current: EX-37 (Vice Head of Public Relations) -> Will become EX-09
UPDATE members SET id = 'TEMP-09' WHERE id = 'EX-37';

-- Current: EX-38 (Financial Coordinator) -> Will become EX-10
UPDATE members SET id = 'TEMP-10' WHERE id = 'EX-38';

-- Current: EX-39 (Vice Head of Media & Design) -> Will become EX-12
UPDATE members SET id = 'TEMP-12' WHERE id = 'EX-39';

-- Current: EX-40 (Vice Head of Operations & Logistics) -> Will become EX-13
UPDATE members SET id = 'TEMP-13' WHERE id = 'EX-40';

-- Current: EX-41 (Head of Media & Design) -> Will become EX-14
UPDATE members SET id = 'TEMP-14' WHERE id = 'EX-41';

-- Current: EX-42 (Co-Chair Of UNHRC) -> Will become EX-15
UPDATE members SET id = 'TEMP-15' WHERE id = 'EX-42';

-- Current: EX-43 (Vice Head of Socials & Events) -> Will become EX-16
UPDATE members SET id = 'TEMP-16' WHERE id = 'EX-43';

-- Current: EX-44 (Vice Head of Public Relations) -> Will become EX-17
UPDATE members SET id = 'TEMP-17' WHERE id = 'EX-44';

-- Current: EX-45 (Head of Operations & Logistics) -> Will become EX-18
UPDATE members SET id = 'TEMP-18' WHERE id = 'EX-45';

-- Current: EX-46 (Chair Of DISEC) -> Will become EX-19
UPDATE members SET id = 'TEMP-19' WHERE id = 'EX-46';

-- Current: EX-47 (Vice President Of ICJ) -> Will become EX-20
UPDATE members SET id = 'TEMP-20' WHERE id = 'EX-47';

-- Current: EX-48 (Vice Head of Media & Design) -> Will become EX-21
UPDATE members SET id = 'TEMP-21' WHERE id = 'EX-48';

-- Current: EX-49 (Vice Head of Operations & Logistics) -> Will become EX-22
UPDATE members SET id = 'TEMP-22' WHERE id = 'EX-49';

-- Step 2: Convert temporary IDs to final EX-XX format
UPDATE members SET id = 'EX-06' WHERE id = 'TEMP-06';
UPDATE members SET id = 'EX-07' WHERE id = 'TEMP-07';
UPDATE members SET id = 'EX-08' WHERE id = 'TEMP-08';
UPDATE members SET id = 'EX-09' WHERE id = 'TEMP-09';
UPDATE members SET id = 'EX-10' WHERE id = 'TEMP-10';
UPDATE members SET id = 'EX-12' WHERE id = 'TEMP-12';
UPDATE members SET id = 'EX-13' WHERE id = 'TEMP-13';
UPDATE members SET id = 'EX-14' WHERE id = 'TEMP-14';
UPDATE members SET id = 'EX-15' WHERE id = 'TEMP-15';
UPDATE members SET id = 'EX-16' WHERE id = 'TEMP-16';
UPDATE members SET id = 'EX-17' WHERE id = 'TEMP-17';
UPDATE members SET id = 'EX-18' WHERE id = 'TEMP-18';
UPDATE members SET id = 'EX-19' WHERE id = 'TEMP-19';
UPDATE members SET id = 'EX-20' WHERE id = 'TEMP-20';
UPDATE members SET id = 'EX-21' WHERE id = 'TEMP-21';
UPDATE members SET id = 'EX-22' WHERE id = 'TEMP-22';

-- Verify the migration
-- SELECT id, role FROM members WHERE committee = 'Executive' ORDER BY id;

COMMIT;

-- Final ID mapping after migration:
-- EX-01 = Head of Registration Affairs (unchanged)
-- EX-02 = Chair Of UNHRC (unchanged)
-- EX-03 = Head of Socials & Events (unchanged)
-- EX-04 = Vice Head of Registration Affairs (unchanged)
-- EX-05 = Vice Head of Registration Affairs (unchanged)
-- EX-06 = Head Of Press (was EX-34)
-- EX-07 = Head of Public Relations (was EX-35)
-- EX-08 = President Of ICJ (was EX-36)
-- EX-09 = Vice Head of Public Relations (was EX-37)
-- EX-10 = Financial Coordinator (was EX-38)
-- EX-11 = Co-Chair Of DISEC (unchanged)
-- EX-12 = Vice Head of Media & Design (was EX-39)
-- EX-13 = Vice Head of Operations & Logistics (was EX-40)
-- EX-14 = Head of Media & Design (was EX-41)
-- EX-15 = Co-Chair Of UNHRC (was EX-42)
-- EX-16 = Vice Head of Socials & Events (was EX-43)
-- EX-17 = Vice Head of Public Relations (was EX-44)
-- EX-18 = Head of Operations & Logistics (was EX-45)
-- EX-19 = Chair Of DISEC (was EX-46)
-- EX-20 = Vice President Of ICJ (was EX-47)
-- EX-21 = Vice Head of Media & Design (was EX-48)
-- EX-22 = Vice Head of Operations & Logistics (was EX-49)
-- ADMIN-01 = System Administrator (NOT TOUCHED)
-- ADMIN-02 = Super Administrator (NOT TOUCHED)
