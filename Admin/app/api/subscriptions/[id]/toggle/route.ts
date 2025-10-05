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
    const { is_active } = await request.json();

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { message: 'is_active must be a boolean' },
        { status: 400 }
      );
    }

    const result = await query(
      'UPDATE subscriptions SET is_active = $1 WHERE id = $2 RETURNING id, is_active, plan_name',
      [is_active, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'Subscription not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Subscription status updated successfully',
      subscription: result.rows[0],
    });
  } catch (error) {
    console.error('Subscription toggle error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}






