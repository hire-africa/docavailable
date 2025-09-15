# Session Payment and Deduction System

## Overview

The Session Payment and Deduction System ensures that when sessions end, both the doctor receives payment AND the patient's subscription plan gets deducted appropriately. This creates a balanced financial flow where doctors are rewarded for their services and patients' plans are consumed based on the session type.

## How It Works

### 1. Session Types and Payment Rates

| Session Type | Doctor Payment (MWK) | Patient Deduction |
|--------------|---------------------|-------------------|
| Text Session | 4,000 MWK | 1 text session |
| Audio Call   | 5,000 MWK | 1 voice call |
| Video Call   | 6,000 MWK | 1 video call |

### 2. Payment Processing Flow

When a session ends (either manually or automatically), the system:

1. **Updates Session Status**: Marks the session/appointment as completed
2. **Processes Doctor Payment**: Credits the doctor's wallet with the appropriate amount
3. **Deducts Patient Plan**: Reduces the patient's subscription based on session type
4. **Logs Transaction**: Records both the payment and deduction for audit purposes

### 3. Implementation Details

#### DoctorPaymentService

The `DoctorPaymentService` now includes comprehensive methods:

- `processSessionEnd(TextSession $session)`: Handles text session completion
- `processAppointmentEnd(Appointment $appointment)`: Handles appointment completion
- `deductFromPatientSubscription(TextSession $session)`: Deducts from patient's text sessions
- `deductFromPatientSubscriptionForAppointment(Appointment $appointment)`: Deducts based on appointment type

#### Response Format

Both payment processing methods return a detailed result array:

```php
[
    'doctor_payment_success' => true/false,
    'patient_deduction_success' => true/false,
    'doctor_payment_amount' => 4000.00,
    'patient_sessions_deducted' => 1,
    'errors' => []
]
```

### 4. Error Handling

The system gracefully handles various error scenarios:

- **No Patient Subscription**: Doctor still gets paid, patient deduction fails
- **Inactive Subscription**: Doctor still gets paid, patient deduction fails
- **No Sessions Remaining**: Doctor still gets paid, patient deduction fails
- **Database Errors**: Both operations may fail, errors are logged

### 5. API Endpoints

#### End Text Session
```http
POST /api/text-sessions/{id}/end
```

**Response:**
```json
{
    "success": true,
    "message": "Session ended successfully",
    "data": {
        "session": {...},
        "payment_processing": {
            "doctor_payment_success": true,
            "patient_deduction_success": true,
            "doctor_payment_amount": 4000.00,
            "patient_sessions_deducted": 1,
            "errors": []
        }
    }
}
```

#### End Appointment Session
```http
POST /api/appointments/{id}/end-session
```

**Response:**
```json
{
    "success": true,
    "message": "Session ended successfully",
    "data": {
        "appointment": {...},
        "payment_processing": {
            "doctor_payment_success": true,
            "patient_deduction_success": true,
            "doctor_payment_amount": 5000.00,
            "patient_sessions_deducted": 1,
            "errors": []
        }
    }
}
```

### 6. Database Changes

No new database tables are required. The system uses existing tables:

- `doctor_wallets`: Stores doctor earnings
- `wallet_transactions`: Records payment transactions
- `subscriptions`: Tracks patient plan usage
- `text_sessions`: Text session data
- `appointments`: Appointment data

### 7. Command Line Tools

#### Process Missed Payments and Deductions

```bash
# Dry run to see what would be processed
php artisan payments:process-missed --dry-run

# Actually process missed payments and deductions
php artisan payments:process-missed
```

This command finds sessions/appointments that ended without proper payment processing and handles both doctor payments and patient deductions.

### 8. Testing

Comprehensive tests are included in `SessionPaymentAndDeductionTest.php`:

- Text session payment and deduction
- Appointment payment and deduction
- Correct session type deduction (video calls deduct video sessions, etc.)
- Error handling for patients without subscriptions
- Error handling for inactive subscriptions

### 9. Logging

The system logs all payment and deduction activities:

- Successful doctor payments
- Successful patient deductions
- Failed payment attempts
- Failed deduction attempts
- Error details for debugging

### 10. Security Considerations

- Only patients can end their own sessions
- Only doctors and patients involved in a session can end it
- All payment operations are logged for audit trails
- Database transactions ensure data consistency

### 11. Migration from Old System

The old system only processed doctor payments. To migrate existing data:

1. Run the missed payments command to process existing sessions
2. The command will handle both payments and deductions
3. No data loss occurs - existing payments are preserved
4. Patient deductions are processed retroactively where possible

### 12. Monitoring

Monitor the system using:

- Payment processing logs
- Deduction processing logs
- Doctor wallet balances
- Patient subscription usage
- Error rates and types

## Benefits

1. **Balanced Financial Flow**: Both doctors and patients are properly accounted for
2. **Transparency**: Clear logging of all financial transactions
3. **Error Resilience**: System continues to work even if one part fails
4. **Audit Trail**: Complete record of all payments and deductions
5. **Flexibility**: Handles different session types appropriately
6. **Backward Compatibility**: Existing functionality is preserved 