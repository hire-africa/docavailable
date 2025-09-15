# Admin Account Setup

This document explains how to create the first admin account for the DocAvailable application.

## Security Note

Admin accounts can only be created through the backend for security reasons. There is no admin registration form in the frontend application.

## Creating the First Admin Account

### Option 1: Using the Node.js Script

1. Make sure you have Node.js installed
2. Navigate to the project root directory
3. Run the script:

```bash
node scripts/create-admin.js
```

### Option 2: Using the PHP Script

1. Make sure you have PHP installed with cURL extension
2. Navigate to the project root directory
3. Run the script:

```bash
php scripts/create-admin.php
```

### Option 3: Using cURL directly

```bash
curl -X POST http://172.20.10.11:8000/api/create-first-admin \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "first_name": "Admin",
    "last_name": "User", 
    "email": "admin@docavailable.com",
    "password": "admin123456",
    "password_confirmation": "admin123456"
  }'
```

### Option 4: Using Postman or similar API client

**URL:** `POST http://172.20.10.11:8000/api/create-first-admin`

**Headers:**
- Content-Type: application/json
- Accept: application/json

**Body:**
```json
{
  "first_name": "Admin",
  "last_name": "User",
  "email": "admin@docavailable.com", 
  "password": "admin123456",
  "password_confirmation": "admin123456"
}
```

## Default Admin Credentials

After running any of the above methods, you'll have an admin account with these credentials:

- **Email:** admin@docavailable.com
- **Password:** admin123456

## Important Notes

1. **First Admin Only:** This endpoint can only be used to create the first admin account. Once an admin exists, this endpoint will return an error.

2. **Security:** Change the default password immediately after first login.

3. **Access:** The admin account will have full access to the admin dashboard and all administrative functions.

4. **Automatic Redirect:** After login, admin users are automatically redirected to `/admin-dashboard`.

## Creating Additional Admin Accounts

Once the first admin account is created, additional admin accounts can be created through:

1. **Admin Dashboard:** Use the admin dashboard interface (if implemented)
2. **Backend API:** Use the `/admin/users` endpoint with admin authentication
3. **Database:** Direct database insertion (not recommended for production)

## Admin Dashboard Features

The admin dashboard includes:

- User management (view, edit, delete users)
- Doctor approval system
- Appointment management
- System statistics
- Performance monitoring
- Plan management
- And more...

## Troubleshooting

### "Admin account already exists" error
This means an admin account has already been created. Use the regular admin creation endpoint or contact the existing admin.

### Connection refused
Make sure the Laravel backend is running on the correct port (8000 by default).

### Validation errors
Ensure all required fields are provided and the password meets the minimum requirements (8 characters).

## Security Recommendations

1. Change the default password immediately
2. Use a strong, unique password
3. Enable two-factor authentication if available
4. Regularly review admin access
5. Monitor admin account activity
6. Use HTTPS in production 