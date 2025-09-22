# Patient Message Detection and Doctor Reply Timeout System

## Overview

This system automatically detects when patients send messages and monitors doctor replies within configurable time limits. It provides intelligent priority-based timeout handling and comprehensive notification management.

## Features

### 🔍 **Automatic Message Detection**
- Detects patient messages automatically
- Identifies doctor replies
- Tracks message priority levels
- Manages conversation flow

### ⏰ **Intelligent Timeout System**
- **Normal Messages**: 5-minute timeout
- **Urgent Messages**: 2-minute timeout  
- **Critical Messages**: 1-minute timeout
- Automatic priority detection based on keywords

### 📱 **Smart Notifications**
- Real-time doctor notifications
- Patient reply confirmations
- Timeout alerts with escalation
- Priority-based handling

### 📊 **Monitoring & Analytics**
- Real-time statistics
- Pending message tracking
- Timeout analytics
- Performance metrics

## System Architecture

```
Patient Message → Detection → Priority Analysis → Timeout Start → Doctor Notification
                                                                    ↓
Doctor Reply ← Timeout Monitoring ← Escalation (if timeout) ← Reminder System
```

## Configuration

### Timeout Settings
```javascript
const REPLY_TIMEOUT_CONFIG = {
  DEFAULT_TIMEOUT: 5 * 60 * 1000, // 5 minutes
  URGENT_TIMEOUT: 2 * 60 * 1000,  // 2 minutes
  CRITICAL_TIMEOUT: 1 * 60 * 1000 // 1 minute
};
```

### Priority Detection Keywords
```javascript
// Critical keywords
['emergency', 'urgent', 'help', 'pain', 'bleeding', 'can\'t breathe', 'chest pain']

// Urgent keywords  
['asap', 'soon', 'quick', 'important', 'worry', 'concern']
```

## API Endpoints

### Health Check
```
GET /health
```
Returns system health including detection statistics.

### Detection Statistics
```
GET /detection-stats
```
Returns all pending messages and active timeouts.

### Appointment Pending Messages
```
GET /pending-messages/{appointmentId}
```
Returns pending messages for specific appointment.

## Message Flow

### 1. Patient Sends Message
```javascript
// Message structure
{
  type: 'chat-message',
  message: {
    id: 'msg_123',
    sender_id: 'patient_456',
    message: 'I have chest pain',
    timestamp: '2024-01-01T10:00:00Z'
  }
}
```

### 2. Detection System Response
```javascript
// Detection triggers
- Priority analysis: 'critical' (chest pain detected)
- Timeout started: 1 minute
- Doctor notification sent
- Pending message stored
```

### 3. Doctor Reply Detection
```javascript
// Doctor reply structure
{
  type: 'chat-message', 
  message: {
    id: 'msg_124',
    sender_id: 'doctor_789',
    message: 'Please call 911 immediately',
    timestamp: '2024-01-01T10:00:30Z'
  }
}
```

### 4. Success Processing
```javascript
// Success response
- All pending messages marked as 'doctor_replied'
- Timeouts cleared
- Success notifications sent
- Statistics updated
```

## Timeout Handling

### Critical Timeout (1 minute)
- Emergency notification sent
- Escalation to supervisor
- Backup doctor contacted
- High-priority alerts

### Urgent Timeout (2 minutes)
- Reminder notification sent
- Supervisor notified
- Follow-up actions triggered

### Normal Timeout (5 minutes)
- Gentle reminder sent
- Standard follow-up process

## Client Integration

### Basic Setup
```javascript
import PatientMessageDetectionClient from './patient-message-detection-example.js';

const detectionClient = new PatientMessageDetectionClient(
  websocket,
  appointmentId,
  userId
);
```

### Sending Messages
```javascript
// Normal message
detectionClient.sendMessage('Hello doctor');

// Urgent message
detectionClient.sendUrgentMessage('I need help ASAP');

// Critical message
detectionClient.sendCriticalMessage('EMERGENCY: Severe pain!');
```

### Monitoring
```javascript
// Check pending messages
const pendingCount = detectionClient.getPendingMessagesCount();

// Get all pending messages
const pendingMessages = detectionClient.getPendingMessages();
```

## WebSocket Message Types

### From Server to Client
- `patient-message-pending`: New patient message detected
- `doctor-replied`: Doctor replied to patient
- `doctor-reply-success`: Reply sent within timeout
- `doctor-reply-timeout`: Reply timeout occurred

