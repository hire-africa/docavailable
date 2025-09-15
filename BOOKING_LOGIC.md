# Booking Logic Documentation

## Overview
The system has two different booking mechanisms with different availability requirements:

## 1. Instant Chats (Text Sessions)
**Availability Requirement**: Doctor must be **ONLINE**

### How it works:
- Patients can only start instant text chats with doctors who have `is_online = true`
- This is controlled by the doctor's online status toggle in the Working Hours page
- Used for immediate, real-time communication

### API Endpoints:
- `GET /text-sessions/available-doctors` - Only returns online doctors
- `POST /text-sessions/start` - Validates doctor is online before starting

### Frontend Logic:
- Text session booking only shows doctors who are currently online
- If a doctor goes offline, they immediately disappear from the instant chat list

## 2. Appointments (Scheduled Sessions)
**Availability Requirement**: Doctor must be **APPROVED** and have **WORKING HOURS** set

### How it works:
- Patients can book appointments with any approved doctor
- Appointments are scheduled based on the doctor's working hours
- Doctor's online status doesn't affect appointment booking
- Used for scheduled consultations (text, voice, video)

### API Endpoints:
- `GET /available-doctors` - Returns all approved doctors (regardless of online status)
- `GET /doctors/active` - Returns all approved doctors for appointment booking
- `POST /appointments` - Creates appointment if doctor is approved

### Frontend Logic:
- Appointment booking shows all approved doctors
- Working hours are displayed to help patients choose suitable times
- Online status is shown but doesn't prevent booking

## Key Differences

| Feature | Instant Chats | Appointments |
|---------|---------------|--------------|
| **Availability** | Online doctors only | All approved doctors |
| **Timing** | Immediate/Real-time | Scheduled |
| **Purpose** | Quick questions/urgent care | Planned consultations |
| **Duration** | Flexible | Fixed time slots |
| **Online Status** | Required | Optional (shown but not required) |

## Technical Implementation

### Backend Filters:

**For Instant Chats:**
```php
$query->whereHas('doctorAvailability', function ($q) {
    $q->where('is_online', true);
});
```

**For Appointments:**
```php
$query->where('status', 'approved');
// No online status filter - all approved doctors can receive appointments
```

### Working Hours Logic:
- Appointments respect the doctor's working hours
- If a doctor has no working hours set, they won't appear in date-specific searches
- Working hours are independent of online status

## Example Scenarios

### Scenario 1: Doctor Online
- **Instant Chats**: ✅ Available
- **Appointments**: ✅ Available (if approved and has working hours)

### Scenario 2: Doctor Offline
- **Instant Chats**: ❌ Not available
- **Appointments**: ✅ Available (if approved and has working hours)

### Scenario 3: Doctor Pending Approval
- **Instant Chats**: ❌ Not available
- **Appointments**: ❌ Not available

### Scenario 4: Doctor Approved but No Working Hours
- **Instant Chats**: ✅ Available (if online)
- **Appointments**: ❌ Not available (no working hours set)

## Benefits of This Logic

1. **Instant Chats**: Ensures immediate response availability
2. **Appointments**: Allows flexible scheduling regardless of current online status
3. **Doctor Control**: Doctors can control their instant availability without affecting scheduled appointments
4. **Patient Experience**: Clear distinction between immediate and scheduled care options 