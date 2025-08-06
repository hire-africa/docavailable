# Doctor Wallet System

## Overview

The Doctor Wallet System automatically processes payments to doctors when sessions end or appointments are completed. The system tracks all earnings, withdrawals, and provides detailed transaction history.

## Payment Rates

| Session Type | Payment Amount (MWK) |
|--------------|---------------------|
| Text Session | 4,000 MWK |
| Audio Call   | 5,000 MWK |
| Video Call   | 6,000 MWK |

## How It Works

### Automatic Payment Processing

1. **Text Sessions**: When a text session ends (either manually or by expiration), the doctor automatically receives 4,000 MWK
2. **Appointments**: When an appointment is marked as completed, the doctor receives payment based on the appointment type
3. **Transaction Tracking**: All payments are logged with session details, patient information, and timestamps

### Database Structure

#### `doctor_wallets` Table
- `doctor_id`: Reference to the doctor
- `balance`: Current available balance
- `total_earned`: Total earnings since account creation
- `total_withdrawn`: Total amount withdrawn

#### `wallet_transactions` Table
- `doctor_id`: Reference to the doctor
- `type`: 'credit' (earnings) or 'debit' (withdrawal)
- `amount`: Transaction amount
- `description`: Human-readable description
- `session_type`: 'text', 'audio', or 'video'
- `session_id`: Reference to the session/appointment
- `session_table`: 'text_sessions' or 'appointments'
- `metadata`: Additional transaction data (JSON)

## API Endpoints

### For Doctors Only

#### Get Wallet Information
```http
GET /api/doctor/wallet
```
Returns current balance, total earnings, withdrawals, and payment rates.

#### Get Transaction History
```http
GET /api/doctor/wallet/transactions?per_page=15&type=credit
```
Returns paginated transaction history with optional filtering by type.

#### Get Earnings Summary
```http
GET /api/doctor/wallet/earnings-summary
```
Returns detailed earnings breakdown by session type and recent transactions.

#### Request Withdrawal
```http
POST /api/doctor/wallet/withdraw
Content-Type: application/json

{
    "amount": 5000.00,
    "bank_account": "1234567890",
    "bank_name": "Test Bank",
    "account_holder_name": "Dr. John Doe"
}
```

#### Get Payment Rates
```http
GET /api/doctor/wallet/payment-rates
```
Returns current payment rates for all session types.

## Commands

### Process Missed Payments
If any sessions were completed before the wallet system was implemented, you can process missed payments:

```bash
# Dry run to see what would be processed
php artisan payments:process-missed --dry-run

# Actually process the payments
php artisan payments:process-missed
```

### Cleanup Expired Sessions
Clean up expired text sessions (runs automatically):

```bash
php artisan text-sessions:cleanup
```

## Models and Services

### DoctorWallet Model
- `getOrCreate()`: Get or create wallet for a doctor
- `credit()`: Add earnings to wallet
- `debit()`: Process withdrawal from wallet
- `getRecentTransactions()`: Get recent transaction history
- `getEarningsByType()`: Get earnings breakdown by session type

### WalletTransaction Model
- Scopes: `credits()`, `debits()`, `completed()`
- Accessors: `formatted_amount`, `session_type_display`

### DoctorPaymentService
- `processTextSessionPayment()`: Process payment for text session
- `processAppointmentPayment()`: Process payment for appointment
- `getPaymentAmount()`: Get payment amount for session type
- `getPaymentAmounts()`: Get all payment rates

## Testing

Run the comprehensive test suite:

```bash
php artisan test --filter=DoctorWalletTest
```

Tests cover:
- Automatic wallet creation
- Payment processing for all session types
- Transaction history and earnings summary
- Withdrawal functionality
- Access control (doctors only)
- Payment rate validation

## Security Features

1. **Role-Based Access**: Only doctors can access wallet endpoints
2. **Transaction Validation**: All transactions are validated before processing
3. **Audit Trail**: Complete transaction history with metadata
4. **Database Transactions**: Atomic operations ensure data consistency
5. **Error Handling**: Comprehensive error handling and logging

## Integration Points

### Text Sessions
- Payment triggered when `endSession()` or `markAsExpired()` is called
- Automatic payment processing in `TextSession` model

### Appointments
- Payment triggered when `markAsCompleted()` is called
- Supports different payment rates based on appointment type

### Frontend Integration
The frontend can use the wallet API endpoints to:
- Display doctor earnings and balance
- Show transaction history
- Allow withdrawal requests
- Display payment rates and session information

## Future Enhancements

1. **Payment Gateway Integration**: Direct bank transfers
2. **Tax Calculation**: Automatic tax deductions
3. **Payment Scheduling**: Scheduled payments instead of immediate
4. **Multi-Currency Support**: Support for different currencies
5. **Advanced Analytics**: Detailed earnings reports and trends
6. **Notification System**: Email/SMS notifications for payments 