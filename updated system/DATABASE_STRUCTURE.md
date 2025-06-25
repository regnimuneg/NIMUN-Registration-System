# JNIMUN'25 Database Structure

## Overview
The system now uses a clean, separated database structure with dedicated sheets for different types of data.

## Sheet Structure

### 1. **Participants Sheet** (Basic Information Only)
Contains only basic participant information:
```
| ID | Name | Phone Number | Position | Gender | QR Data | Bus Route | Bus Stop |
```

**Example:**
```
| EX-01 | Zein Raafat | 01234567890 | Executive | Male | {...} | route-1 | Engineers Syndicate Club |
```

### 2. **Attendance Sheet** (Dedicated Attendance Tracking)
Tracks all attendance activities:
```
| Participant ID | Day Key | Field | Value | Timestamp |
```

**Example:**
```
| EX-01 | sessions.day1 | attended | TRUE | 2024-01-15T10:30:00Z |
| EX-01 | conference.day1 | attended | TRUE | 2024-01-16T09:00:00Z |
```

### 3. **Food Sheet** (Food Distribution Tracking)
Tracks food distribution:
```
| Participant ID | Breakfast | Lunch | Dinner | Snack1 | Snack2 |
```

### 4. **Games Sheet** (Games & Activities)
Tracks game participation:
```
| Participant ID | Activity | Action | Timestamp |
```

**Example:**
```
| EX-01 | Football | join | 2024-01-15T14:00:00Z |
| EX-01 | Football | leave | 2024-01-15T15:30:00Z |
```

### 5. **Bus Sheet** (Bus Transportation Tracking)
Tracks bus arrivals and departures:
```
| Participant ID | Type | Stop | Timestamp |
```

**Example:**
```
| EX-01 | arriving | Engineers Syndicate Club | 2024-01-15T08:00:00Z |
| EX-01 | departing | Engineers Syndicate Club | 2024-01-15T18:00:00Z |
```

### 6. **ActivityTracking Sheet** (Comprehensive Activity Log)
Comprehensive log of all activities:
```
| Participant ID | Activity Type | Activity Name | Status | Timestamp |
```

## Benefits of This Structure

### ✅ **Clean Separation**
- Basic participant info is separate from tracking data
- No interference between bus routes and attendance columns
- Each sheet has a clear, focused purpose

### ✅ **Scalability**
- Easy to add new tracking types without affecting existing data
- No column limit issues
- Better performance for large datasets

### ✅ **Data Integrity**
- Bus route and stop information is properly stored
- Attendance data is tracked independently
- No data conflicts or overwrites

### ✅ **Easy Management**
- Clear structure for admins to understand
- Simple to export/import specific data types
- Better for analytics and reporting

## CSV Import Format

For importing participants with bus information:
```csv
Full Name,Gender,Phone Number,Committee,Line,Stop
Zein Raafat,Male,01234567890,Executive,6th of October,Engineers Syndicate Club
Abdallah Emam,Male,01987654321,Executive,5th Settlement,Waterway Mall
Ahmed Hassan,Male,01555123456,Public Relations,,
```

## Supported Bus Routes

1. **6th of October** (route-1)
2. **5th Settlement** (route-2)  
3. **Sheikh Zayed** (route-3)
4. **Feisal** (route-4)
5. **Maadi** (route-5)

## Migration Notes

- All existing attendance data will be migrated to the new Attendance sheet
- Bus route/stop data will now be properly saved and displayed
- Participants without bus assignments will show "No Bus Transportation" message
- Legacy systems are maintained for backward compatibility where needed 