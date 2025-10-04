import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin';
}

export function generateToken(user: AdminUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): AdminUser | null {
  try {
    console.log('🔐 Verifying token...');
    console.log('Token length:', token.length);
    console.log('JWT Secret loaded:', !!JWT_SECRET);
    console.log('JWT Secret length:', JWT_SECRET?.length || 0);
    
    const decoded = jwt.verify(token, JWT_SECRET) as AdminUser;
    console.log('✅ Token verified successfully for:', decoded.email);
    return decoded;
  } catch (error) {
    console.log('❌ Token verification failed:', error.message);
    console.log('Error type:', error.name);
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Admin accounts configuration
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

export function validateAdminCredentials(email: string, password: string): { valid: boolean; admin?: any } {
  const admin = ADMIN_ACCOUNTS.find(acc => acc.email === email && acc.password === password);
  
  if (admin) {
    return { valid: true, admin };
  }
  
  return { valid: false };
}

// Check if email is used for admin account
export function isAdminEmail(email: string): boolean {
  return ADMIN_ACCOUNTS.some(acc => acc.email === email);
}
