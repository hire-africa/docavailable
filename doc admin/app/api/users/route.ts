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
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'all';

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = [];
    let params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereConditions.push(`(first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`);
      params.push(`%${search}%`);
    }

    if (type !== 'all') {
      paramCount++;
      whereConditions.push(`user_type = $${paramCount}`);
      params.push(type);
    }

    if (status !== 'all') {
      paramCount++;
      whereConditions.push(`status = $${paramCount}`);
      params.push(status);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM users ${whereClause}`;
    const countResult = await query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    // Get users
    paramCount++;
    const usersQuery = `
      SELECT 
        id, first_name, last_name, email, user_type, status, 
        created_at, is_active, rating, total_ratings
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limit, offset);

    const usersResult = await query(usersQuery, params);

    return NextResponse.json({
      users: usersResult.rows,
      totalPages,
      currentPage: page,
      totalCount,
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}






