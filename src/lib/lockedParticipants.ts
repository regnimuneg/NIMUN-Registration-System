// Locked participants - these IDs are permanently assigned and cannot be reassigned
export const LOCKED_PARTICIPANTS: Record<string, string> = {
  'EX-01': 'Zein Raafat',
  'EX-02': 'Abdallah Emam',
  'EX-03': 'Adham Abdelaal',
  'EX-04': 'Hana Abdelmordy',
  'EX-05': 'Mariam Kabbany',
  'EX-06': 'Moaz El Shahed',
  'EX-07': 'Seif Elnahas',
  'EX-08': 'Hassan Elsharazly',
  'EX-09': 'Omar Akl',
  'EX-10': 'Rawya Nabil',
  'EX-11': 'Nizar Amer',
  'EX-12': 'Zeina Youssef',
  'EX-13': 'Malak Ehab',
  'EX-14': 'Ali Sameh',
  'EX-15': 'Mostafa Salama',
  'EX-16': 'Farah Ghaly',
  'EX-17': 'Khadija Shash',
  'EX-18': 'Farah Darwish',
  'EX-19': 'Omar Nabil',
  'EX-20': 'Maya Nader',
  'EX-21': 'Ameena GamalEldin',
  'EX-22': 'Nour Elhabbak',
  'EX-23': 'Sawsan Ali',
};

// Reverse lookup for name to ID
export const LOCKED_NAMES_TO_IDS: Record<string, string> = Object.fromEntries(
  Object.entries(LOCKED_PARTICIPANTS).map(([id, name]) => [name.toLowerCase().trim(), id])
);

/**
 * Check if an ID is locked to a specific participant
 */
export function isIdLocked(id: string): boolean {
  return id in LOCKED_PARTICIPANTS;
}

/**
 * Get the locked name for an ID
 */
export function getLockedName(id: string): string | null {
  return LOCKED_PARTICIPANTS[id] || null;
}

/**
 * Get the locked ID for a name
 */
export function getLockedId(name: string): string | null {
  const normalizedName = name.toLowerCase().trim();
  return LOCKED_NAMES_TO_IDS[normalizedName] || null;
}

/**
 * Validate that an ID-name pair matches the locked configuration
 */
export function validateLockedParticipant(id: string, name: string): boolean {
  const lockedName = getLockedName(id);
  if (!lockedName) {
    return true; // Not a locked ID, validation passes
  }

  return lockedName.toLowerCase().trim() === name.toLowerCase().trim();
}

/**
 * Get all locked participant IDs
 */
export function getAllLockedIds(): string[] {
  return Object.keys(LOCKED_PARTICIPANTS);
}

/**
 * Get all locked participant names
 */
export function getAllLockedNames(): string[] {
  return Object.values(LOCKED_PARTICIPANTS);
}

/**
 * Check if a name is locked to a specific ID
 */
export function isNameLocked(name: string): boolean {
  const normalizedName = name.toLowerCase().trim();
  return normalizedName in LOCKED_NAMES_TO_IDS;
}

/**
 * Get next available ID for a committee, skipping locked IDs
 */
export function getNextAvailableId(prefix: string, existingIds: string[]): string {
  let counter = 1;

  while (true) {
    const candidateId = `${prefix}-${counter.toString().padStart(2, '0')}`;

    // Skip if this ID is locked or already exists
    if (!isIdLocked(candidateId) && !existingIds.includes(candidateId)) {
      return candidateId;
    }

    counter++;

    // Safety check to prevent infinite loop
    if (counter > 999) {
      throw new Error(`Cannot generate ID for prefix ${prefix} - too many participants`);
    }
  }
} 