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

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = [];
    let params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereConditions.push(`(u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }

    if (status === 'active') {
      whereConditions.push('s.is_active = true');
    } else if (status === 'inactive') {
      whereConditions.push('s.is_active = false');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    // Get subscriptions
    paramCount++;
    const subscriptionsQuery = `
      SELECT 
        s.id, s.user_id, s.plan_id, s.plan_name, s.plan_price, s.plan_currency,
        s.status, s.is_active, s.start_date, s.end_date,
        s.text_sessions_remaining, s.appointments_remaining,
        s.voice_calls_remaining, s.video_calls_remaining,
        s.created_at,
        u.first_name, u.last_name, u.email
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limit, offset);

    const subscriptionsResult = await query(subscriptionsQuery, params);

    // Format the response
    const subscriptions = subscriptionsResult.rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      plan_id: row.plan_id,
      plan_name: row.plan_name,
      plan_price: row.plan_price,
      plan_currency: row.plan_currency,
      status: row.status,
      is_active: row.is_active,
      start_date: row.start_date,
      end_date: row.end_date,
      text_sessions_remaining: row.text_sessions_remaining,
      appointments_remaining: row.appointments_remaining,
      voice_calls_remaining: row.voice_calls_remaining,
      video_calls_remaining: row.video_calls_remaining,
      created_at: row.created_at,
      user: {
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email,
      },
    }));

    return NextResponse.json({
      subscriptions,
      totalPages,
      currentPage: page,
      totalCount,
    });
  } catch (error) {
    console.error('Subscriptions fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}






