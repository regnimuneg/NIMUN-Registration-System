import { IdPrefixConfig, CommitteeType } from '@/types/participant';
import { getLockedId, getAllLockedIds, isIdLocked } from './lockedParticipants';

const ID_PREFIX_MAP: IdPrefixConfig = {
  'UNHRC Delegates': 'HRC',
  'ICJ Delegates': 'ICJ',
  'DISEC Delegates': 'DSC',
  'Press Delegates': 'PRS',
  'Media & Design': 'MD',
  'Operations': 'OP',
  'Registration Affairs': 'RG',
  'Socials': 'SO',
  'Public Relations': 'PR',
  'Executive': 'EX',
};

// In-memory counter storage (in production, this should be stored in database)
const counters: Record<string, number> = {};

// Track used IDs to prevent reuse after deletion
const usedIds: Set<string> = new Set();

export function generateParticipantId(committee: CommitteeType, participantName?: string, existingIds: string[] = []): string {
  const prefix = ID_PREFIX_MAP[committee];
  
  if (!prefix) {
    throw new Error(`Unknown committee: ${committee}`);
  }
  
  // Check if this person has a locked ID
  if (participantName) {
    const lockedId = getLockedId(participantName);
    
    if (lockedId) {
      // Mark this locked ID as used
      usedIds.add(lockedId);
      console.log(`🔒 Assigned locked ID ${lockedId} to ${participantName}`);
      return lockedId;
    }
  }
  
  // Initialize counter if it doesn't exist
  if (!counters[prefix]) {
    counters[prefix] = 0;
  }
  
  // Get all locked IDs and existing IDs to avoid conflicts
  const allLockedIds = getAllLockedIds();
  const allReservedIds = new Set([...existingIds, ...allLockedIds]);
  
  // Find next available ID that hasn't been used and isn't locked
  let candidateId: string;
  do {
    counters[prefix]++;
    const paddedNumber = counters[prefix].toString().padStart(2, '0');
    candidateId = `${prefix}-${paddedNumber}`;
  } while (usedIds.has(candidateId) || allReservedIds.has(candidateId));
  
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
  
  // Get all locked IDs
  const allLockedIds = getAllLockedIds();
  
  // Mark all existing IDs and locked IDs as used and find the highest number for each prefix
  [...existingIds, ...allLockedIds].forEach(id => {
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
  
  console.log(`🔄 Initialized with ${existingIds.length} existing IDs`);
  console.log(`🔒 Locked IDs: ${allLockedIds.join(', ')}`);
}

export function markIdAsDeleted(id: string): void {
  // Keep the ID in usedIds to prevent reuse, but don't remove from counters
  // This ensures deleted IDs are never reassigned
  console.log(`🗑️ ID ${id} marked as deleted (will not be reused)`);
}

export function getReservedIdForName(name: string): string | null {
  return getLockedId(name);
}

export function isIdReserved(id: string): boolean {
  return isIdLocked(id);
}

export function getAllUsedIds(): string[] {
  return Array.from(usedIds);
} 