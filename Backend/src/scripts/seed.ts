import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// ESM dirname fix
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load env vars before importing config
// Load env vars before importing config
dotenv.config({ path: path.join(__dirname, '../../.env') })

async function seed() {
    // Dynamic import to ensure env vars are loaded first
    const { query } = await import('../config')
    const seedFile = path.join(__dirname, '../../seeds/participants.csv')
    console.log(`Starting seed from: ${seedFile}`)

    if (!fs.existsSync(seedFile)) {
        console.error('Error: Seed file not found. Please save your Excel file as CSV at: backend/seeds/participants.csv')
        process.exit(1)
    }

    const csvData = fs.readFileSync(seedFile, 'utf-8')

    try {
        // Determine if we should clear existing data (default: true for a seed script)
        const clear = true

        if (clear) {
            console.log('Clearing existing data...')
            await query('TRUNCATE TABLE delegates, members, invitations, users, voucher_claims, attendance_records, food_history, activity_timeline, reward_activations, password_reset_tokens CASCADE')
        }

        // Parse CSV
        const records = parse(csvData, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
            bom: true
        })

        if (records.length === 0) {
            console.error('Error: No valid data found in CSV file')
            process.exit(1)
        }

        console.log(`Found ${records.length} records. Processing...`)

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        }

        // 1. Analyze IDs and Prefixes
        const prefixMap: Record<string, string> = {
            // Member committees
            'Executive': 'EX',
            'Registration Affairs': 'RG',
            'Socials & Events': 'SO',
            'Public Relations': 'PR',
            'Media & Design': 'MD',
            'Operations & Logistics': 'OP',
            'Executives\' Invitation': 'INV', // Added for the observed data
            'Alumni': 'AL',
            // Delegate councils
            'HRC': 'HRC',
            'ICJ': 'ICJ',
            'DISEC': 'DSC',
            'PRESS': 'PRS'
        }

        // Helper to get prefix from committee/council
        const getPrefix = (committee: string) => {
            const c = committee.trim()
            // Direct match
            if (prefixMap[c]) return prefixMap[c]
            // Partial match for members
            const found = Object.keys(prefixMap).find(k => c.toLowerCase().includes(k.toLowerCase().split(' ')[0]))
            return found ? prefixMap[found] : 'XX'
        }

        // Track used numbers per prefix
        const usedNumbers: Record<string, Set<number>> = {}

        // Initialize used sets
        records.forEach((record: any) => {
            const committee = record['Committee'] || ''
            const prefix = getPrefix(committee)
            if (!usedNumbers[prefix]) usedNumbers[prefix] = new Set()

            const id = record['ID']
            if (id && id.trim()) {
                const parts = id.trim().split('-')
                if (parts.length === 2) {
                    const num = parseInt(parts[1], 10)
                    if (!isNaN(num)) {
                        usedNumbers[prefix].add(num)
                    }
                }
            }
        })

        // Generator function state
        const nextNumberState: Record<string, number> = {}

        const getNextId = (prefix: string) => {
            if (!nextNumberState[prefix]) nextNumberState[prefix] = 1
            while (usedNumbers[prefix]?.has(nextNumberState[prefix])) {
                nextNumberState[prefix]++
            }
            const num = nextNumberState[prefix]
            usedNumbers[prefix]?.add(num) // Mark as used
            return `${prefix}-${String(num).padStart(2, '0')}`
        }

        // Process Records
        for (const record of records) {
            try {
                // Read and sanitize fields
                const name = record['Full Name']
                const committee = record['Committee']
                const recordUserType = record['User Type']?.toLowerCase() || ''

                // Helper for handling empty strings => null
                const getVal = (key: string) => {
                    let val = record[key]
                    if (!val) return null
                    val = val.trim()
                    if (val === '' || val.toUpperCase() === 'NULL') return null
                    return val
                }

                let nuEmail = getVal('NU Email')
                let phoneNumber = getVal('Phone Number')
                const role = getVal('Role')
                const providedId = getVal('ID')
                const claimCode = getVal('Claim Code')

                if (!name || !committee) {
                    results.failed++
                    // Try to inspect record fields if Name is missing (might be key mismatch)
                    results.errors.push(`Missing required fields (Name or Committee) for row. Name: ${name}, Comm: ${committee}`)
                    continue
                }

                // Determine ID (Prioritize provided ID)
                let participantId = providedId
                if (!participantId) {
                    const prefix = getPrefix(committee)
                    participantId = getNextId(prefix)
                }

                // Determine effective user type priority: Delegate > Invitation > Member
                let typeOfUser = 'member'
                const delegateCouncils = ['HRC', 'ICJ', 'DISEC', 'PRESS']

                // 1. ID Prefix Check (Absolute Authority)
                if (participantId && participantId.startsWith('HB-')) {
                    typeOfUser = 'high board'
                } else if (participantId && participantId.startsWith('EX-')) {
                    typeOfUser = 'executive'
                }
                // 2. Strict Delegate Check (based on Committee and NOT overridden by ID)
                else if (delegateCouncils.includes(committee) || recordUserType.toLowerCase().includes('delegate')) {
                    typeOfUser = 'delegate'
                }
                // 3. Invitation Check
                else if (['Executives\' Invitation', 'Alumni'].includes(committee) || recordUserType.toLowerCase().includes('invitation') || recordUserType.toLowerCase().includes('alumni')) {
                    typeOfUser = 'invitation'
                }
                // 4. Fallback checks for explicit type strings (if ID didn't catch them)
                else if (recordUserType.toLowerCase().includes('executive')) {
                    typeOfUser = 'executive'
                }
                else if (recordUserType.toLowerCase().includes('high board') || recordUserType.toLowerCase().includes('highboard')) {
                    typeOfUser = 'high board'
                }
                // 5. Fallback to Member
                else {
                    typeOfUser = 'member'
                }

                // Email Logic: Strict CSV value (allows NULL now)
                const userEmail = nuEmail

                // Check for duplicates (Removed as email is not unique identifier)

                // Create User
                const firstName = name.split(' ')[0] || name
                const lastName = name.split(' ').slice(1).join(' ') || ''

                const userResult = await query(`
                    INSERT INTO users (email, password_hash, first_name, last_name, phone_number, user_type)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id
                `, [
                    userEmail, // Can be NULL
                    'temp_password_hash', // Default password
                    firstName,
                    lastName,
                    phoneNumber, // Strictly use CSV value (likely NULL if empty)
                    typeOfUser
                ])

                const userId = userResult.rows[0].id

                // Insert into specific table
                if (typeOfUser === 'delegate') {
                    await query(`
                        INSERT INTO delegates (id, user_id, council, claim_token, qr_code, status)
                        VALUES ($1, $2, $3, $4, $5, 'active')
                    `, [
                        participantId,
                        userId,
                        committee,
                        claimCode,
                        participantId // QR code defaults to ID
                    ])
                } else if (typeOfUser === 'invitation') {
                    await query(`
                        INSERT INTO invitations (id, user_id, role, committee, claim_token)
                        VALUES ($1, $2, $3, $4, $5)
                    `, [
                        participantId,
                        userId,
                        role || 'Guest',
                        committee,
                        claimCode
                    ])
                } else {
                    // Member
                    const validCommittees = [
                        'Executive',
                        'Registration Affairs',
                        'Socials & Events',
                        'Public Relations',
                        'Media & Design',
                        'Operations & Logistics'
                    ]
                    let validCommittee = validCommittees.find(c =>
                        committee.toLowerCase().includes(c.toLowerCase().split(' ')[0])
                    ) || 'Executive' // Fallback

                    if (typeOfUser === 'high board') {
                        validCommittee = 'High Board'
                    }

                    await query(`
                        INSERT INTO members (id, user_id, role, committee, claim_token)
                        VALUES ($1, $2, $3, $4, $5)
                    `, [
                        participantId,
                        userId,
                        role || (typeOfUser === 'executive' ? 'Executive' : (typeOfUser === 'high board' ? 'High Board' : 'Member')),
                        validCommittee,
                        claimCode
                    ])
                }

                results.success++
            } catch (error) {
                results.failed++
                results.errors.push(`Error processing row ${record['Full Name']}: ${error instanceof Error ? error.message : String(error)}`)
            }
        }

        console.log('\nSeed Complete!')
        console.log(`Total: ${records.length}`)
        console.log(`Success: ${results.success}`)
        console.log(`Failed: ${results.failed}`)

        if (results.errors.length > 0) {
            console.log('\nErrors:')
            results.errors.forEach(e => console.error(`- ${e}`))
        }

        process.exit(0)

    } catch (error) {
        console.error('Seed script error:', error)
        process.exit(1)
    }
}

seed()
