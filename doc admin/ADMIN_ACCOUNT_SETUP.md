# Admin Account Setup Guide

## 🎉 Praise Mtosa Admin Account Created

### Admin Credentials:
- **Name**: Praise Mtosa
- **Email**: blacksleeky84@gmail.com
- **Password**: PraiseAdmin2024!
- **Role**: Admin

## 🔧 Setup Instructions

### 1. Create Admin User in Database
Run the following command to create the admin user in the database:

```bash
npm run create-admin
```

This script will:
- Check if the email already exists in the database
- If it exists as a patient/doctor, update it to admin role
- If it doesn't exist, create a new admin user
- Display the final admin credentials

### 2. Start the Admin Dashboard
```bash
npm run dev
```

### 3. Login to Admin Dashboard
- Open: http://localhost:3000
- Email: blacksleeky84@gmail.com
- Password: PraiseAdmin2024!

## 🔄 Same Email for Different Account Types

### How It Works:
The system now supports using the same email address for both admin and regular user accounts (patient/doctor). Here's how:

1. **Admin Authentication**: Uses a separate admin credentials system
2. **Database User**: The same email can exist in the users table as any role
3. **Access Control**: The system determines access level based on login context

### Admin Accounts Configuration:
Located in `lib/auth.ts`:

```javascript
const ADMIN_ACCOUNTS = [
  {
    email: 'blacksleeky84@gmail.com',
    password: 'PraiseAdmin2024!',
    name: 'Praise Mtosa',
    role: 'admin'
  },
  {
    email: 'admin@docavailable.com',
    password: 'admin123',
    name: 'System Admin',
    role: 'admin'
  }
];
```

### Adding More Admin Accounts:
To add more admin accounts, simply add them to the `ADMIN_ACCOUNTS` array in `lib/auth.ts`.

## 🛡️ Security Features

### Admin-Only Access:
- JWT tokens include admin role information
- All admin routes are protected
- Admin credentials are separate from regular user system

### Database Integration:
- Admin users are stored in the main users table
- User type is set to 'admin' in the database
- Status is set to 'approved' for immediate access

## 🔍 Verification

### Check Admin User in Database:
```sql
SELECT id, email, first_name, last_name, user_type, status 
FROM users 
WHERE email = 'blacksleeky84@gmail.com';
```

### Expected Result:
```
id | email                        | first_name | last_name | user_type | status
---|------------------------------|------------|-----------|-----------|--------
X  | blacksleeky84@gmail.com      | Praise     | Mtosa     | admin     | approved
```

## 🚀 Next Steps

1. **Run the setup script**: `npm run create-admin`
2. **Start the dashboard**: `npm run dev`
3. **Login with the credentials above**
4. **Begin managing your DocAvailable platform!**

## 📞 Support

If you encounter any issues:
1. Check the database connection
2. Verify the admin user was created successfully
3. Ensure the JWT secret is properly configured
4. Check the browser console for any errors

---

**Note**: The same email can be used for both admin and regular accounts. The system will automatically determine the appropriate access level based on the login context.






