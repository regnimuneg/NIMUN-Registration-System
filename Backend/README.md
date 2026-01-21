# NIMUN'26 Backend API

Express.js backend API for the NIMUN Registration System using Supabase (PostgreSQL).

## 🚀 Setup

### Prerequisites
- Node.js 18+
- Supabase account and project
- PostgreSQL database (via Supabase)

### Installation

1. **Install dependencies:**
```bash
cd Backend
npm install
```

2. **Set up environment variables:**
Create a `.env` file in the `Backend` folder:
```env
# Supabase Database Configuration
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
FRONTEND_URL=http://localhost:5173

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

3. **Set up database:**
Run the schema SQL file in your Supabase SQL editor:
```bash
# Copy the contents of Backend/db/schema.sql and run in Supabase SQL editor
```

4. **Run the development server:**
```bash
npm run dev
```

The server will start on `http://localhost:3001`

## 📡 API Endpoints

### Health Check
- `GET /health` - Check server and database status

### Participants
- `GET /api/participants` - Get all participants
- `GET /api/participants/:id` - Get single participant
- `GET /api/participants/:id/tracking` - Get participant tracking data
- `GET /api/participants/:id/history` - Get participant history
- `DELETE /api/participants/:id` - Delete participant
- `DELETE /api/participants` - Delete all participants

### Registration
- `POST /api/register` - Register new participant

### Import
- `POST /api/import` - Bulk CSV import

### Tracking
- `POST /api/attendance` - Update attendance
- `POST /api/food` - Update food tracking
- `POST /api/games` - Update game activity
- `GET /api/games/current-players` - Get current players in games
- `POST /api/bus` - Update bus tracking

### QR Codes
- `POST /api/qr/generate` - Generate QR code
- `POST /api/qr/bulk` - Bulk QR generation
- `POST /api/qr/external-scan` - External QR scanning

### Analytics
- `GET /api/analytics` - Get analytics data

### Authentication
- `POST /api/auth/login` - Admin login

## 🗄️ Database Schema

The database schema is defined in `Backend/db/schema.sql` and includes:
- `users` - Base user information
- `delegates` - Delegate participants
- `members` - Staff/committee members
- `attendance_records` - Attendance tracking
- `food_history` - Food distribution tracking
- `activity_timeline` - Activity logging
- `vouchers` - Voucher system (optional)
- `voucher_claims` - Voucher claims (optional)

## 🔧 Development

```bash
# Development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 📝 Notes

- The backend uses Supabase (PostgreSQL) as the database
- All API routes are prefixed with `/api`
- CORS is configured to allow requests from the frontend URL
- Environment variables should be set in `.env` file
