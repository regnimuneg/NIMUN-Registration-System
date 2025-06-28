import { google } from 'googleapis';
import { Participant, GameActivity } from '@/types/participant';

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Initialize Google Sheets API
async function getGoogleSheetsInstance() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: SCOPES,
  });

  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

export async function getSheetNames(): Promise<string[]> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    
    return response.data.sheets?.map(sheet => sheet.properties?.title || '') || [];
  } catch (error) {
    console.error('Error getting sheet names:', error);
    throw error;
  }
}

export async function createParticipantsSheet(): Promise<void> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  // First, check if the Participants sheet exists
  const sheetNames = await getSheetNames();
  const participantsSheetExists = sheetNames.includes('Participants');

  // Also ensure the Attendance sheet exists
  await createAttendanceTrackingSheet();

  // If the sheet doesn't exist, create it
  if (!participantsSheetExists) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: 'Participants',
              },
            },
          }],
        },
      });
      console.log('Created Participants sheet');

      // Define headers for the participants sheet (basic info only)
      const headers = [
        'ID',
        'Name', 
        'Phone Number',
        'Position',
        'Gender',
        'QR Data',
        'Bus Route',
        'Bus Stop'
      ];

      // Only add headers when creating a new sheet
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Participants!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [headers],
        },
      });

      console.log('Participants sheet initialized successfully');
    } catch (error) {
      console.error('Error creating Participants sheet:', error);
      throw error;
    }
  } else {
    console.log('Participants sheet already exists');
  }
  
  // Always ensure attendance sheet exists
  console.log('Ensuring Attendance sheet exists...');
}

export async function addParticipant(participant: Participant): Promise<void> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  const values = [
    participant.id,
    participant.name,
    participant.phoneNumber,
    participant.position,
    participant.gender,
    participant.qrUrl || '',
    participant.busRoute || '',
    participant.busStop || ''
  ];

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Participants!A:Z',
      valueInputOption: 'RAW',
      requestBody: {
        values: [values],
      },
    });
  } catch (error) {
    console.error('Error adding participant:', error);
    throw error;
  }
}

// Individual participant cache for super-fast lookups
const individualParticipantCache = new Map<string, { data: Participant, timestamp: number }>()
const INDIVIDUAL_CACHE_DURATION = 60 * 1000 // 1 minute for individual participants

// ULTRA-FAST: Get single participant by ID with aggressive caching
export async function getParticipantById(participantId: string): Promise<Participant | null> {
  // First check individual participant cache
  const individualCached = individualParticipantCache.get(participantId)
  if (individualCached && Date.now() - individualCached.timestamp < INDIVIDUAL_CACHE_DURATION) {
    return individualCached.data
  }

  // Second, check if we have it in the participant list cache
  const cachedList = getCachedParticipantList()
  if (cachedList) {
    const participant = cachedList.find((p: Participant) => p.id === participantId)
    if (participant) {
      // Cache this individual participant for even faster future lookups
      individualParticipantCache.set(participantId, { data: participant, timestamp: Date.now() })
      return participant
    }
  }

  // If not cached, we need to search the sheet
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  try {
    // ULTRA-FAST APPROACH: Search directly in the sheet without loading everything
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Participants!A:H', // Only get columns we need
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return null;
    }

    // Search for the specific participant (skip header row)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] === participantId) {
        const participant: Participant = {
          id: row[0] || '',
          name: row[1] || '',
          phoneNumber: row[2] || '',
          position: row[3] || '',
          gender: (row[4] as 'Male' | 'Female') || 'Male',
          qrUrl: row[5] || '',
          busRoute: row[6] || undefined,
          busStop: row[7] || undefined,
        };
        
        // Cache this individual participant for even faster future lookups
        individualParticipantCache.set(participantId, { data: participant, timestamp: Date.now() })
        
        return participant;
      }
    }
    
    return null; // Participant not found
  } catch (error) {
    console.error('Error getting participant by ID:', error);
    throw error;
  }
}

