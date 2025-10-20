import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { status } = await request.json();

    if (!status) {
      return NextResponse.json(
        { message: 'Status is required' },
        { status: 400 }
      );
    }

    const validStatuses = ['approved', 'pending', 'rejected', 'suspended'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { message: 'Invalid status' },
        { status: 400 }
      );
    }

    // Get user details before updating
    const userResult = await query(
      'SELECT id, first_name, last_name, email, user_type, status FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Update user status
    const result = await query(
      'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, first_name, last_name, status',
      [status, id]
    );

    // Email service is temporarily disabled
    const emailResult = { success: false, message: 'Email service temporarily disabled' };

    return NextResponse.json({
      message: 'User status updated successfully',
      user: result.rows[0],
      emailNotification: emailResult,
    });
  } catch (error) {
    console.error('User status update error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}






