# JNIMUN'25 System Setup Guide

## Quick Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Environment File
Create a `.env.local` file with your Google Sheets credentials:

```env
# Google Sheets Configuration
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_CLIENT_EMAIL=
GOOGLE_SHEETS_PRIVATE_KEY=

# Next.js Configuration
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
```

### 3. Set Up Google Sheets API

1. **Create Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Google Sheets API:**
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

3. **Create Service Account:**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in service account details
   - Click "Create and Continue"

4. **Generate Key:**
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create New Key"
   - Choose "JSON" format
   - Download the key file

5. **Extract Credentials:**
   From the downloaded JSON file, extract:
   - `client_email` → `GOOGLE_SHEETS_CLIENT_EMAIL`
   - `private_key` → `GOOGLE_SHEETS_PRIVATE_KEY`

6. **Create Google Sheet:**
   - Create a new Google Sheet
   - Copy the sheet ID from the URL
   - Share the sheet with the service account email (Editor access)

### 4. Test the System

1. **Start Development Server:**
```bash
npm run dev
```

2. **Open Browser:**
Navigate to `http://localhost:3000`

3. **Test CSV Import:**
- Go to "Admin" > "Import CSV"
- Use the provided `sample_members.csv` file
- Download the template if you need a reference

## Features Included

✅ **Implemented:**
- ID generation with committee prefixes
- QR code generation (transparent background)
- Bulk CSV import functionality
- Google Sheets integration setup
- Data validation and error handling
- User-friendly web interface

📋 **Ready for Implementation:**
- Attendance tracking dashboard
- Food distribution management
- Game activity tracking
- Bus transportation logs
- Real-time updates

## File Structure

```
updated system/
├── src/
│   ├── app/                 # Next.js app directory
│   ├── components/          # React components
│   ├── lib/                 # Utility functions
│   └── types/              # TypeScript definitions
├── package.json            # Dependencies
├── README.md              # Full documentation
├── sample_members.csv     # Test data
└── setup.md              # This file
```

## CSV Import Testing

The `sample_members.csv` file contains real data from your existing system:
- 91 participants
- Various committees (Executive, Operations, Public Relations, etc.)
- Phone numbers and gender information

This data will automatically:
1. Generate appropriate IDs (EX-01, OP-02, PR-03, etc.)
2. Create QR codes for each participant
3. Validate phone number uniqueness
4. Map committee names to standard formats

## Next Steps

After basic setup:

1. **Customize Committee Mappings:** Update `src/lib/csvImport.ts` if needed
2. **Add Dashboard Features:** Implement attendance and tracking features
3. **Configure Production:** Set up production Google Sheets and deployment
4. **Add Authentication:** Implement user login if required

## Troubleshooting

**Common Issues:**

1. **"Cannot find module" errors:** Run `npm install`
2. **Google Sheets API errors:** Check credentials and sheet permissions
3. **CSV import fails:** Verify CSV format matches requirements
4. **QR codes not generating:** Check if react-qr-code is installed

**Support:**
Check the README.md for detailed documentation and examples. 