export async function getAllParticipants(): Promise<Participant[]> {
  // Check cache first for faster loading
  const cached = getCachedParticipantList()
  if (cached) {
    return cached
  }

  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Participants!A:Z',
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return [];
    }

    // Skip header row
    const participants = rows.slice(1).map((row): Participant => ({
      id: row[0] || '',
      name: row[1] || '',
      phoneNumber: row[2] || '',
      position: row[3] || '',
      gender: (row[4] as 'Male' | 'Female') || 'Male',
      qrUrl: row[5] || '',
      busRoute: row[6] || undefined,
      busStop: row[7] || undefined,
      // Attendance data will be fetched separately from the ActivityTracking sheet
    }));

    // Cache the result for faster subsequent calls
    setCachedParticipantList(participants)
    
    return participants
  } catch (error) {
    console.error('Error getting participants:', error);
    throw error;
  }
}

// Create dedicated Attendance tracking sheet
async function createAttendanceTrackingSheet(): Promise<void> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  const sheetNames = await getSheetNames();
  
  if (!sheetNames.includes('Attendance')) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: 'Attendance',
              },
            },
          }],
        },
      });

      const headers = [
        'Participant ID',
        'Day Key',
        'Field',
        'Value',
        'Timestamp'
      ];

      await sheets.spreadsheets.values.update({
      spreadsheetId,
        range: 'Attendance!A1',
      valueInputOption: 'RAW',
      requestBody: {
          values: [headers],
      },
    });

      console.log('Attendance tracking sheet created');
  } catch (error) {
      console.error('Error creating Attendance sheet:', error);
    throw error;
    }
  }
}

// Updated attendance tracking to use dedicated sheet
export async function updateParticipantAttendance(
  participantId: string,
  dayKey: string,
  field: string,
  value: boolean,
  timestamp: string
): Promise<void> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  // Create attendance tracking sheet if it doesn't exist
  await createAttendanceTrackingSheet();

  try {
    // Ensure ActivityTracking sheet exists
    await createActivityTrackingSheet();
    
    const attendanceRow = [
      participantId,
      dayKey,
      field,
      value ? 'TRUE' : 'FALSE',
      timestamp
    ];
    
    const activityType = field === 'attended' ? 'Attendance' : 'Food';
    const activityName = field === 'attended' ? `${dayKey} Attendance` : `${dayKey} ${field}`;
    const activityRow = [
      participantId,
      activityType,
      activityName,
      value ? 'TRUE' : 'FALSE',
      timestamp
    ];
    
    // Write to both sheets in parallel for speed
    const writePromises = [
      sheets.spreadsheets.values.append({
      spreadsheetId,
        range: 'Attendance!A:E',
      valueInputOption: 'RAW',
      requestBody: {
          values: [attendanceRow],
        },
      }),
      sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'ActivityTracking!A:E',
        valueInputOption: 'RAW',
        requestBody: {
          values: [activityRow],
        },
      })
    ];
    
    await Promise.all(writePromises);
    
    // Invalidate cache for this participant to ensure fresh data on next load
    invalidateParticipantCache(participantId)
    
  } catch (error) {
    console.error('Error updating attendance:', error);
    throw error;
  }
}

// Legacy attendance system removed - all attendance is now tracked in ActivityTracking sheet

export async function bulkAddParticipants(participants: Participant[]): Promise<void> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  const values = participants.map(participant => [
    participant.id,
    participant.name,
    participant.phoneNumber,
    participant.position,
    participant.gender,
    participant.qrUrl || '',
    participant.busRoute || '',
    participant.busStop || ''
  ]);

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Participants!A:Z',
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    });
  } catch (error) {
    console.error('Error bulk adding participants:', error);
    throw error;
  }
}

