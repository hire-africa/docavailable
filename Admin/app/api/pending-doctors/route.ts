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

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = ['u.user_type = $1', 'u.status = $2'];
    let params = ['doctor', 'pending'];
    let paramCount = 2;

    if (search) {
      paramCount++;
      whereConditions.push(`(
        u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount}
      )`);
      params.push(`%${search}%`);
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM users u
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    // Get pending doctors
    paramCount++;
    const doctorsQuery = `
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.user_type, u.status,
        u.created_at, u.is_active, u.rating, u.total_ratings,
        u.phone_number, u.date_of_birth, u.gender, u.specialization,
        u.license_number, u.experience_years, u.bio, u.profile_image
      FROM users u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limit, offset);

    const doctorsResult = await query(doctorsQuery, params);

    // Format the response
    const doctors = doctorsResult.rows.map(row => ({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      user_type: row.user_type,
      status: row.status,
      created_at: row.created_at,
      is_active: row.is_active,
      rating: row.rating,
      total_ratings: row.total_ratings,
      phone_number: row.phone_number,
      date_of_birth: row.date_of_birth,
      gender: row.gender,
      specialization: row.specialization,
      license_number: row.license_number,
      experience_years: row.experience_years,
      bio: row.bio,
      profile_image: row.profile_image,
    }));

    return NextResponse.json({
      doctors,
      totalPages,
      currentPage: page,
      totalCount,
    });
  } catch (error) {
    console.error('Pending doctors fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}





