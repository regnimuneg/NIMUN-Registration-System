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

export interface GameActivity {
  id: string;
  participantId: string;
  participantName: string;
  gameType: 'PR G1' | 'PR G2' | 'General Court 1' | 'General Court 2' | 'Padel Court 1' | 'Padel Court 2' | 'Football Court';
  timeSpent: number; // in minutes
  date: string;
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