// Food Tracking Functions
export async function updateFoodTracking(
  participantId: string,
  dayKey: string,
  meal: string,
  value: boolean,
  timestamp: string
): Promise<void> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  // Create activity tracking and food tracking sheets if they don't exist
  const createPromises = [
    createActivityTrackingSheet(),
    createFoodTrackingSheet()
  ];
  await Promise.all(createPromises);

  try {
    const activityName = `${dayKey} ${meal}`;
    const activityRow = [
          participantId,
          'Food',
          activityName,
          value ? 'TRUE' : 'FALSE',
          timestamp
    ];
    
    // Create food tracking row with daily input
    const foodRow = [
      participantId,
      dayKey,
      meal,
      value ? 'TRUE' : 'FALSE',
      timestamp
    ];
    
    // Write to both ActivityTracking and Food sheets in parallel for speed
    const writePromises = [
      sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'ActivityTracking!A:E',
        valueInputOption: 'RAW',
        requestBody: {
          values: [activityRow],
        },
      }),
      sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Food!A:E',
        valueInputOption: 'RAW',
        requestBody: {
          values: [foodRow],
        },
      })
    ];
    
    await Promise.all(writePromises);
    
    // Invalidate cache for this participant to ensure fresh data on next load
    invalidateParticipantCache(participantId)
    
  } catch (error) {
    console.error('Error updating food tracking:', error);
    throw error;
  }
}

// Legacy food tracking update for backward compatibility
async function updateLegacyFoodTracking(
  participantId: string,
  meal: string,
  value: boolean
): Promise<void> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  // Create Food tracking sheet if it doesn't exist
  await createFoodTrackingSheet();
  
  try {
    // Check if participant already has a food tracking record
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Food!A:Z',
    });

    const rows = response.data.values || [];
    let participantRowIndex = -1;
    
    // Find existing row for participant
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === participantId) {
        participantRowIndex = i;
        break;
      }
    }

    const mealColumns: Record<string, number> = {
      breakfast: 1,
      lunch: 2,
      dinner: 3,
      snack1: 4,
      snack2: 5
    };

    const columnIndex = mealColumns[meal];
    if (columnIndex === undefined) {
      throw new Error(`Invalid meal type: ${meal}`);
    }

    if (participantRowIndex === -1) {
      // Add new row for participant
      const newRow = [participantId, '', '', '', '', ''];
      newRow[columnIndex] = value ? 'TRUE' : 'FALSE';
      
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Food!A:Z',
        valueInputOption: 'RAW',
        requestBody: {
          values: [newRow],
        },
      });
    } else {
      // Update existing row
      const rowNumber = participantRowIndex + 1;
      const columnLetter = String.fromCharCode(65 + columnIndex);
      
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Food!${columnLetter}${rowNumber}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[value ? 'TRUE' : 'FALSE']],
        },
      });
    }
  } catch (error) {
    console.error('Error updating legacy food tracking:', error);
    // Don't throw error for legacy update failures
  }
}

// Games Tracking Functions
export async function updateGameActivity(
  participantId: string,
  activity: string,
  action: 'join' | 'leave',
  timestamp: string,
  day?: string
): Promise<void> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  // Create both sheets and write to both in parallel for speed
  const createPromises = [
    createGamesTrackingSheet(),
    createActivityTrackingSheet()
  ];
  await Promise.all(createPromises);
  
  try {
    // Create row with join/leave time tracking
    const joinTime = action === 'join' ? timestamp : '';
    const leaveTime = action === 'leave' ? timestamp : '';
    const gameRow = [participantId, activity, action, timestamp, day || 'current', joinTime, leaveTime];
    const activityRow = [
      participantId,
      'Games',
      `${action} ${activity}`,
      action === 'join' ? 'TRUE' : 'FALSE',
      timestamp
    ];
    
    // Write to both sheets in parallel for speed
    const writePromises = [
      sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Games!A:Z',
      valueInputOption: 'RAW',
      requestBody: {
          values: [gameRow],
        },
      }),
      sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'ActivityTracking!A:E',
        valueInputOption: 'RAW',
        requestBody: {
          values: [activityRow],
        },
      })
    ];
    
    await Promise.all(writePromises);
    
    // Invalidate cache for this participant to ensure fresh data on next load
    invalidateParticipantCache(participantId)
  } catch (error) {
    console.error('Error updating game activity:', error);
    throw error;
  }
}

