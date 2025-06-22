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

// In-memory counter storage (in production, this should be stored in database)
const counters: Record<string, number> = {};

export function generateParticipantId(committee: CommitteeType): string {
  const prefix = ID_PREFIX_MAP[committee];
  
  if (!prefix) {
    throw new Error(`Unknown committee: ${committee}`);
  }
  
  // Initialize counter if it doesn't exist
  if (!counters[prefix]) {
    counters[prefix] = 0;
  }
  
  // Increment counter
  counters[prefix]++;
  
  // Format with leading zeros (e.g., IC-01, IC-02, etc.)
  const paddedNumber = counters[prefix].toString().padStart(2, '0');
  
  return `${prefix}-${paddedNumber}`;
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
  // Reset counters first
  resetCounters();
  
  // Find the highest number for each prefix
  existingIds.forEach(id => {
    const match = id.match(/^([A-Z]{2})-(\d+)$/);
    if (match) {
      const [, prefix, numberStr] = match;
      const number = parseInt(numberStr, 10);
      
      if (!counters[prefix] || counters[prefix] < number) {
        counters[prefix] = number;
      }
    }
  });
} 