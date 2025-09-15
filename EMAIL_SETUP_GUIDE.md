# 📧 Email Setup Guide for Doc Available

This guide will help you set up email services for the email verification feature in production.

## 🚀 Quick Setup

### 1. **Environment Configuration**

Add these variables to your `.env` file:

```env
# Email Configuration
MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host.com
MAIL_PORT=587
MAIL_USERNAME=your-email@domain.com
MAIL_PASSWORD=your-email-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@docavailable.com
MAIL_FROM_NAME="Doc Available"
```

### 2. **Recommended Email Services**

#### **Option A: Gmail SMTP (Free)**
```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-gmail@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_ENCRYPTION=tls
```

**Setup Steps:**
1. Enable 2-factor authentication on your Gmail account
2. Generate an "App Password" in Google Account settings
3. Use the app password instead of your regular password

#### **Option B: Mailgun (Recommended for Production)**
```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USERNAME=postmaster@your-domain.mailgun.org
MAIL_PASSWORD=your-mailgun-password
MAIL_ENCRYPTION=tls
```

**Setup Steps:**
1. Sign up at [Mailgun.com](https://mailgun.com)
2. Add your domain
3. Get SMTP credentials from the dashboard

#### **Option C: SendGrid**
```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=your-sendgrid-api-key
MAIL_ENCRYPTION=tls
```

#### **Option D: Amazon SES**
```env
MAIL_MAILER=smtp
MAIL_HOST=email-smtp.us-east-1.amazonaws.com
MAIL_PORT=587
MAIL_USERNAME=your-ses-smtp-username
MAIL_PASSWORD=your-ses-smtp-password
MAIL_ENCRYPTION=tls
```

## 🧪 Testing Email Setup

### 1. **Test the Configuration**

Run this command to test your email setup:

```bash
php artisan tinker
```

Then in tinker:
```php
Mail::raw('Test email from Doc Available', function($message) {
    $message->to('your-test-email@example.com')
            ->subject('Test Email');
});
```

### 2. **Test Verification Flow**

Use our test script:
```bash
php scripts/test-email-verification.php
```

## 🔧 Advanced Configuration

### 1. **Queue Configuration (Recommended)**

For better performance, use queues for email sending:

```env
QUEUE_CONNECTION=database
```

Then run:
```bash
php artisan queue:table
php artisan migrate
php artisan queue:work
```

### 2. **Email Templates Customization**

Edit the email template at:
```
backend/resources/views/emails/verification-code.blade.php
```

### 3. **Rate Limiting**

Current rate limits:
- **Send Code**: 3 requests per minute per IP
- **Verify Code**: 5 attempts per minute per IP

To adjust, edit `backend/routes/api.php`:
```php
Route::post('/send-verification-code', [AuthenticationController::class, 'sendVerificationCode'])
    ->middleware('throttle:5,1'); // Increase to 5 per minute
```

## 🛡️ Security Best Practices

### 1. **Environment Variables**
- Never commit email credentials to version control
- Use different credentials for development and production
- Rotate passwords regularly

### 2. **Domain Verification**
- Verify your domain with your email provider
- Set up SPF, DKIM, and DMARC records
- Monitor email deliverability

### 3. **Monitoring**
- Set up email delivery monitoring
- Monitor bounce rates and spam complaints
- Log email sending for debugging

## 🚨 Troubleshooting

### Common Issues:

#### **1. "Connection refused" Error**
- Check MAIL_HOST and MAIL_PORT
- Verify firewall settings
- Test SMTP connection manually

#### **2. "Authentication failed" Error**
- Verify MAIL_USERNAME and MAIL_PASSWORD
- Check if 2FA is enabled (for Gmail)
- Ensure app passwords are used (for Gmail)

#### **3. "Email not received"**
- Check spam folder
- Verify MAIL_FROM_ADDRESS
- Check domain reputation
- Test with different email providers

#### **4. "Rate limit exceeded"**
- Wait for the rate limit window to reset
- Check if multiple users are sharing the same IP
- Consider increasing rate limits for production

## 📊 Monitoring & Analytics

### 1. **Email Delivery Monitoring**
```bash
# Check queue status
php artisan queue:monitor

# View failed jobs
php artisan queue:failed
```

### 2. **Log Monitoring**
```bash
# Monitor email logs
tail -f storage/logs/laravel.log | grep "verification"
```

### 3. **Database Monitoring**
```sql
-- Check verification attempts
SELECT COUNT(*) as attempts, email, created_at 
FROM cache 
WHERE key LIKE 'email_verification_%' 
GROUP BY email 
ORDER BY created_at DESC;
```

## 🎯 Production Checklist

- [ ] Email service configured and tested
- [ ] Domain verified with email provider
- [ ] SPF/DKIM records configured
- [ ] Rate limiting configured
- [ ] Queue system set up (optional)
- [ ] Monitoring configured
- [ ] Backup email service configured
- [ ] Email templates customized
- [ ] Test emails sent and received
- [ ] Production environment variables set

## 📞 Support

If you encounter issues:

1. Check the Laravel logs: `storage/logs/laravel.log`
2. Test email configuration manually
3. Verify environment variables
4. Check email provider status
5. Contact your email service provider support

---

**Need help?** Create an issue in the repository or contact the development team.
