import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { type, doctorName, doctorEmail } = await request.json();

    if (!type || !doctorName || !doctorEmail) {
      return NextResponse.json(
        { message: 'Type, doctorName, and doctorEmail are required' },
        { status: 400 }
      );
    }

    // Email service is temporarily disabled
    return NextResponse.json({
      success: false,
      message: 'Email service is temporarily disabled'
    });
  } catch (error) {
    console.error('Test email API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error during test email' },
      { status: 500 }
    );
  }
}
