import { Participant, BulkImportData, CommitteeType } from '@/types/participant';
import { generateParticipantId, initializeCountersFromExisting } from './idGenerator';
import { generateQRCodeUrl } from './qrHelper';
import { mapRouteNameToId, getBusRouteById } from './busRoutes';

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
  const lineIndex = headers.findIndex(h => h.includes('line') || h.includes('route'));
  const stopIndex = headers.findIndex(h => h.includes('stop'));
  
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
    const line = lineIndex !== -1 ? values[lineIndex]?.replace(/['"]/g, '') || '' : '';
    const stop = stopIndex !== -1 ? values[stopIndex]?.replace(/['"]/g, '') || '' : '';
    
    if (fullName && gender && phoneNumber && committee) {
      data.push({
        fullName,
        gender,
        phoneNumber,
        committee,
        line: line || undefined,
        stop: stop || undefined,
      });
    }
  }
  
  return data;
}

// Helper function to normalize stop names for flexible matching
function normalizeStopName(stopName: string): string {
  return stopName
    .toLowerCase()
    .trim()
    .replace(/[.\-،]/g, '') // Remove dots, dashes, Arabic commas
    .replace(/\s+/g, ' ')   // Normalize spaces
    .replace(/\(.*?\)/g, '') // Remove content in parentheses
    .replace(/\b(gate|mosque|mall|hotel|club)\b/g, '') // Remove common words
    .replace(/\b\d+[a-z]?\b/g, '') // Remove standalone numbers like "5A"
    // Handle specific transliterations
    .replace(/koshary|kushary|koshari/g, 'كشري')
    .replace(/el aarees|al aarees|aarees/g, 'العريس')
    .replace(/khofo|khufu|خوفو/g, 'خوفو')
    .replace(/hosary|husary|حصري/g, 'حصري')
    .trim();
}

// Additional function for more flexible matching
function isStopMatch(inputStop: string, routeStop: string): boolean {
  const normalizedInput = normalizeStopName(inputStop);
  const normalizedRoute = normalizeStopName(routeStop);
  
  // Direct matches
  if (normalizedInput === normalizedRoute) return true;
  if (normalizedInput.includes(normalizedRoute) || normalizedRoute.includes(normalizedInput)) return true;
  
  // Special case handling
  const specialMatches = [
    // Koshary el aarees variations
    { input: ['koshary el aarees', 'kushary al aarees'], route: 'كشري العريس' },
    { input: ['khofo gate 1', 'khufu gate 1', 'khofo gate'], route: 'خوفو' },
    { input: ['hosary mosque', 'al hosary mosque'], route: 'حصري' }
  ];
  
  for (const match of specialMatches) {
    const inputMatches = match.input.some(variant => 
      normalizedInput.includes(normalizeStopName(variant)) || 
      normalizeStopName(variant).includes(normalizedInput)
    );
    const routeMatches = normalizedRoute.includes(match.route) || match.route.includes(normalizedRoute);
    
    if (inputMatches && routeMatches) return true;
  }
  
  // Word-based matching (at least 1 significant word for short inputs, 2 for longer)
  const inputWords = normalizedInput.split(' ').filter(w => w.length > 2);
  const routeWords = normalizedRoute.split(' ').filter(w => w.length > 2);
  const matchingWords = inputWords.filter(word => 
    routeWords.some(routeWord => routeWord.includes(word) || word.includes(routeWord))
  );
  
  const requiredMatches = inputWords.length <= 2 ? 1 : 2;
  return matchingWords.length >= requiredMatches;
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
    'unwomen': 'UN Women Delegates',
    'unwomen delegates': 'UN Women Delegates',
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
      // Allow specific phone numbers to appear multiple times
      const allowedDuplicatePhones = ['01147280844'];
      const phoneExists = !allowedDuplicatePhones.includes(row.phoneNumber) && (
        existingParticipants.some(p => p.phoneNumber === row.phoneNumber) ||
        result.participants.some(p => p.phoneNumber === row.phoneNumber)
      );
      if (phoneExists) {
        result.errors.push(`Row ${i + 2}: Phone number '${row.phoneNumber}' already exists`);
        result.summary.failed++;
        continue;
      }
      
      // Validate and process bus information
      let busRoute: string | undefined;
      let busStop: string | undefined;
      
      if (row.line) {
        const routeId = mapRouteNameToId(row.line);
        if (!routeId) {
          result.errors.push(`Row ${i + 2}: Unknown bus route '${row.line}'. Valid routes: 6th of October, 5th Settlement, Sheikh Zayed, Feisal, Maadi`);
          result.summary.failed++;
          continue;
        }
        
        busRoute = routeId;
        
        // Validate bus stop if provided
        if (row.stop) {
          const route = getBusRouteById(routeId);
          if (route) {
            // Normalize the input stop name for comparison
            const normalizedInputStop = normalizeStopName(row.stop);
            const matchingStop = route.stops.find(stop => isStopMatch(row.stop!, stop));
            
            if (!matchingStop) {
              result.errors.push(`Row ${i + 2}: Bus stop '${row.stop}' not found in route '${row.line}'. Valid stops: ${route.stops.join(', ')}`);
              result.summary.failed++;
              continue;
            }
            busStop = matchingStop; // Use the actual stop name from the system
          }
        }
      }
      
      // Generate ID and QR code (pass name for reserved ID check)
      const participantId = generateParticipantId(standardCommittee, row.fullName);
      const qrData = generateQRCodeUrl(participantId);
      
      const participant: Participant = {
        id: participantId,
        name: row.fullName,
        phoneNumber: row.phoneNumber,
        position: standardCommittee,
        gender: row.gender,
        qrUrl: qrData,
        busRoute,
        busStop,
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