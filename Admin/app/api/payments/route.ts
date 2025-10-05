import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const gateway = searchParams.get('gateway') || 'all';

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = [];
    let params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereConditions.push(`(
        u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR
        pt.transaction_id ILIKE $${paramCount}
      )`);
      params.push(`%${search}%`);
    }

    if (status !== 'all') {
      whereConditions.push(`pt.payment_status = '${status}'`);
    }

    if (gateway !== 'all') {
      whereConditions.push(`pt.gateway = '${gateway}'`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM payment_transactions pt
      LEFT JOIN users u ON pt.user_id = u.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    // Get payments
    paramCount++;
    const paymentsQuery = `
      SELECT 
        pt.id, pt.user_id, pt.amount, pt.currency,
        pt.payment_method, pt.status as payment_status, pt.transaction_id,
        pt.gateway, pt.gateway_reference, pt.created_at, pt.updated_at,
        pt.metadata, pt.reference, pt.phone_number,
        COALESCE(u.first_name, 'Unknown') as first_name, 
        COALESCE(u.last_name, 'User') as last_name, 
        COALESCE(u.email, 'No email') as email, 
        COALESCE(u.user_type, 'unknown') as user_type,
        CASE 
          WHEN pt.metadata->>'type' = 'subscription' THEN 'Subscription Payment'
          WHEN pt.metadata->>'type' = 'doctor' THEN 'Doctor Payment'
          ELSE 'Other Payment'
        END as payment_type,
        CASE 
          WHEN pt.metadata->>'plan_name' IS NOT NULL THEN pt.metadata->>'plan_name'
          WHEN pt.metadata->>'doctor_name' IS NOT NULL THEN pt.metadata->>'doctor_name'
          ELSE 'N/A'
        END as related_item
      FROM payment_transactions pt
      LEFT JOIN users u ON pt.user_id = u.id
      ${whereClause}
      ORDER BY pt.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limit, offset);

    const paymentsResult = await query(paymentsQuery, params);

    // Format the response
    const payments = paymentsResult.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      amount: row.amount,
      currency: row.currency,
      payment_method: row.payment_method,
      payment_status: row.payment_status,
      transaction_id: row.transaction_id,
      gateway: row.gateway,
      gateway_reference: row.gateway_reference,
      reference: row.reference,
      phone_number: row.phone_number,
      created_at: row.created_at,
      updated_at: row.updated_at,
      metadata: row.metadata,
      payment_type: row.payment_type,
      related_item: row.related_item,
      user: {
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
        user_type: row.user_type,
      },
    }));

    return NextResponse.json({
      payments,
      totalPages,
      currentPage: page,
      totalCount,
    });
  } catch (error) {
    console.error('Payments fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