// Get current number of players in a game
export async function getGameCurrentPlayers(activity: string, day: string): Promise<number> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  try {
    // Ensure the Games sheet exists
    await createGamesTrackingSheet();

    // Get all game records
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Games!A:G',
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return 0; // No data or only headers
    }

    // Track players currently in the game
    const playersInGame = new Set<string>();
    
    // Process rows to find current players (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // Defensive check for malformed rows
      if (!row || row.length < 5) continue;
      const [participantId, gameActivity, action, timestamp, gameDay] = row;
      
      // Filter by activity and day
      if (gameActivity === activity && (gameDay === day || gameDay === 'current')) {
        if (action === 'join') {
          playersInGame.add(participantId);
        } else if (action === 'leave') {
          playersInGame.delete(participantId);
        }
      }
    }

    return playersInGame.size;
  } catch (error) {
    console.error('Error getting current players:', error);
    return 0; // Return 0 on error to be safe
  }
}

// Get all participants currently in courts with detailed information
export async function getAllParticipantsInCourts(day: string): Promise<{[courtName: string]: Array<{participantId: string, joinTime: string, duration: string}>}> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  try {
    // Ensure the Games sheet exists
    await createGamesTrackingSheet();

    // Get all game records
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Games!A:G',
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return {}; // No data or only headers
    }

    // Track players currently in each court
    const courtsData: {[courtName: string]: Array<{participantId: string, joinTime: string, duration: string}>} = {};
    const playerStatus: {[participantId: string]: {activity: string, joinTime: string}} = {};
    
    // Process rows to find current players (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // Defensive check for malformed rows
      if (!row || row.length < 7) continue;
      const [participantId, gameActivity, action, timestamp, gameDay, joinTime, leaveTime] = row;
      
      // Filter by day
      if (gameDay === day || gameDay === 'current') {
        if (action === 'join') {
          playerStatus[participantId] = { 
            activity: gameActivity, 
            joinTime: joinTime || timestamp 
          };
        } else if (action === 'leave') {
          delete playerStatus[participantId];
        }
      }
    }

    // Format the data for each court
    Object.entries(playerStatus).forEach(([participantId, data]) => {
      if (!courtsData[data.activity]) {
        courtsData[data.activity] = [];
      }
      
      const joinTime = new Date(data.joinTime);
      const now = new Date();
      const durationMs = now.getTime() - joinTime.getTime();
      const durationMinutes = Math.floor(durationMs / (1000 * 60));
      const durationHours = Math.floor(durationMinutes / 60);
      const remainingMinutes = durationMinutes % 60;
      
      const duration = durationHours > 0 
        ? `${durationHours}h ${remainingMinutes}m`
        : `${remainingMinutes}m`;

      courtsData[data.activity].push({
        participantId,
        joinTime: data.joinTime,
        duration
      });
    });

    return courtsData;
  } catch (error) {
    console.error('Error getting participants in courts:', error);
    return {};
  }
}

// Check if participant is currently in any game
export async function getParticipantCurrentGame(participantId: string, day: string): Promise<string | null> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  try {
    // Ensure the Games sheet exists
    await createGamesTrackingSheet();

    // Get all game records
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Games!A:G',
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      return null; // No data or only headers
    }

    let currentGame: string | null = null;
    
    // Process rows to find current game (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // Defensive check for malformed rows
      if (!row || row.length < 5) continue;
      const [rowParticipantId, gameActivity, action, timestamp, gameDay] = row;
      
      // Filter by participant and day
      if (rowParticipantId === participantId && (gameDay === day || gameDay === 'current')) {
        if (action === 'join') {
          currentGame = gameActivity;
        } else if (action === 'leave' && currentGame === gameActivity) {
          // Only nullify if leaving the game they were marked in
          currentGame = null;
        }
      }
    }

    return currentGame;
  } catch (error) {
    console.error('Error getting participant current game:', error);
    return null;
  }
}

