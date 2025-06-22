import { Participant, BulkImportData, CommitteeType } from '@/types/participant';
import { generateParticipantId, initializeCountersFromExisting } from './idGenerator';
import { generateQRCodeUrl } from './qrHelper';

export interface ImportResult {
  success: boolean;
  participants: Participant[];
  errors: string[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export function parseCSVData(csvText: string): BulkImportData[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return [];
  }
  
  // Parse header to find column indices
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const nameIndex = headers.findIndex(h => h.includes('name'));
  const genderIndex = headers.findIndex(h => h.includes('gender'));
  const phoneIndex = headers.findIndex(h => h.includes('phone'));
  const committeeIndex = headers.findIndex(h => h.includes('committee'));
  
  if (nameIndex === -1 || genderIndex === -1 || phoneIndex === -1 || committeeIndex === -1) {
    throw new Error('Required columns not found. CSV must contain: Full Name, Gender, Phone Number, Committee');
  }
  
  const data: BulkImportData[] = [];
  
  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    
    if (values.length < Math.max(nameIndex, genderIndex, phoneIndex, committeeIndex) + 1) {
      continue; // Skip incomplete rows
    }
    
    const fullName = values[nameIndex]?.replace(/['"]/g, '') || '';
    const gender = values[genderIndex]?.replace(/['"]/g, '') as 'Male' | 'Female';
    const phoneNumber = values[phoneIndex]?.replace(/['"]/g, '') || '';
    const committee = values[committeeIndex]?.replace(/['"]/g, '') || '';
    
    if (fullName && gender && phoneNumber && committee) {
      data.push({
        fullName,
        gender,
        phoneNumber,
        committee,
      });
    }
  }
  
  return data;
}

export function mapCommitteeToStandardName(committee: string): CommitteeType | null {
  const committeeMappings: Record<string, CommitteeType> = {
    'executive': 'Executive',
    'exec': 'Executive',
    'registration affairs': 'Registration Affairs',
    'registration': 'Registration Affairs',
    'operations': 'Operations',
    'ops': 'Operations',
    'public relations': 'Public Relations',
    'pr': 'Public Relations',
    'media & design': 'Media & Design',
    'media': 'Media & Design',
    'design': 'Media & Design',
    'socials': 'Socials',
    'social': 'Socials',
    'icj delegates': 'ICJ Delegates',
    'icj': 'ICJ Delegates',
    'unoosa delegates': 'UNOOSA Delegates',
    'unoosa': 'UNOOSA Delegates',
    'disec delegates': 'DISEC Delegates',
    'disec': 'DISEC Delegates',
    'press delegates': 'Press Delegates',
    'press': 'Press Delegates',
    'un women delegates': 'UN Women Delegates',
    'un women': 'UN Women Delegates',
    'unodc delegates': 'UNODC Delegates',
    'unodc': 'UNODC Delegates',
  };
  
  const normalized = committee.toLowerCase().trim();
  return committeeMappings[normalized] || null;
}

export async function processBulkImport(
  csvData: BulkImportData[],
  existingParticipants: Participant[] = []
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    participants: [],
    errors: [],
    summary: {
      total: csvData.length,
      successful: 0,
      failed: 0,
    },
  };
  
  // Initialize ID counters from existing participants
  const existingIds = existingParticipants.map(p => p.id);
  initializeCountersFromExisting(existingIds);
  
  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    
    try {
      // Validate required fields
      if (!row.fullName || !row.gender || !row.phoneNumber || !row.committee) {
        result.errors.push(`Row ${i + 2}: Missing required fields`);
        result.summary.failed++;
        continue;
      }
      
      // Validate gender
      if (row.gender !== 'Male' && row.gender !== 'Female') {
        result.errors.push(`Row ${i + 2}: Invalid gender '${row.gender}'. Must be 'Male' or 'Female'`);
        result.summary.failed++;
        continue;
      }
      
      // Map committee to standard name
      const standardCommittee = mapCommitteeToStandardName(row.committee);
      if (!standardCommittee) {
        result.errors.push(`Row ${i + 2}: Unknown committee '${row.committee}'`);
        result.summary.failed++;
        continue;
      }
      
      // Check for duplicate phone numbers in existing data
      const phoneExists = existingParticipants.some(p => p.phoneNumber === row.phoneNumber) ||
                         result.participants.some(p => p.phoneNumber === row.phoneNumber);
      if (phoneExists) {
        result.errors.push(`Row ${i + 2}: Phone number '${row.phoneNumber}' already exists`);
        result.summary.failed++;
        continue;
      }
      
      // Generate ID and QR code
      const participantId = generateParticipantId(standardCommittee);
      const qrData = generateQRCodeUrl(participantId);
      
      const participant: Participant = {
        id: participantId,
        name: row.fullName,
        phoneNumber: row.phoneNumber,
        position: standardCommittee,
        gender: row.gender,
        qrUrl: qrData,
      };
      
      result.participants.push(participant);
      result.summary.successful++;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Row ${i + 2}: ${errorMessage}`);
      result.summary.failed++;
    }
  }
  
  if (result.summary.failed > 0) {
    result.success = false;
  }
  
  return result;
}

export function generateImportSummary(result: ImportResult): string {
  const { summary, errors } = result;
  
  let report = `Import Summary:\n`;
  report += `Total rows processed: ${summary.total}\n`;
  report += `Successfully imported: ${summary.successful}\n`;
  report += `Failed: ${summary.failed}\n`;
  
  if (errors.length > 0) {
    report += `\nErrors:\n`;
    errors.forEach(error => {
      report += `- ${error}\n`;
    });
  }
  
  return report;
} 