### Message Structure
```javascript
{
  type: 'patient-message-pending',
  messageId: 'msg_123',
  priority: 'critical',
  timeoutDuration: 60000,
  message: 'I have chest pain',
  timestamp: '2024-01-01T10:00:00Z'
}
```

## Database Schema

### Pending Messages Table
```sql
CREATE TABLE pending_patient_messages (
  id VARCHAR(255) PRIMARY KEY,
  appointment_id VARCHAR(255) NOT NULL,
  patient_id VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority ENUM('normal', 'urgent', 'critical') DEFAULT 'normal',
  status ENUM('waiting_for_doctor_reply', 'doctor_replied', 'doctor_reply_timeout') DEFAULT 'waiting_for_doctor_reply',
  timeout_duration INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  replied_at TIMESTAMP NULL,
  timeout_at TIMESTAMP NULL,
  reply_message_id VARCHAR(255) NULL
);
```

## Monitoring & Analytics

### Real-time Statistics
```javascript
// Get current stats
fetch('/detection-stats')
  .then(response => response.json())
  .then(stats => {
    console.log('Pending messages:', stats.pendingMessages.length);
    console.log('Active timeouts:', stats.activeTimeouts.length);
  });
```

### Key Metrics
- Response time averages
- Timeout rates by priority
- Doctor availability
- Patient satisfaction scores

## Error Handling

### Common Scenarios
1. **API Connection Failures**: Graceful degradation with local caching
2. **WebSocket Disconnections**: Automatic reconnection with state recovery
3. **Invalid Messages**: Validation and error responses
4. **Timeout Edge Cases**: Proper cleanup and notification

### Error Response Format
```javascript
{
  type: 'error',
  message: 'Failed to process message',
  code: 'PROCESSING_ERROR',
  timestamp: '2024-01-01T10:00:00Z'
}
```

## Testing

### Unit Tests
```javascript
// Test message detection
test('detects patient message correctly', () => {
  const message = { sender_id: 'patient_123', message: 'Hello' };
  expect(isPatientMessage('appointment_456', message)).toBe(true);
});

// Test priority detection
test('detects critical priority', () => {
  const message = { message: 'I have chest pain' };
  expect(determineMessagePriority(message)).toBe('critical');
});
```

### Integration Tests
```javascript
// Test complete flow
test('handles patient message to doctor reply flow', async () => {
  // Send patient message
  // Verify detection
  // Send doctor reply
  // Verify success processing
});
```

## Deployment

### Environment Variables
```bash
WEBRTC_SIGNALING_PORT=8080
API_BASE_URL=http://localhost:8000
API_AUTH_TOKEN=your-api-token
```

### Docker Deployment
```dockerfile
FROM node:18
COPY . /app
WORKDIR /app
RUN npm install
EXPOSE 8080
CMD ["node", "backend/webrtc-signaling-server.js"]
```

## Troubleshooting

### Common Issues

1. **Messages Not Detected**
   - Check appointment ID format
   - Verify user roles (patient/doctor)
   - Check API authentication

2. **Timeouts Not Working**
   - Verify timeout configuration
   - Check system clock synchronization
   - Monitor memory usage

3. **Notifications Not Sent**
   - Check notification service configuration
   - Verify user notification preferences
   - Test API connectivity

### Debug Commands
```bash
# Check server health
curl http://localhost:8080/health

# Get detection stats
curl http://localhost:8080/detection-stats

# Check specific appointment
curl http://localhost:8080/pending-messages/appointment_123
```

## Performance Considerations

### Memory Management
- Automatic cleanup of completed timeouts
- Periodic cleanup of old pending messages
- Efficient data structures for fast lookups

### Scalability
- Horizontal scaling with load balancers
- Database optimization for large message volumes
- Caching strategies for frequently accessed data

## Security

### Data Protection
- Message content encryption
- Secure WebSocket connections (WSS)
- API authentication and authorization
- Audit logging for compliance

### Privacy
- No message content stored permanently
- Automatic data cleanup
- GDPR compliance features

## Future Enhancements

### Planned Features
- Machine learning for priority detection
- Advanced analytics dashboard
- Mobile push notifications
- Integration with hospital systems
- Voice message detection
- Multi-language support

### API Versioning
- Version 1.0: Basic detection and timeout
- Version 1.1: Enhanced notifications
- Version 1.2: Analytics and reporting
- Version 2.0: AI-powered features

## Support

For technical support or questions about the detection system:
- Documentation: See this file
- Examples: Check `patient-message-detection-example.js`
- Issues: Report via GitHub issues
- Contact: [Your support contact]
