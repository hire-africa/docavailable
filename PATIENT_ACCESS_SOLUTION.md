# Patient Access Solution for Text Session History

## Overview

This document describes the implementation of a patient access system that allows patients to revisit their text session chat history without storing messages permanently in the database.

## Problem Statement

Patients need to:
- Revisit previous medical conversations for reference
- Export session transcripts for personal records
- Share session information with other healthcare providers
- Access medical advice and recommendations from past sessions

**Challenge**: How to provide this access while maintaining the ephemeral storage approach (no database persistence)?

## Solution: Multi-Tiered Access System

### Architecture Overview

The solution implements a **multi-tiered access system** with configurable retention periods:

1. **Active Session Storage**: Messages stored in cache during active sessions
2. **Patient Access Storage**: Extended retention in separate cache for patient access
3. **Temporary Access Tokens**: Shareable links for external access
4. **Export Functionality**: Downloadable session transcripts
5. **Configurable Retention**: Patient-controlled retention periods

### Key Features

#### 1. Extended Retention for Patients
- **Default**: 7 days retention for patient access
- **Configurable**: 1-30 days (patient-controlled)
- **Separate Storage**: Patient access cache separate from active session cache
- **Automatic Cleanup**: Messages automatically expire based on retention settings

#### 2. Temporary Access Tokens
- **Shareable Links**: Create temporary access URLs
- **Configurable Duration**: 1 hour to 7 days
- **Secure Access**: Token-based authentication
- **Revocable**: Patients can revoke access anytime

#### 3. Export Functionality
- **Session Transcripts**: Downloadable conversation history
- **Formatted Output**: Clean, readable format
- **Metadata Included**: Session details, timestamps, retention info
- **Share Integration**: Direct sharing to other apps

#### 4. Patient Control
- **Retention Management**: Patients set their own retention periods
- **Access Control**: Patients control who can access their sessions
- **Privacy Settings**: Granular control over data access

## Implementation Details

### 1. Enhanced Message Service

**File**: `backend/app/Services/TextSessionMessageService.php`

#### New Methods Added:

```php
// Patient Access Methods
public function getPatientAccessMessages(int $sessionId, int $patientId): array
public function setPatientRetention(int $patientId, int $days): bool
public function getPatientRetention(int $patientId): int
public function exportSessionForPatient(int $sessionId, int $patientId): ?array

// Temporary Access Methods
public function createTemporaryAccess(int $sessionId, int $patientId, int $hours = 24): string
public function validateTemporaryAccess(string $token): ?array
public function revokeTemporaryAccess(string $token): bool

// History Methods
public function getPatientSessionHistory(int $patientId): array
```

#### Storage Strategy:

1. **Active Cache**: `text_session_messages:{sessionId}` (1 hour TTL)
2. **Patient Access Cache**: `text_session_messages:patient_access:{sessionId}` (7 days TTL)
3. **Retention Settings**: `patient_retention:{patientId}` (1 year TTL)
4. **Temporary Tokens**: `temp_access:{token}` (configurable TTL)

### 2. New API Endpoints

**File**: `backend/routes/api.php`

```php
// Patient Access Routes
Route::get('/text-sessions/patient/history', [TextSessionController::class, 'getPatientHistory']);
Route::get('/text-sessions/{sessionId}/patient/messages', [TextSessionController::class, 'getSessionMessages']);
Route::get('/text-sessions/{sessionId}/export', [TextSessionController::class, 'exportSession']);
Route::post('/text-sessions/{sessionId}/temporary-access', [TextSessionController::class, 'createTemporaryAccess']);
Route::get('/text-sessions/{sessionId}/access/{token}', [TextSessionController::class, 'accessWithToken']);
Route::post('/text-sessions/retention', [TextSessionController::class, 'setRetentionPeriod']);
Route::get('/text-sessions/retention', [TextSessionController::class, 'getRetentionPeriod']);
Route::post('/text-sessions/revoke-access', [TextSessionController::class, 'revokeAccess']);
```

### 3. Frontend Component

**File**: `app/text-session-history.tsx`

Features:
- Session history listing
- Message viewing
- Export functionality
- Temporary access creation
- Retention period management

## Usage Examples

### 1. Patient Views Session History

```javascript
// Get patient's session history
const response = await apiService.get('/text-sessions/patient/history');
const history = response.data;

// Each session includes:
{
  session_id: 123,
  doctor_name: "Dr. Smith",
  started_at: "2024-01-15T10:00:00Z",
  ended_at: "2024-01-15T10:30:00Z",
  message_count: 25,
  retention_days: 7,
  accessible_until: "2024-01-22T10:30:00Z",
  has_access: true
}
```

### 2. Patient Views Session Messages

```javascript
// Get messages for a specific session
const response = await apiService.get('/text-sessions/123/patient/messages');
const sessionData = response.data;

// Response includes:
{
  session_id: 123,
  messages: [
    {
      id: "msg_123456",
      text: "Hello doctor, I have a question about my medication",
      sender: 1,
      timestamp: "2024-01-15T10:00:00Z",
      is_encrypted: true
    }
  ],
  retention_info: {
    retention_days: 7,
    accessible_until: "2024-01-22T10:30:00Z",
    message_count: 25
  }
}
```

