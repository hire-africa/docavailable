import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Get withdrawal requests from withdrawal_requests table
    const withdrawRequestsQuery = `
      SELECT 
        wr.id,
        wr.doctor_id,
        wr.amount,
        wr.payment_method,
        wr.payment_details,
        wr.status,
        wr.account_number,
        wr.bank_name,
        wr.account_holder_name,
        wr.mobile_provider,
        wr.mobile_number,
        wr.bank_branch,
        wr.rejection_reason,
        wr.approved_at,
        wr.paid_at,
        wr.approved_by,
        wr.paid_by,
        wr.created_at,
        wr.updated_at,
        u.first_name,
        u.last_name,
        u.email
      FROM withdrawal_requests wr
      LEFT JOIN users u ON wr.doctor_id = u.id
      ORDER BY wr.created_at DESC
    `;

    const result = await query(withdrawRequestsQuery);

    const withdrawRequests = result.rows.map(row => ({
      id: row.id,
      doctor_id: row.doctor_id,
      amount: parseFloat(row.amount),
      payment_method: row.payment_method,
      payment_details: row.payment_details,
      status: row.status,
      account_number: row.account_number,
      bank_name: row.bank_name,
      account_holder_name: row.account_holder_name,
      mobile_provider: row.mobile_provider,
      mobile_number: row.mobile_number,
      bank_branch: row.bank_branch,
      rejection_reason: row.rejection_reason,
      approved_at: row.approved_at,
      paid_at: row.paid_at,
      approved_by: row.approved_by,
      paid_by: row.paid_by,
      created_at: row.created_at,
      updated_at: row.updated_at,
      doctor: {
        first_name: row.first_name || 'Unknown',
        last_name: row.last_name || 'Doctor',
        email: row.email || 'No email'
      }
    }));

    return NextResponse.json({
      withdrawRequests,
      totalCount: withdrawRequests.length
    });
  } catch (error) {
    console.error('Withdraw requests fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
