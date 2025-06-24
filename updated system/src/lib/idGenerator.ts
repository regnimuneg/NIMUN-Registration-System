import { IdPrefixConfig, CommitteeType } from '@/types/participant';

const ID_PREFIX_MAP: IdPrefixConfig = {
  'ICJ Delegates': 'IC',
  'UNOOSA Delegates': 'OS',
  'DISEC Delegates': 'DC',
  'Press Delegates': 'PS',
  'UN Women Delegates': 'UW',
  'UNODC Delegates': 'OD',
  'Media & Design': 'MD',
  'Operations': 'OP',
  'Registration Affairs': 'RG',
  'Socials': 'SO',
  'Public Relations': 'PR',
  'Executive': 'EX',
};

// Reserved IDs for specific people
const RESERVED_IDS: Record<string, string> = {
  'zein raafat': 'EX-01',
  'abdallah emam': 'EX-02', 
  'adham abdelaal': 'EX-03',
};

// Normalize name for comparison (lowercase, no extra spaces)
function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// In-memory counter storage (in production, this should be stored in database)
const counters: Record<string, number> = {};

// Track used IDs to prevent reuse after deletion
const usedIds: Set<string> = new Set();

export function generateParticipantId(committee: CommitteeType, participantName?: string): string {
  const prefix = ID_PREFIX_MAP[committee];
  
  if (!prefix) {
    throw new Error(`Unknown committee: ${committee}`);
  }
  
  // Check if this person has a reserved ID
  if (participantName) {
    const normalizedName = normalizeName(participantName);
    const reservedId = RESERVED_IDS[normalizedName];
    
    if (reservedId) {
      // Mark this reserved ID as used
      usedIds.add(reservedId);
      console.log(`🔒 Assigned reserved ID ${reservedId} to ${participantName}`);
      return reservedId;
    }
  }
  
  // Initialize counter if it doesn't exist
  if (!counters[prefix]) {
    counters[prefix] = 0;
  }
  
  // Find next available ID that hasn't been used
  let candidateId: string;
  do {
    counters[prefix]++;
    const paddedNumber = counters[prefix].toString().padStart(2, '0');
    candidateId = `${prefix}-${paddedNumber}`;
  } while (usedIds.has(candidateId));
  
  // Mark this ID as used
  usedIds.add(candidateId);
  
  return candidateId;
}

export function setCounterForPrefix(prefix: string, count: number): void {
  counters[prefix] = count;
}

export function getCounterForPrefix(prefix: string): number {
  return counters[prefix] || 0;
}

export function resetCounters(): void {
  Object.keys(counters).forEach(key => {
    counters[key] = 0;
  });
}

export function initializeCountersFromExisting(existingIds: string[]): void {
  // Reset counters and used IDs
  resetCounters();
  usedIds.clear();
  
  // Mark all existing IDs as used and find the highest number for each prefix
  existingIds.forEach(id => {
    // Mark as used to prevent reuse
    usedIds.add(id);
    
    const match = id.match(/^([A-Z]{2})-(\d+)$/);
    if (match) {
      const [, prefix, numberStr] = match;
      const number = parseInt(numberStr, 10);
      
      if (!counters[prefix] || counters[prefix] < number) {
        counters[prefix] = number;
      }
    }
  });
  
  // Ensure reserved IDs are marked as used
  Object.values(RESERVED_IDS).forEach(reservedId => {
    usedIds.add(reservedId);
  });
  
  console.log(`🔄 Initialized with ${existingIds.length} existing IDs`);
  console.log(`🔒 Reserved IDs: ${Object.values(RESERVED_IDS).join(', ')}`);
}

export function markIdAsDeleted(id: string): void {
  // Keep the ID in usedIds to prevent reuse, but don't remove from counters
  // This ensures deleted IDs are never reassigned
  console.log(`🗑️ ID ${id} marked as deleted (will not be reused)`);
}

export function getReservedIdForName(name: string): string | null {
  const normalizedName = normalizeName(name);
  return RESERVED_IDS[normalizedName] || null;
}

export function isIdReserved(id: string): boolean {
  return Object.values(RESERVED_IDS).includes(id);
}

export function getAllUsedIds(): string[] {
  return Array.from(usedIds);
} 