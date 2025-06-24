# JNIMUN'25 Registration System - Setup Guide

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/adhamabdelaal2313/JNIMUN-25-Registration-System
cd JNIMUN-25-Registration-System
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Required Configuration

#### A. Google Sheets Integration Setup
1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one

2. **Enable Google Sheets API**:
   - In the Cloud Console, go to "APIs & Services" > "Library"
   - Search for "Google Sheets API" and enable it

3. **Create Service Account**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the service account details
   - Download the JSON key file

4. **Configure Service Account Key**:
   - Place the downloaded JSON file in the root directory
   - The filename should match the pattern: `*-service-account-*.json`
   - Update `src/lib/googleSheets.ts` if needed to match your filename

5. **Google Sheets Setup**:
   - Create a Google Sheet for participant data
   - Share the sheet with your service account email (found in the JSON file)
   - Give the service account "Editor" permissions

#### B. Admin Authentication Setup
Create `admin_creds.txt` in the root directory:
```
username=admin
password=your_secure_password_here
```
⚠️ **Change the default password for security!**

#### C. Environment Variables (Optional)
Create `.env.local` for additional configuration:
```bash
NEXTAUTH_SECRET=your_random_secret_here
NEXTAUTH_URL=http://localhost:3000
GOOGLE_SHEET_ID=your_google_sheet_id_here
```

### 4. Run the Application
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 📱 System Features

- **📷 Mobile QR Scanner**: Native camera integration optimized for mobile devices
- **👥 Participant Management**: Registration, import, and tracking
- **📊 Attendance Tracking**: Day-by-day attendance monitoring
- **🍽️ Food Tracking**: Meal tracking (breakfast, lunch, etc.)
- **🎮 Games & Activities**: Participation tracking for events
- **🚌 Bus Transportation**: Route and stop tracking
- **📈 Admin Dashboard**: Comprehensive management interface
- **📋 Data Import/Export**: CSV import and Google Sheets integration

## 🔐 Security Notes

- Keep your Google Service Account key secure and never commit it to version control
- Change default admin credentials immediately
- Use HTTPS in production
- The repository excludes all sensitive files via `.gitignore`

## 📂 Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── admin/          # Admin dashboard pages
│   ├── api/            # API routes
│   ├── member/         # Member/scanner pages
│   └── page.tsx        # Home page
├── components/         # Reusable React components
├── lib/               # Utility libraries
└── types/             # TypeScript type definitions
```

## 🛠️ Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Features
1. Follow the existing code structure
2. Add new API routes in `src/app/api/`
3. Create reusable components in `src/components/`
4. Update types in `src/types/` as needed

## 🐛 Troubleshooting

### Common Issues

1. **Camera not working on mobile**:
   - Ensure HTTPS in production
   - Check browser permissions
   - Try the external QR API option

2. **Google Sheets connection failed**:
   - Verify service account key is correctly placed
   - Check sheet sharing permissions
   - Ensure Google Sheets API is enabled

3. **Build errors**:
   - Run `npm install` to ensure all dependencies are installed
   - Check for TypeScript errors with `npm run lint`

## 📞 Support

If you encounter issues:
1. Check this setup guide thoroughly
2. Verify all configuration files are properly set up
3. Check the browser console for error messages
4. Ensure all required APIs are enabled in Google Cloud

## 🔄 Updates

To update the system:
```bash
git pull origin main
npm install  # Install any new dependencies
npm run build  # Rebuild if needed
```

---

**⚠️ Important**: This system handles sensitive participant data. Always follow proper security practices and data protection regulations. 