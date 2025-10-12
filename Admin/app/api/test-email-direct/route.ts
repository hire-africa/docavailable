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

    let emailResult;
    if (type === 'approval') {
      emailResult = await sendApprovalEmail(doctorName, doctorEmail);
    } else if (type === 'rejection') {
      emailResult = await sendRejectionEmail(doctorName, doctorEmail);
    } else {
      return NextResponse.json({ message: 'Invalid email type' }, { status: 400 });
    }

    return NextResponse.json(emailResult);
  } catch (error) {
    console.error('Test email API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error during test email' },
      { status: 500 }
    );
  }
}
