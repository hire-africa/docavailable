# Paychangu Payment Integration Guide

## Overview

This guide outlines the complete integration of Paychangu as the payment service provider for DocAvailable. Paychangu is a mobile money payment gateway that supports various payment methods including mobile money, bank transfers, and card payments.

## Prerequisites

1. **Paychangu Account Setup**
   - Sign up for a Paychangu merchant account
   - Complete merchant verification process
   - Get your API credentials from the Paychangu dashboard

2. **Required Credentials**
   - API Key
   - Secret Key
   - Merchant ID
   - Webhook Secret
   - Public Key (for frontend)

## Configuration Steps

### 1. Environment Variables Setup

#### Frontend (.env file)
```env
# Paychangu Configuration
PAYCHANGU_API_KEY=your_paychangu_api_key_here
PAYCHANGU_SECRET_KEY=your_paychangu_secret_key_here
PAYCHANGU_MERCHANT_ID=your_paychangu_merchant_id_here
PAYCHANGU_WEBHOOK_SECRET=your_paychangu_webhook_secret_here
PAYCHANGU_ENVIRONMENT=sandbox
EXPO_PUBLIC_PAYCHANGU_PUBLIC_KEY=your_paychangu_public_key_here
```

#### Backend (.env file)
```env
# Paychangu Payment Gateway Configuration
PAYCHANGU_API_KEY=your_paychangu_api_key_here
PAYCHANGU_SECRET_KEY=your_paychangu_secret_key_here
PAYCHANGU_MERCHANT_ID=your_paychangu_merchant_id_here
PAYCHANGU_WEBHOOK_SECRET=your_paychangu_webhook_secret_here
PAYCHANGU_ENVIRONMENT=sandbox
```

### 2. Database Migration

Run the migration to create the payment transactions table:

```bash
cd backend
php artisan migrate
```

### 3. Webhook Configuration

In your Paychangu dashboard, configure the webhook URL:
```
https://your-domain.com/api/payments/webhook
```

## Implementation Details

### Frontend Integration

#### 1. Paychangu Service (`services/paychanguService.ts`)
- Handles payment initiation
- Manages payment status checking
- Processes webhook data
- Handles refunds

#### 2. Updated Payment Service (`services/paymentService.ts`)
- Integrates with Paychangu service
- Maintains backward compatibility
- Handles payment flow

#### 3. Payment Modal Updates (`components/PaymentModal.tsx`)
- Supports Paychangu payment flow
- Handles payment URLs
- Shows payment status

### Backend Integration

#### 1. Payment Controller (`backend/app/Http/Controllers/PaymentController.php`)
- Processes webhooks
- Verifies signatures
- Updates payment status
- Manages subscriptions

#### 2. Payment Transaction Model (`backend/app/Models/PaymentTransaction.php`)
- Stores payment data
- Tracks payment status
- Links to users and subscriptions

#### 3. Database Schema
- `payment_transactions` table
- Stores transaction details
- Tracks webhook data

## Payment Flow

### 1. Payment Initiation
1. User selects subscription plan
2. Enters phone number
3. Frontend calls Paychangu API
4. Paychangu returns payment URL
5. User completes payment

### 2. Webhook Processing
1. Paychangu sends webhook to backend
2. Backend verifies signature
3. Updates payment status
4. Activates user subscription
5. Sends confirmation

### 3. Status Checking
1. Frontend polls payment status
2. Backend checks with Paychangu
3. Updates UI accordingly

## API Endpoints

### Frontend
- `paymentService.processPayment()` - Initiate payment
- `paymentService.checkPaymentStatus()` - Check status
- `paymentService.refundPayment()` - Process refund

### Backend
- `POST /api/payments/webhook` - Paychangu webhook
- `GET /api/payments/status` - Check payment status

## Error Handling

### Common Errors
1. **Invalid Phone Number** - Validate Malawi phone format
2. **Insufficient Funds** - User needs to add money to mobile wallet
3. **Network Issues** - Retry mechanism implemented
4. **Webhook Verification Failed** - Check webhook secret

### Error Responses
```json
{
  "success": false,
  "error": "Payment failed - insufficient funds",
  "transactionId": "TXN_1234567890"
}
```

## Testing

### Sandbox Environment
1. Use Paychangu sandbox credentials
2. Test with sandbox phone numbers
3. Verify webhook processing
4. Test payment status checking

### Production Environment
1. Switch to production credentials
2. Update webhook URLs
3. Test with real phone numbers
4. Monitor payment success rates

## Security Considerations

### 1. Webhook Verification
- Always verify webhook signatures
- Use HTTPS for webhook URLs
- Validate webhook data

### 2. API Key Security
- Store keys in environment variables
- Never expose keys in frontend code
- Rotate keys regularly

### 3. Data Validation
- Validate all payment data
- Sanitize user inputs
- Log payment activities

## Monitoring and Logging

### 1. Payment Logs
- Log all payment attempts
- Track success/failure rates
- Monitor webhook processing

### 2. Error Tracking
- Log payment errors
- Track webhook failures
- Monitor API timeouts

### 3. Analytics
- Track payment conversion rates
- Monitor average transaction values
- Analyze payment method preferences

## Troubleshooting

### Common Issues

#### 1. Payment Not Processing
- Check API credentials
- Verify webhook URL
- Check network connectivity

#### 2. Webhook Not Receiving
- Verify webhook URL in Paychangu dashboard
- Check server accessibility
- Validate webhook secret

#### 3. Payment Status Not Updating
- Check webhook processing
- Verify database updates
- Monitor error logs

### Debug Commands

```bash
# Check payment status
curl -X GET "https://your-api.com/api/payments/status?transaction_id=TXN_123"

# Test webhook (local development)
ngrok http 8000
# Update webhook URL in Paychangu dashboard
```

## Production Checklist

- [ ] Update environment variables to production
- [ ] Configure production webhook URL
- [ ] Test with real phone numbers
- [ ] Monitor payment success rates
- [ ] Set up error alerting
- [ ] Configure backup webhook URLs
- [ ] Document payment procedures
- [ ] Train support team

## Support

For Paychangu-specific issues:
- Contact Paychangu support
- Check Paychangu documentation
- Review API response codes

For DocAvailable integration issues:
- Check application logs
- Verify configuration
- Test with sandbox environment

## Additional Resources

- [Paychangu API Documentation](https://docs.paychangu.com)
- [Mobile Money Integration Guide](https://paychangu.com/docs/mobile-money)
- [Webhook Security Best Practices](https://paychangu.com/docs/webhooks) 