// Bus Tracking Functions
export async function updateBusTracking(
  participantId: string,
  type: 'arriving' | 'departing',
  stop: string,
  timestamp: string
): Promise<void> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  // Create both sheets and write to both in parallel for speed
  const createPromises = [
    createBusTrackingSheet(),
    createActivityTrackingSheet()
  ];
  await Promise.all(createPromises);
  
  try {
    const busRow = [participantId, type, stop, timestamp, 'current'];
    const activityRow = [
      participantId,
      'Bus',
      `${type} at ${stop}`,
      'TRUE',
      timestamp
    ];
    
    // Write to both sheets in parallel for speed
    const writePromises = [
      sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Bus!A:Z',
      valueInputOption: 'RAW',
      requestBody: {
          values: [busRow],
        },
      }),
      sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'ActivityTracking!A:E',
        valueInputOption: 'RAW',
        requestBody: {
          values: [activityRow],
        },
      })
    ];
    
    await Promise.all(writePromises);
    
    // Invalidate cache for this participant to ensure fresh data on next load
    invalidateParticipantCache(participantId)
  } catch (error) {
    console.error('Error updating bus tracking:', error);
    throw error;
  }
}

// Helper functions to create tracking sheets
async function createFoodTrackingSheet(): Promise<void> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  const sheetNames = await getSheetNames();
  if (!sheetNames.includes('Food')) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: 'Food',
              },
            },
          }],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Food!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['Participant ID', 'Day', 'Meal Type', 'Given', 'Timestamp']],
        },
      });
    } catch (error) {
      console.error('Error creating Food sheet:', error);
    }
  }
}

async function createGamesTrackingSheet(): Promise<void> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  const sheetNames = await getSheetNames();
  if (!sheetNames.includes('Games')) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: 'Games',
              },
            },
          }],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Games!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['Participant ID', 'Activity', 'Action', 'Timestamp', 'Day', 'Join Time', 'Leave Time']],
        },
      });
    } catch (error) {
      console.error('Error creating Games sheet:', error);
    }
  }
}

async function createBusTrackingSheet(): Promise<void> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  const sheetNames = await getSheetNames();
  if (!sheetNames.includes('Bus')) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: 'Bus',
              },
            },
          }],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Bus!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['Participant ID', 'Type', 'Stop', 'Timestamp', 'Day']],
        },
      });
    } catch (error) {
      console.error('Error creating Bus sheet:', error);
    }
  }
}

async function createActivityTrackingSheet(): Promise<void> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  const sheetNames = await getSheetNames();
  if (!sheetNames.includes('ActivityTracking')) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: 'ActivityTracking',
              },
            },
          }],
        },
      });

      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'ActivityTracking!A1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['Participant ID', 'Activity Type', 'Activity Name', 'Status', 'Timestamp']],
        },
      });

      console.log('Activity tracking sheet created successfully');
    } catch (error) {
      console.error('Error creating Activity tracking sheet:', error);
    }
  }
}

// Get participant tracking data
// Get attendance data from dedicated Attendance sheet
export async function getParticipantAttendanceData(participantId: string) {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  try {
    // Get attendance data
    const attendanceResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
      range: 'Attendance!A:E',
    });

    const attendanceRows = attendanceResponse.data.values || [];
    const attendanceData: any = {};

    // Process attendance data
    for (let i = 1; i < attendanceRows.length; i++) {
      const row = attendanceRows[i];
      if (row[0] === participantId) {
        const dayKey = row[1];
        const field = row[2];
        const value = row[3] === 'TRUE';
        
        if (!attendanceData[dayKey]) {
          attendanceData[dayKey] = {};
        }
        attendanceData[dayKey][field] = value;
      }
    }

    return {
      dayTracking: attendanceData
    };
    } catch (error) {
    console.error('Error getting participant attendance data:', error);
    return { dayTracking: {} };
  }
}

