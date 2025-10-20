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

    // Get pending doctors with comprehensive information
    paramCount++;
    const doctorsQuery = `
      SELECT 
        u.id, u.first_name, u.last_name, u.email, u.user_type, u.status,
        u.created_at, u.is_active, u.rating, u.total_ratings,
        u.city, u.country, u.date_of_birth, u.gender, u.profile_picture, u.bio,
        u.email_verified_at, u.last_online_at, u.push_token,
        u.display_name, u.national_id, u.medical_degree, u.medical_licence,
        u.health_history, u.occupation, u.google_id, u.is_online_for_instant_sessions,
        u.public_key, u.private_key, u.encryption_enabled,
        u.notification_preferences, u.privacy_preferences,
        u.email_notifications_enabled, u.push_notifications_enabled, u.sms_notifications_enabled,
        u.role, u.id_document, u.professional_bio,
        u.specialization, u.sub_specialization, u.specializations,
        u.languages_spoken, u.sub_specializations, u.years_of_experience
      FROM users u
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limit.toString(), offset.toString());

    const doctorsResult = await query(doctorsQuery, params);

    // Format the response with available fields
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
      total_ratings: row.total_ratings || 0,
      phone_number: null, // Column doesn't exist in database
      date_of_birth: row.date_of_birth,
      gender: row.gender,
      specialization: row.specializations,
      license_number: row.medical_licence,
      experience_years: row.years_of_experience,
      bio: row.bio || row.professional_bio,
      profile_image: row.profile_picture,
      // Additional comprehensive information
      city: row.city,
      country: row.country,
      address: null, // Column doesn't exist in database
      state: null, // Column doesn't exist in database
      postal_code: null, // Column doesn't exist in database
      display_name: row.display_name,
      national_id: row.national_id,
      medical_degree: row.medical_degree,
      health_history: row.health_history,
      occupation: row.occupation,
      google_id: row.google_id,
      is_online_for_instant_sessions: row.is_online_for_instant_sessions,
      email_verified_at: row.email_verified_at,
      last_online_at: row.last_online_at,
      sub_specialization: row.sub_specialization,
      specializations: row.specializations,
      languages_spoken: row.languages_spoken,
      sub_specializations: row.sub_specializations,
      emergency_contact_name: null, // Column doesn't exist in database
      emergency_contact_phone: null, // Column doesn't exist in database
      hospital_affiliation: null, // Column doesn't exist in database
      consultation_fee: null, // Column doesn't exist in database
      availability_status: null, // Column doesn't exist in database
      id_document: row.id_document,
      email_verified: !!row.email_verified_at,
      account_age_days: Math.floor((Date.now() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24))
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





