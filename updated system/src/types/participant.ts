export interface Participant {
  id: string;
  name: string;
  phoneNumber: string;
  position: string;
  gender: 'Male' | 'Female';
  qrUrl?: string;
  
  // Attendance tracking
  attendance?: {
    session1?: boolean;
    session2?: boolean;
    session3?: boolean;
    session4?: boolean;
    conference1?: boolean;
    conference2?: boolean;
    conference3?: boolean;
    performanceDay?: boolean;
    openingDay?: boolean;
  };
  
  // Food tracking
  food?: {
    [date: string]: {
      breakfast?: boolean;
      lunch?: boolean;
    };
  };
  
  // Bus tracking
  bus?: {
    [date: string]: {
      busTo?: boolean;
      busFrom?: boolean;
    };
  };
}

export interface DayTrackingData {
  // Sessions: June 28 - July 1 (4 days)
  sessions: {
    day1: { attended: boolean; lunch: boolean }
    day2: { attended: boolean; lunch: boolean }
    day3: { attended: boolean; lunch: boolean }
    day4: { attended: boolean; lunch: boolean }
  }
  
  // Performance Day: July 2
  performanceDay: {
    attended: boolean
    breakfast: boolean
    lunch: boolean
  }
  
  // Off Day: July 3 (no tracking)
  
  // Opening Ceremony: July 4
  openingCeremony: {
    attended: boolean
    catering: boolean
  }
  
  // Conference Days: July 5-7 (3 days)
  conference: {
    day1: { attended: boolean; breakfast: boolean; lunch: boolean }
    day2: { attended: boolean; breakfast: boolean; lunch: boolean }
    day3: { attended: boolean; breakfast: boolean; lunch: boolean } // No bus on this day
  }
}

export interface GameActivity {
  activity: string;
  joinTime: string;
  leaveTime?: string;
  day: string; // Which day this activity happened
}

export interface BusTracking {
  type: 'arriving' | 'departing';
  route: string; // Route name (will be 1-5);
  stop: string;
  timestamp: string;
  day: string; // Which day this happened
}

export interface TrackingData {
  dayTracking: DayTrackingData;
  games: GameActivity[];
  bus: BusTracking[];
}

export interface BulkImportData {
  fullName: string;
  gender: 'Male' | 'Female';
  phoneNumber: string;
  committee: string;
}

export interface IdPrefixConfig {
  'ICJ Delegates': 'IC';
  'UNOOSA Delegates': 'OS';
  'DISEC Delegates': 'DC';
  'Press Delegates': 'PS';
  'UN Women Delegates': 'UW';
  'UNODC Delegates': 'OD';
  'Media & Design': 'MD';
  'Operations': 'OP';
  'Registration Affairs': 'RG';
  'Socials': 'SO';
  'Public Relations': 'PR';
  'Executive': 'EX';
}

export type CommitteeType = keyof IdPrefixConfig; 