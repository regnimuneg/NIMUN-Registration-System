# JNIMUN'25 Registration & Tracking System

A comprehensive Next.js-based registration and tracking system for the JNIMUN'25 conference, featuring automatic ID generation, QR code creation, and Google Sheets integration.

## ✨ Features

### 🆔 ID & QR Code Generator
- **Auto-generated IDs** with committee-specific prefixes:
  - IC-XX: ICJ Delegates
  - OS-XX: UNOOSA Delegates
  - DC-XX: DISEC Delegates
  - PS-XX: Press Delegates
  - UW-XX: UN Women Delegates
  - OD-XX: UNODC Delegates
  - MD-XX: Media Members
  - OP-XX: Operations Members
  - RG-XX: Registration Members
  - SO-XX: Socials Members
  - PR-XX: Public Relations Members
  - EX-XX: Executives

- **Transparent QR codes** for easy printing and integration
- **Bulk CSV import** with automatic ID and QR generation

### 📊 Google Sheets Integration
- Real-time data synchronization with Google Sheets
- Automatic sheet creation and management
- Secure API integration using service accounts

### 📅 Attendance Tracking
- Session 1-4 tracking
- Conference 1-3 tracking
- Performance Day attendance
- Opening Day attendance
- Toggle-based marking system

### 🍽️ Food Tracking
- Breakfast distribution tracking
- Lunch distribution tracking
- Duplicate prevention system
- Daily food consumption reports

### 🎮 Game Activity Tracker
- Support for multiple game types:
  - PR G1 / PR G2
  - General Court 1 / 2
  - Padel Court 1 / 2
  - Football Court
- Timer-based activity tracking
- Participant game history

### 🚌 Bus Transportation Tracker
- "Came via bus" / "Left via bus" tracking
- Per-session transportation logs
- Daily transportation reports

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Cloud Platform account with Sheets API enabled

### Installation

1. **Clone or navigate to the project directory:**
```bash
cd "updated system"
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
Create a `.env.local` file in the root directory:
```env
# Google Sheets Configuration
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_CLIENT_EMAIL=your_service_account_email_here
GOOGLE_SHEETS_PRIVATE_KEY=your_private_key_here

# Next.js Configuration
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
```

4. **Set up Google Sheets API:**
   - Create a Google Cloud Platform project
   - Enable the Google Sheets API
   - Create a service account and download the JSON key
   - Share your Google Sheet with the service account email
   - Extract the credentials from the JSON key for the environment variables

5. **Run the development server:**
```bash
npm run dev
```

6. **Open your browser:**
Visit `http://localhost:3000` to access the system.

## 📁 Project Structure

```
src/
├── app/
│   ├── admin/
│   │   └── import/          # Bulk CSV import page
│   ├── api/
│   │   └── import/          # Import API endpoints
│   ├── globals.css          # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Homepage
├── components/
│   └── QRCodeGenerator.tsx  # QR code components
├── lib/
│   ├── csvImport.ts         # CSV parsing and validation
│   ├── googleSheets.ts      # Google Sheets integration
│   ├── idGenerator.ts       # ID generation logic
│   └── qrHelper.ts          # QR code utilities
└── types/
    └── participant.ts       # TypeScript interfaces
```

## 📥 Bulk CSV Import

The system supports bulk import of participant data from CSV files with the following format:

### Required CSV Columns:
- **Full Name**: Participant's full name
- **Gender**: Must be "Male" or "Female"
- **Phone Number**: Unique phone number
- **Committee**: Committee/position name

### Example CSV:
```csv
Full Name,Gender,Phone Number,Committee
John Smith,Male,01234567890,Executive
Jane Doe,Female,01987654321,Operations
Ahmed Hassan,Male,01555123456,Public Relations
```

### Supported Committee Names:
The system automatically maps various committee name formats to standard types:
- Executive, Exec → Executive (EX-XX)
- Operations, Ops → Operations (OP-XX)
- Registration Affairs, Registration → Registration Affairs (RG-XX)
- Public Relations, PR → Public Relations (PR-XX)
- Media & Design, Media, Design → Media & Design (MD-XX)
- Socials, Social → Socials (SO-XX)
- ICJ Delegates, ICJ → ICJ Delegates (IC-XX)
- And more...

### Import Process:
1. Upload your CSV file
2. Preview the parsed data
3. Review any validation errors
4. Confirm the import
5. IDs and QR codes are automatically generated
6. Data is saved to Google Sheets

## 🔧 API Endpoints

### POST `/api/import`
Handles bulk import of participants from CSV files.

**Request:** Multipart form data with CSV file
**Response:** Import results including success/failure counts and any errors

## 🎨 UI Components

### QRCodeGenerator
Generates transparent QR codes with download functionality.

```tsx
<QRCodeGenerator
  value={qrData}
  size={256}
  participantId="EX-01"
  bgColor="transparent"
/>
```

### QRCodeDisplay
Complete QR display with participant information.

```tsx
<QRCodeDisplay
  qrData={participantQRData}
  participantId="EX-01"
  size={200}
/>
```

## 🛠️ Technology Stack

- **Frontend:** Next.js 14, React, TypeScript
- **Styling:** Tailwind CSS
- **Database:** Google Sheets (via Google Sheets API v4)
- **QR Codes:** react-qr-code
- **File Processing:** Built-in File API and CSV parsing
- **Authentication:** NextAuth.js (optional)

## 📋 TODO

- [ ] Dashboard implementation
- [ ] Real-time attendance tracking
- [ ] Food distribution management
- [ ] Game activity tracking with timers
- [ ] Bus transportation logging
- [ ] Export functionality
- [ ] User authentication
- [ ] Mobile-responsive QR scanner

## 🤝 Contributing

1. Follow the existing code style
2. Add TypeScript types for new features
3. Test CSV import functionality thoroughly
4. Ensure Google Sheets integration works correctly

## 📄 License

This project is created for JNIMUN'25 conference management.

---

**Note:** Remember to keep your Google Sheets API credentials secure and never commit them to version control. Use environment variables for all sensitive information. 