### 3. Export Session

```javascript
// Export session for sharing/download
const response = await apiService.get('/text-sessions/123/export');
const exportData = response.data;

// Export includes:
{
  session_id: 123,
  exported_at: "2024-01-15T11:00:00Z",
  retention_until: "2024-01-22T10:30:00Z",
  message_count: 25,
  messages: [
    {
      id: "msg_123456",
      sender_id: 1,
      content: "Hello doctor, I have a question about my medication",
      timestamp: "2024-01-15T10:00:00Z",
      metadata: {}
    }
  ]
}
```

### 4. Create Temporary Access

```javascript
// Create shareable link
const response = await apiService.post('/text-sessions/123/temporary-access', {
  hours: 24
});

// Response includes:
{
  access_token: "access_abc123def456",
  expires_in_hours: 24,
  expires_at: "2024-01-16T11:00:00Z",
  access_url: "https://app.com/text-sessions/123/access/access_abc123def456"
}
```

### 5. Access with Token

```javascript
// Access session with temporary token
const response = await apiService.get('/text-sessions/123/access/access_abc123def456');

// Response includes:
{
  session: {
    id: 123,
    doctor_name: "Dr. Smith",
    started_at: "2024-01-15T10:00:00Z",
    ended_at: "2024-01-15T10:30:00Z"
  },
  messages: [...],
  access_info: {
    token: "access_abc123def456",
    created_at: "2024-01-15T11:00:00Z",
    expires_at: "2024-01-16T11:00:00Z",
    message_count: 25
  }
}
```

## Security & Privacy Features

### 1. Access Control
- **Patient Verification**: Only session participants can access messages
- **Token Validation**: Temporary tokens are validated and time-limited
- **Session Ownership**: Patients can only access their own sessions

### 2. Data Protection
- **Encryption**: All messages remain encrypted in cache
- **No Database Storage**: Messages never stored in database
- **Automatic Expiration**: Messages automatically deleted after retention period

### 3. Privacy Controls
- **Patient Control**: Patients control retention periods and access
- **Revocable Access**: Temporary access can be revoked anytime
- **Audit Trail**: All access attempts are logged (without content)

## Benefits

### For Patients
- ✅ **Easy Access**: Simple interface to view session history
- ✅ **Flexible Retention**: Control how long messages are kept
- ✅ **Export Capability**: Download sessions for personal records
- ✅ **Sharing Options**: Share sessions with other healthcare providers
- ✅ **Privacy Control**: Full control over data access

### For Healthcare Providers
- ✅ **Patient Empowerment**: Patients can reference past advice
- ✅ **Continuity of Care**: Easy access to previous consultations
- ✅ **Compliance**: Maintains medical privacy regulations
- ✅ **Efficiency**: Reduced need for repeated explanations

### For System
- ✅ **No Database Storage**: Maintains ephemeral storage approach
- ✅ **Scalable**: Cache-based storage scales efficiently
- ✅ **Secure**: End-to-end encryption maintained
- ✅ **Compliant**: Meets medical privacy requirements

## Configuration Options

### Retention Periods
- **Minimum**: 1 day
- **Maximum**: 30 days
- **Default**: 7 days
- **Patient Configurable**: Yes

### Temporary Access
- **Minimum Duration**: 1 hour
- **Maximum Duration**: 168 hours (7 days)
- **Default Duration**: 24 hours
- **Revocable**: Yes

### Storage Limits
- **Active Messages**: 100 per session
- **Patient Access Messages**: 200 per session
- **Automatic Cleanup**: Yes

## Monitoring & Analytics

### Metrics Tracked
- Session access frequency
- Export usage patterns
- Retention period preferences
- Temporary access creation/usage
- Cleanup job performance

### Logged Events
- Patient access attempts
- Export operations
- Temporary access creation/revocation
- Retention period changes
- Cleanup operations

## Future Enhancements

### 1. Advanced Export Options
- PDF format export
- Medical record integration
- Structured data export (JSON, XML)
- Custom formatting options

### 2. Enhanced Sharing
- Direct integration with healthcare systems
- Secure email sharing
- QR code generation for easy access
- Batch export for multiple sessions

### 3. Analytics Dashboard
- Patient usage analytics
- Session retention patterns
- Access frequency reports
- Privacy compliance reports

### 4. Integration Features
- EHR system integration
- Patient portal integration
- Mobile app notifications
- Calendar integration

## Conclusion

The patient access solution provides a comprehensive way for patients to revisit their text session history while maintaining the ephemeral storage approach. By using cache-based storage with configurable retention periods, temporary access tokens, and export functionality, we ensure that patients have the access they need without compromising security or privacy.

The system is designed to be:
- **Patient-Centric**: Puts patients in control of their data
- **Privacy-Compliant**: Maintains medical privacy standards
- **Technically Sound**: Uses efficient cache-based storage
- **User-Friendly**: Simple interface for accessing history
- **Flexible**: Configurable retention and access options

This solution successfully addresses the need for patient access to chat history while maintaining the core principle of not storing sensitive medical conversations in the database. 