// Enhanced caching system for better performance
const participantCache = new Map<string, { data: any, timestamp: number }>()
const participantListCache = { data: null as any, timestamp: 0 }
const activitySheetCache = { data: null as any, timestamp: 0 }
const CACHE_DURATION = 30 * 1000 // 30 seconds cache (faster refresh for active scanning)
const LIST_CACHE_DURATION = 60 * 1000 // 1 minute for participant list
const ACTIVITY_CACHE_DURATION = 20 * 1000 // 20 seconds for activity sheet (very aggressive)

function getCachedParticipant(participantId: string) {
  const cached = participantCache.get(participantId)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data
  }
  return null
}

function setCachedParticipant(participantId: string, data: any) {
  participantCache.set(participantId, { data, timestamp: Date.now() })
  
  // Clean up old cache entries (keep cache size manageable)
  if (participantCache.size > 200) { // Increased cache size for better hit rate
    const entries = Array.from(participantCache.entries())
    // Remove oldest 50 entries
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
    for (let i = 0; i < 50; i++) {
      participantCache.delete(entries[i][0])
    }
  }
}

function getCachedParticipantList() {
  if (participantListCache.data && Date.now() - participantListCache.timestamp < LIST_CACHE_DURATION) {
    return participantListCache.data
  }
  return null
}

function setCachedParticipantList(data: any) {
  participantListCache.data = data
  participantListCache.timestamp = Date.now()
}

function getCachedActivitySheet() {
  if (activitySheetCache.data && Date.now() - activitySheetCache.timestamp < ACTIVITY_CACHE_DURATION) {
    return activitySheetCache.data
  }
  return null
}

function setCachedActivitySheet(data: any) {
  activitySheetCache.data = data
  activitySheetCache.timestamp = Date.now()
}

function invalidateParticipantCache(participantId?: string) {
  if (participantId) {
    // Invalidate specific participant cache
    participantCache.delete(participantId)
    individualParticipantCache.delete(participantId)
    // Also invalidate activity sheet cache since data changed
    activitySheetCache.data = null
    activitySheetCache.timestamp = 0
  } else {
    // Invalidate all caches
    participantCache.clear()
    individualParticipantCache.clear()
    participantListCache.data = null
    participantListCache.timestamp = 0
    activitySheetCache.data = null
    activitySheetCache.timestamp = 0
  }
}

