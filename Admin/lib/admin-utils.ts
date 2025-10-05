import { query } from './database';
import { isAdminEmail } from './auth';

// Check if email exists in the database for any user type
export async function checkEmailExists(email: string): Promise<{
  exists: boolean;
  userType?: string;
  userId?: number;
}> {
  try {
    const result = await query(
      'SELECT id, user_type FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length > 0) {
      return {
        exists: true,
        userType: result.rows[0].user_type,
        userId: result.rows[0].id
      };
    }

    return { exists: false };
  } catch (error) {
    console.error('Error checking email existence:', error);
    return { exists: false };
  }
}

// Get admin account info
export function getAdminAccountInfo(email: string) {
  const adminAccounts = [
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

  return adminAccounts.find(acc => acc.email === email);
}

// Check if email can be used for admin (either not in DB or already admin)
export async function canUseEmailForAdmin(email: string): Promise<{
  canUse: boolean;
  reason?: string;
  existingUserType?: string;
}> {
  // Check if it's a valid admin email
  if (!isAdminEmail(email)) {
    return {
      canUse: false,
      reason: 'Email is not configured as an admin account'
    };
  }

  // Check if email exists in database
  const emailCheck = await checkEmailExists(email);
  
  if (!emailCheck.exists) {
    return { canUse: true };
  }

  // If email exists, check if it's already an admin user
  if (emailCheck.userType === 'admin') {
    return { canUse: true };
  }

  // If email exists as patient or doctor, explain the situation
  return {
    canUse: false,
    reason: `Email is already registered as a ${emailCheck.userType}. You can either: 1) Use a different email for admin, or 2) Change the existing user's role to admin in the database.`,
    existingUserType: emailCheck.userType
  };
}






