# NIMUN'26 Registration System

A comprehensive registration and tracking system for the NIMUN'26 conference, featuring participant management, QR code generation, attendance tracking, and analytics.

## 🏗️ Architecture

This system uses a **Backend/Frontend separation**:
- **Backend**: Express.js + Supabase (PostgreSQL) - API server
- **Frontend**: React + Vite - User interface

## 📁 Project Structure

```
NIMUN-Registration-System/
├── Backend/          # Express.js API server
│   ├── src/         # Source code
│   ├── db/          # Database schema
│   └── package.json
├── Frontend/         # React + Vite frontend
│   ├── src/         # Source code
│   ├── public/      # Static assets
│   └── package.json
├── public/           # Shared assets (logos, favicon)
└── generate_qrcodes.py  # QR code generation utility
```

## ✨ Features

### 🆔 Participant Management
- Auto-generated IDs with committee/council-specific prefixes
- Bulk CSV import
- Individual registration
- Participant CRUD operations

### 📱 QR Code System
- Transparent QR codes with custom color (#195F8C)
- Single and bulk QR generation
- QR code scanning (camera and manual input)

### 📊 Tracking & Analytics
- Attendance tracking (check-in/check-out)
- Food tracking (breakfast, lunch)
- Activity tracking
- Comments per participant and day
- Comprehensive analytics dashboard

### 🔐 Authentication & Access Control
- Role-based access (Admin and Member)
- Admin: Full access to all features
- Member: Scanner access only
- Secure token-based authentication

## 🚀 Quick Start

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed setup instructions.

### Prerequisites
- Node.js 18+
- Supabase account
- npm or yarn

### Installation

1. **Backend Setup:**
   ```bash
   cd Backend
   npm install
   cp .env.example .env  # Configure your Supabase credentials
   npm run dev
   ```

2. **Frontend Setup:**
   ```bash
   cd Frontend
   npm install
   npm run dev
   ```

3. **Database Setup:**
   - Create a Supabase project
   - Run the schema from `Backend/db/schema.sql`
   - See `Backend/SUPABASE_SETUP.md` for details

## 📚 Documentation

- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Complete setup instructions
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [Backend/README.md](./Backend/README.md) - Backend documentation
- [Frontend/README.md](./Frontend/README.md) - Frontend documentation

## 🔑 Default Credentials

- **Admin**: `admin` / `admin123` (configure in Backend/.env)
- **Member**: Member ID (e.g., `EX-01`) / `member123` (temporary)

## 🛠️ Development

- Backend runs on: `http://localhost:3001`
- Frontend runs on: `http://localhost:5173` (or 5174)

## 📝 License

Private project for NIMUN'26
