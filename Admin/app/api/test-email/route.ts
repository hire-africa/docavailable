import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { sendApprovalEmail, sendRejectionEmail } from '@/lib/email-service';

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

    let result;
    if (type === 'approval') {
      result = await sendApprovalEmail(doctorName, doctorEmail);
    } else if (type === 'rejection') {
      result = await sendRejectionEmail(doctorName, doctorEmail);
    } else {
      return NextResponse.json(
        { message: 'Invalid type. Use "approval" or "rejection"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: result.success,
      message: result.message,
      type,
      doctorName,
      doctorEmail
    });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
