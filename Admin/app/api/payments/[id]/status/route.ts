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

    const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { message: 'Invalid status' },
        { status: 400 }
      );
    }

    const result = await query(
      'UPDATE payment_transactions SET payment_status = $1, updated_at = NOW() WHERE id = $2 RETURNING id, payment_status, transaction_id',
      [status, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Payment status updated successfully',
      payment: result.rows[0],
    });
  } catch (error) {
    console.error('Payment status update error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}






