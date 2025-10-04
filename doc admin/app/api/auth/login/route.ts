import { NextRequest, NextResponse } from 'next/server';
import { validateAdminCredentials, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const validation = validateAdminCredentials(email, password);
    if (!validation.valid) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = generateToken({
      id: validation.admin?.name || 'admin',
      email,
      role: 'admin'
    });

    return NextResponse.json({
      message: 'Login successful',
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
