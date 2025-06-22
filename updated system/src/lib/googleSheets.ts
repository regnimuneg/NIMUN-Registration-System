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

      // Define headers for the participants sheet
      const headers = [
        'ID',
        'Name', 
        'Phone Number',
        'Position',
        'Gender',
        'QR Data',
        // Attendance columns
        'Session 1',
        'Session 2', 
        'Session 3',
        'Session 4',
        'Conference 1',
        'Conference 2',
        'Conference 3',
        'Performance Day',
        'Opening Day',
        // Dynamic food and bus columns can be added later
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
  }
  // If sheet already exists, do nothing - don't clear existing data!
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
    // Initialize attendance as empty
    '', '', '', '', '', '', '', '', '',
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

export async function getAllParticipants(): Promise<Participant[]> {
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
    return rows.slice(1).map((row): Participant => ({
      id: row[0] || '',
      name: row[1] || '',
      phoneNumber: row[2] || '',
      position: row[3] || '',
      gender: (row[4] as 'Male' | 'Female') || 'Male',
      qrUrl: row[5] || '',
      attendance: {
        session1: row[6] === 'TRUE',
        session2: row[7] === 'TRUE',
        session3: row[8] === 'TRUE',
        session4: row[9] === 'TRUE',
        conference1: row[10] === 'TRUE',
        conference2: row[11] === 'TRUE',
        conference3: row[12] === 'TRUE',
        performanceDay: row[13] === 'TRUE',
        openingDay: row[14] === 'TRUE',
      },
    }));
  } catch (error) {
    console.error('Error getting participants:', error);
    throw error;
  }
}

export async function updateParticipantAttendance(
  participantId: string,
  attendanceField: string,
  value: boolean
): Promise<void> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  // Map attendance fields to column indices
  const attendanceColumns: Record<string, number> = {
    session1: 7,      // Column G
    session2: 8,      // Column H
    session3: 9,      // Column I
    session4: 10,     // Column J
    conference1: 11,  // Column K
    conference2: 12,  // Column L
    conference3: 13,  // Column M
    performanceDay: 14, // Column N
    openingDay: 15,   // Column O
  };

  const columnIndex = attendanceColumns[attendanceField];
  if (columnIndex === undefined) {
    throw new Error(`Invalid attendance field: ${attendanceField}`);
  }

  try {
    // Find the participant row
    const participants = await getAllParticipants();
    const participantIndex = participants.findIndex(p => p.id === participantId);
    
    if (participantIndex === -1) {
      throw new Error(`Participant with ID ${participantId} not found`);
    }

    // Convert to spreadsheet row (add 2: 1 for header, 1 for 0-based index)
    const rowNumber = participantIndex + 2;
    const columnLetter = String.fromCharCode(65 + columnIndex - 1); // Convert to A, B, C, etc.
    
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `Participants!${columnLetter}${rowNumber}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[value ? 'TRUE' : 'FALSE']],
      },
    });
  } catch (error) {
    console.error('Error updating attendance:', error);
    throw error;
  }
}

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
    // Initialize attendance as empty
    '', '', '', '', '', '', '', '', '',
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
    console.error('Error updating food tracking:', error);
    throw error;
  }
}

// Games Tracking Functions
export async function updateGameActivity(
  participantId: string,
  activity: string,
  action: 'join' | 'leave',
  timestamp: string
): Promise<void> {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  await createGamesTrackingSheet();
  
  try {
    const newRow = [participantId, activity, action, timestamp];
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Games!A:Z',
      valueInputOption: 'RAW',
      requestBody: {
        values: [newRow],
      },
    });
  } catch (error) {
    console.error('Error updating game activity:', error);
    throw error;
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

  await createBusTrackingSheet();
  
  try {
    const newRow = [participantId, type, stop, timestamp];
    
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Bus!A:Z',
      valueInputOption: 'RAW',
      requestBody: {
        values: [newRow],
      },
    });
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
          values: [['Participant ID', 'Breakfast', 'Lunch', 'Dinner', 'Snack 1', 'Snack 2']],
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
          values: [['Participant ID', 'Activity', 'Action', 'Timestamp']],
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
          values: [['Participant ID', 'Type', 'Stop', 'Timestamp']],
        },
      });
    } catch (error) {
      console.error('Error creating Bus sheet:', error);
    }
  }
}

// Get participant tracking data
export async function getParticipantTrackingData(participantId: string) {
  const sheets = await getGoogleSheetsInstance();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not set');
  }

  try {
    // Get food data
    let foodData = { breakfast: false, lunch: false, dinner: false, snack1: false, snack2: false };
    try {
      const foodResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Food!A:Z',
      });
      
      const foodRows = foodResponse.data.values || [];
      const foodRow = foodRows.find(row => row[0] === participantId);
      if (foodRow) {
        foodData = {
          breakfast: foodRow[1] === 'TRUE',
          lunch: foodRow[2] === 'TRUE',
          dinner: foodRow[3] === 'TRUE',
          snack1: foodRow[4] === 'TRUE',
          snack2: foodRow[5] === 'TRUE',
        };
      }
    } catch (error) {
      console.warn('Food sheet not found or error reading:', error);
    }

    // Get games data
    let gamesData: any[] = [];
    try {
      const gamesResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Games!A:Z',
      });
      
      const gamesRows = gamesResponse.data.values || [];
      gamesData = gamesRows
        .filter(row => row[0] === participantId)
        .map(row => ({
          activity: row[1],
          action: row[2],
          timestamp: row[3]
        }));
    } catch (error) {
      console.warn('Games sheet not found or error reading:', error);
    }

    // Get bus data
    let busData: any[] = [];
    try {
      const busResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Bus!A:Z',
      });
      
      const busRows = busResponse.data.values || [];
      busData = busRows
        .filter(row => row[0] === participantId)
        .map(row => ({
          type: row[1],
          stop: row[2],
          timestamp: row[3]
        }));
    } catch (error) {
      console.warn('Bus sheet not found or error reading:', error);
    }

    return {
      food: foodData,
      games: gamesData,
      bus: busData
    };
  } catch (error) {
    console.error('Error getting participant tracking data:', error);
    throw error;
  }
} 