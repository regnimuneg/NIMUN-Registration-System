# NIMUN'26 Frontend

React + Vite frontend for the NIMUN Registration System.

## 🚀 Setup

### Prerequisites
- Node.js 18+
- Backend API running (see Backend/README.md)

### Installation

1. **Install dependencies:**
```bash
cd Frontend
npm install
```

2. **Set up environment variables:**
Create a `.env` file in the `Frontend` folder:
```env
VITE_API_URL=http://localhost:3001
```

3. **Run the development server:**
```bash
npm run dev
```

The frontend will start on `http://localhost:5173`

## 📁 Project Structure

```
Frontend/
├── src/
│   ├── app/              # App component and routing
│   ├── features/         # Feature pages
│   │   ├── auth/         # Authentication
│   │   ├── dashboard/    # Dashboard pages
│   │   └── registration/ # Registration pages
│   ├── layouts/          # Layout components
│   ├── lib/              # Utilities and API client
│   └── types/            # TypeScript types
```

## 🎨 Features

- **Dashboard** - Main admin dashboard with participant management
- **QR Scanner** - Scan participant QR codes
- **Registration** - Register new participants
- **Import** - Bulk CSV import
- **Tracking** - Attendance, food, games, and bus tracking
- **Analytics** - View analytics and reports

## 🔧 Development

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📝 Notes

- The frontend connects to the Backend API
- Make sure the Backend is running before starting the frontend
- API URL is configured via `VITE_API_URL` environment variable