// OPTIMIZED VERSION: Batch all sheet reads into parallel calls
// ULTRA-FAST VERSION: Use ONLY ActivityTracking sheet
export async function getParticipantTrackingData(participantId: string) {
  // Check cache first - this should prevent most API calls
  const cached = getCachedParticipant(participantId)
  if (cached) {
    return cached
  }

  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  try {
    // Check if we have cached activity sheet data
    let activityRows = getCachedActivitySheet();
    
    if (!activityRows) {
      // Only read ActivityTracking if not cached - everything should be there now
      const activityResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'ActivityTracking!A:E',
      }).catch(() => ({ data: { values: [] } }));

      activityRows = activityResponse.data.values || [];
      setCachedActivitySheet(activityRows);
    }
         const participantRows = activityRows.filter((row: any) => row[0] === participantId);

    // Initialize data structures
    const dayTracking = {
      sessions: {
        day1: { attended: false, lunch: false },
        day2: { attended: false, lunch: false },
        day3: { attended: false, lunch: false },
        day4: { attended: false, lunch: false }
      },
      performanceDay: { attended: false, breakfast: false, lunch: false },
      openingCeremony: { attended: false, catering: false },
      conference: {
        day1: { attended: false, breakfast: false, lunch: false },
        day2: { attended: false, breakfast: false, lunch: false },
        day3: { attended: false, breakfast: false, lunch: false }
      }
    };

    const foodData = {
      breakfast: false,
      lunch: false, 
      dinner: false,
      snack1: false,
      snack2: false
    };

    const gamesData: any[] = [];
    const busData: any[] = [];

         // Process ALL data from ActivityTracking in one pass
     participantRows.forEach((row: any) => {
      const type = (row[1] || '').toLowerCase();
      const activity = row[2] || '';
      const value = row[3] === 'TRUE';
      const timestamp = row[4] || '';

      switch (type) {
        case 'attendance':
          // Parse attendance activities
          if (activity.includes('Attendance')) {
            const dayKey = activity.replace(' Attendance', '');
            const dayPath = dayKey.split('.');
            let current: any = dayTracking;
            
            for (let i = 0; i < dayPath.length - 1; i++) {
              if (current[dayPath[i]]) {
                current = current[dayPath[i]];
              }
            }
            
            const finalDay = dayPath[dayPath.length - 1];
            if (current[finalDay]) {
              current[finalDay].attended = value;
            }
          }
          break;

        case 'food':
          // Parse food activities
          const foodType = activity.toLowerCase();
          if (foodType.includes('breakfast')) foodData.breakfast = value;
          else if (foodType.includes('lunch')) foodData.lunch = value;
          else if (foodType.includes('dinner')) foodData.dinner = value;
          else if (foodType.includes('snack1')) foodData.snack1 = value;
          else if (foodType.includes('snack2')) foodData.snack2 = value;
          break;

        case 'games':
          // Parse games activities
          gamesData.push({
            activity: activity.replace(/^(join|leave) /, ''),
            action: activity.includes('join') ? 'join' : 'leave',
            timestamp
          });
          break;

        case 'bus':
          // Parse bus activities
          busData.push({
            type: activity.includes('arriving') ? 'arriving' : 'departing',
            stop: activity.replace(/arriving at |departing at /, ''),
            timestamp
          });
          break;
      }
    });

    const result = {
      dayTracking,
      food: foodData,
      games: gamesData,
      bus: busData
    };

    // Cache the result for 30 seconds
    setCachedParticipant(participantId, result);

    return result;
  } catch (error) {
    console.error('Error getting participant tracking data:', error);
    throw error;
  }
}

export async function deleteParticipant(participantId: string): Promise<void> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  try {
    // Get all participants to find the row to delete
    const participants = await getAllParticipants();
    const participantIndex = participants.findIndex(p => p.id === participantId);
    
    if (participantIndex === -1) {
      throw new Error(`Participant with ID ${participantId} not found`);
    }

    // Convert to spreadsheet row (add 2: 1 for header, 1 for 0-based index)
    const rowNumber = participantIndex + 2;

    // Get sheet ID for the Participants sheet
    const sheetsMetadata = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties'
    });
    
    const participantsSheet = sheetsMetadata.data.sheets?.find(
      sheet => sheet.properties?.title === 'Participants'
    );
    
    if (!participantsSheet?.properties?.sheetId) {
      throw new Error('Participants sheet not found');
    }

    // Delete the row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: participantsSheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowNumber - 1, // 0-based for API
              endIndex: rowNumber // exclusive end
            }
          }
        }]
      }
    });

    console.log(`Successfully deleted participant ${participantId}`);
  } catch (error) {
    console.error('Error deleting participant:', error);
    throw error;
  }
}

export async function deleteAllParticipants(): Promise<void> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  try {
    // Clear all data except headers (row 1)
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Participants!A2:Z',
    });

    console.log('Successfully deleted all participants');
  } catch (error) {
    console.error('Error deleting all participants:', error);
    throw error;
  }
}

