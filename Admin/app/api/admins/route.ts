import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

// Hardcoded admin accounts for dropdown (same as auth.ts)
const ADMIN_ACCOUNTS = [
  {
    id: 'admin-1',
    email: 'blacksleeky84@gmail.com',
    name: 'Praise Mtosa',
    role: 'admin'
  },
  {
    id: 'admin-2',
    email: 'admin@docavailable.com',
    name: 'System Admin',
    role: 'admin'
  },
  {
    id: 'admin-3',
    email: 'macnyoni4@gmail.com',
    name: 'Mac Nyoni',
    role: 'admin'
  }
];

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token || !verifyToken(token)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Return hardcoded admin accounts for dropdown
    const admins = ADMIN_ACCOUNTS.map(admin => ({
      id: admin.id,
      first_name: admin.name.split(' ')[0],
      last_name: admin.name.split(' ').slice(1).join(' '),
      email: admin.email,
      full_name: admin.name
    }));

    console.log('Returning hardcoded admins for dropdown:', admins);

    return NextResponse.json({
      admins,
      totalCount: admins.length
    });
  } catch (error) {
    console.error('Admins fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
