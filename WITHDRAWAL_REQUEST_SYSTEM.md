# Withdrawal Request System Implementation

## Overview

The withdrawal request system has been implemented to replace the direct withdrawal functionality. Now doctors request withdrawals and the finance team (admins) approve and process payments instead of doctors directly withdrawing funds.

## Key Changes Made

### 1. Database Changes

#### New Migration: `withdrawal_requests` Table
- `id`: Primary key
- `doctor_id`: Reference to the doctor
- `amount`: Requested withdrawal amount
- `status`: 'pending', 'approved', 'rejected', 'paid'
- `bank_account`: Doctor's bank account number
- `bank_name`: Doctor's bank name
- `account_holder_name`: Account holder name
- `rejection_reason`: Reason if rejected
- `approved_at`: Timestamp when approved
- `paid_at`: Timestamp when paid
- `approved_by`: Admin who approved
- `paid_by`: Admin who marked as paid
- `payment_details`: JSON field for additional payment info

### 2. Backend Changes

#### New Model: `WithdrawalRequest`
- Status constants and scopes
- Relationships with doctor, approver, and payer
- Helper methods for status validation
- Formatted display methods

#### Updated Controller: `DoctorWalletController`
- Modified `requestWithdrawal()` to create withdrawal requests instead of direct withdrawals
- Added `getWithdrawalRequests()` method for doctors to view their requests
- Updated validation and error handling

#### New Controller: `WithdrawalRequestController` (Admin)
- `index()`: Get all withdrawal requests with filtering
- `show()`: Get specific request details
- `approve()`: Approve a withdrawal request
- `reject()`: Reject a withdrawal request with reason
- `markAsPaid()`: Mark request as paid and process actual withdrawal
- `getStats()`: Get withdrawal request statistics

#### New Service: `WithdrawalRequestService`
- Business logic for creating, approving, rejecting, and paying requests
- Validation methods
- Statistics and reporting methods
- Logging for audit trail

### 3. Frontend Changes

#### New Service: `withdrawalRequestService.ts`
- API calls for both doctors and admins
- TypeScript interfaces for type safety
- Helper methods for formatting and display

#### Updated Page: `doctor-withdrawals.tsx`
- Changed from direct withdrawal to request submission
- Added withdrawal request form with bank details
- Shows withdrawal request history instead of transactions
- Status indicators and rejection reasons display

#### New Page: `admin-withdrawal-requests.tsx`
- Admin interface for managing withdrawal requests
- Statistics dashboard
- Approval/rejection functionality
- Payment processing interface
- Filtering and search capabilities

#### Updated Admin Dashboard
- Added link to withdrawal requests in payments tab
- Payment oversight section

### 4. API Routes

#### Doctor Routes
- `GET /doctor/wallet/withdrawal-requests`: Get doctor's withdrawal requests
- `POST /doctor/wallet/withdraw`: Submit withdrawal request (updated)

#### Admin Routes
- `GET /admin/withdrawal-requests`: Get all withdrawal requests
- `GET /admin/withdrawal-requests/stats`: Get statistics
- `GET /admin/withdrawal-requests/{id}`: Get specific request
- `POST /admin/withdrawal-requests/{id}/approve`: Approve request
- `POST /admin/withdrawal-requests/{id}/reject`: Reject request
- `POST /admin/withdrawal-requests/{id}/mark-as-paid`: Mark as paid

## Workflow

### 1. Doctor Submits Withdrawal Request
1. Doctor navigates to withdrawal page
2. Fills out withdrawal form with amount and bank details
3. System validates amount against available balance
4. Creates withdrawal request with 'pending' status
5. Doctor receives confirmation message

### 2. Admin Reviews Requests
1. Admin navigates to withdrawal requests page
2. Views pending requests with doctor and bank details
3. Reviews request amount and doctor's earnings
4. Can approve, reject, or request more information

### 3. Admin Approves Request
1. Admin clicks "Approve" button
2. System updates request status to 'approved'
3. Records approval timestamp and admin
4. Doctor receives notification (TODO: implement notifications)

### 4. Admin Processes Payment
1. Admin clicks "Mark as Paid" button
2. System validates doctor has sufficient balance
3. Creates withdrawal transaction from doctor's wallet
4. Updates request status to 'paid'
5. Records payment details and timestamp
6. Doctor receives payment notification

### 5. Admin Rejects Request
1. Admin clicks "Reject" button
2. Admin provides rejection reason
3. System updates request status to 'rejected'
4. Doctor receives rejection notification with reason

## Benefits

### For Doctors
- Clear visibility into withdrawal request status
- Detailed bank information tracking
- Rejection reasons for transparency
- No immediate balance deduction until approved

### For Finance Team
- Control over withdrawal approvals
- Ability to review and validate requests
- Audit trail for all withdrawal activities
- Payment processing oversight
- Statistics and reporting capabilities

### For System
- Better financial control
- Reduced fraud risk
- Improved audit trail
- Scalable payment processing

## Security Features

1. **Role-Based Access**: Only admins can approve/reject/pay requests
2. **Validation**: Amount validation against available balance
3. **Audit Trail**: Complete logging of all actions
4. **Database Transactions**: Atomic operations for data consistency
5. **Input Validation**: Proper validation of all inputs

## Status Flow

```
PENDING → APPROVED → PAID
    ↓
REJECTED
```

- **PENDING**: Initial state when doctor submits request
- **APPROVED**: Admin has approved the request
- **REJECTED**: Admin has rejected the request with reason
- **PAID**: Admin has processed the payment

## Future Enhancements

1. **Email Notifications**: Send emails to doctors on status changes
2. **SMS Notifications**: Send SMS for urgent updates
3. **Payment Gateway Integration**: Direct bank transfers
4. **Bulk Operations**: Approve/reject multiple requests at once
5. **Advanced Filtering**: More sophisticated search and filter options
6. **Export Functionality**: Export reports to CSV/PDF
7. **Automated Approvals**: Auto-approve requests under certain conditions
8. **Payment Scheduling**: Schedule payments for specific dates

## Testing

The system includes comprehensive validation:
- Amount validation against available balance
- Bank details validation
- Status transition validation
- Admin permission validation
- Error handling and user feedback

## Migration Notes

To implement this system:

1. Run the migration: `php artisan migrate`
2. Update existing withdrawal functionality to use request system
3. Test the workflow with sample data
4. Train finance team on new interface
5. Monitor system for any issues

## API Response Examples

### Submit Withdrawal Request
```json
{
  "success": true,
  "message": "Withdrawal request submitted successfully. It will be reviewed by the finance team within 1-2 business days.",
  "data": {
    "request_id": 1,
    "amount": 5000.00,
    "status": "pending"
  }
}
```

### Get Withdrawal Requests (Doctor)
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": 1,
        "amount": 5000.00,
        "status": "pending",
        "bank_name": "Test Bank",
        "account_holder_name": "Dr. John Doe",
        "created_at": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### Approve Request Response
```json
{
  "success": true,
  "message": "Withdrawal request approved successfully",
  "data": {
    "id": 1,
    "status": "approved",
    "approved_at": "2024-01-15T11:00:00Z",
    "approved_by": 1
  }
}
```

This implementation provides a robust, secure, and user-friendly withdrawal request system that gives the finance team full control over doctor payments while maintaining transparency and audit trails.