// Get comprehensive participant history - OPTIMIZED VERSION
export async function getParticipantHistory(participantId: string) {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  try {
    const history: any[] = [];

    // Use cached activity sheet data if available
    let activityRows = getCachedActivitySheet();
    
    if (!activityRows) {
      // Read ActivityTracking - it now contains ALL activities with timestamps
      const activityResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'ActivityTracking!A:E',
      }).catch(() => ({ data: { values: [] } }));

      activityRows = activityResponse.data.values || [];
      setCachedActivitySheet(activityRows);
    }
    const participantActivityRows = activityRows
      .filter((row: any) => row[0] === participantId)
      .map((row: any) => ({
        type: (row[1] || '').toLowerCase(),
        activity: row[2] || '',
        value: row[3] === 'TRUE',
        timestamp: row[4] || new Date().toISOString()
      }));

    // Process all activities from ActivityTracking with proper formatting
    participantActivityRows.forEach((activity: any) => {
      let icon = '📝';
      let action = 'activity';
      let details = activity.activity;

      switch (activity.type) {
        case 'attendance':
          icon = '✅';
          action = 'attended';
          details = activity.activity.replace(' Attendance', '');
          // Format day keys nicely
          details = details
            .replace(/sessions\.day(\d)/, 'Session Day $1')
            .replace(/conference\.day(\d)/, 'Conference Day $1')
            .replace(/performanceDay/, 'Performance Day')
            .replace(/openingCeremony/, 'Opening Ceremony')
            .replace(/([A-Z])/g, ' $1')
            .trim();
          break;
        case 'food':
          icon = activity.activity.toLowerCase().includes('breakfast') ? '🥞' : 
                activity.activity.toLowerCase().includes('snack') ? '🥨' : '🍽️';
          action = 'consumed';
          details = activity.activity
            .replace(/([A-Z])/g, ' $1')
            .replace(/(\d)/, ' $1')
            .toLowerCase()
            .trim();
          details = details.charAt(0).toUpperCase() + details.slice(1);
          break;
        case 'games':
          icon = activity.activity.toLowerCase().includes('join') ? '🎮' : '🏁';
          action = activity.activity.includes('join') ? 'joined' : 'left';
          details = activity.activity.replace(/^(join|leave) /, '');
          break;
        case 'bus':
          icon = activity.activity.toLowerCase().includes('arriving') ? '🚌📍' : '🚌💨';
          action = activity.activity.includes('arriving') ? 'arrived' : 'departed';
          details = activity.activity.replace(/arriving at |departing at /, '');
          break;
      }

        history.push({
        type: activity.type,
        action,
        details,
        timestamp: activity.timestamp,
        icon
        });
      });

    // Sort history by timestamp (most recent first)
    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      participantId,
      totalTransactions: history.length,
      history
    };
  } catch (error) {
    console.error('Error getting participant history:', error);
    throw error;
  }
}

export async function clearAllTrackingData(dataType: string): Promise<void> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  try {
    const sheetsToClear: string[] = [];
    
    switch (dataType) {
      case 'all':
        sheetsToClear.push('ActivityTracking', 'Food', 'Games', 'Bus');
        // Also clear attendance data in Participants sheet
        await clearAttendanceData();
        break;
      case 'attendance':
        // Clear attendance columns in Participants sheet
        await clearAttendanceData();
        break;
      case 'food':
        sheetsToClear.push('Food');
        break;
      case 'games':
        sheetsToClear.push('Games');
        break;
      case 'bus':
        sheetsToClear.push('Bus');
        break;
      case 'activity-tracking':
        sheetsToClear.push('ActivityTracking');
        break;
      default:
        throw new Error(`Invalid data type: ${dataType}`);
    }

    // Clear specified sheets
    for (const sheetName of sheetsToClear) {
      try {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${sheetName}!A2:Z`,
        });
        console.log(`Cleared ${sheetName} sheet data`);
      } catch (error) {
        console.warn(`Could not clear ${sheetName} sheet:`, error);
      }
    }

    console.log(`Successfully cleared ${dataType} tracking data`);
  } catch (error) {
    console.error('Error clearing tracking data:', error);
    throw error;
  }
}

async function clearAttendanceData(): Promise<void> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  try {
    // Clear attendance columns (G:O) in Participants sheet, keeping participant data
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Participants!G2:O',
    });
    console.log('Cleared attendance data from Participants sheet');
  } catch (error) {
    console.error('Error clearing attendance data:', error);
    throw error;
  }
} 