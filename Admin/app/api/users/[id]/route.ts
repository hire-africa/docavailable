import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get comprehensive user information
    const userQuery = `
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
      WHERE u.id = $1
    `;

    const userResult = await query(userQuery, [id]);
    
    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];

    // Get current subscription information
    const subscriptionQuery = `
      SELECT 
        s.id, s.plan_id, s.plan_name, s.plan_price, s.plan_currency,
        s.status, s.is_active, s.start_date, s.end_date,
        s.text_sessions_remaining, s.appointments_remaining,
        s.voice_calls_remaining, s.video_calls_remaining,
        s.created_at as subscription_created_at,
        p.name as plan_display_name, p.features as plan_features,
        p.text_sessions, p.voice_calls, p.video_calls, p.duration
      FROM subscriptions s
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE s.user_id = $1 AND s.is_active = true
      ORDER BY s.created_at DESC
      LIMIT 1
    `;

    const subscriptionResult = await query(subscriptionQuery, [id]);
    const currentSubscription = subscriptionResult.rows[0] || null;

    // Get activity statistics
    const activityQuery = `
      SELECT 
        (SELECT COUNT(*) FROM appointments WHERE patient_id = $1 OR doctor_id = $1) as total_appointments,
        (SELECT COUNT(*) FROM appointments WHERE (patient_id = $1 OR doctor_id = $1) AND status = 2) as completed_appointments,
        (SELECT COUNT(*) FROM appointments WHERE (patient_id = $1 OR doctor_id = $1) AND status = 3) as cancelled_appointments,
        (SELECT COUNT(*) FROM payment_transactions WHERE user_id = $1) as total_payments,
        (SELECT COALESCE(SUM(amount), 0) FROM payment_transactions WHERE user_id = $1 AND status = 'completed') as total_spent,
        (SELECT COUNT(*) FROM reviews WHERE user_id = $1) as total_reviews_received,
        (SELECT COUNT(*) FROM reviews WHERE reviewer_id = $1) as total_reviews_given,
        (SELECT COUNT(*) FROM subscriptions WHERE user_id = $1) as total_subscriptions,
        (SELECT COUNT(*) FROM subscriptions WHERE user_id = $1 AND is_active = true) as active_subscriptions
    `;

    const activityResult = await query(activityQuery, [id]);
    const activityStats = activityResult.rows[0];

    // Get recent appointments
    const recentAppointmentsQuery = `
      SELECT 
        a.id, a.appointment_date, a.appointment_time, a.status, a.appointment_type as type,
        a.reason as notes, a.created_at,
        CASE 
          WHEN a.patient_id = $1 THEN 'patient'
          WHEN a.doctor_id = $1 THEN 'doctor'
        END as user_role,
        CASE 
          WHEN a.patient_id = $1 THEN CONCAT(d.first_name, ' ', d.last_name)
          WHEN a.doctor_id = $1 THEN CONCAT(p.first_name, ' ', p.last_name)
        END as other_party_name,
        CASE 
          WHEN a.patient_id = $1 THEN d.email
          WHEN a.doctor_id = $1 THEN p.email
        END as other_party_email
      FROM appointments a
      LEFT JOIN users d ON a.doctor_id = d.id
      LEFT JOIN users p ON a.patient_id = p.id
      WHERE a.patient_id = $1 OR a.doctor_id = $1
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
      LIMIT 5
    `;

    const recentAppointmentsResult = await query(recentAppointmentsQuery, [id]);
    const recentAppointments = recentAppointmentsResult.rows;

    // Get recent payments
    const recentPaymentsQuery = `
      SELECT 
        id, amount, currency, status, payment_method, gateway as payment_gateway,
        transaction_id, created_at, reference as description
      FROM payment_transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const recentPaymentsResult = await query(recentPaymentsQuery, [id]);
    const recentPayments = recentPaymentsResult.rows;

    // Get device and security information
    const deviceQuery = `
      SELECT 
        last_online_at as last_login, 
        created_at as account_created,
        EXTRACT(EPOCH FROM (NOW() - last_online_at)) / 3600 as hours_since_last_login,
        'Unknown' as ip_type
      FROM users
      WHERE id = $1
    `;

    const deviceResult = await query(deviceQuery, [id]);
    const deviceInfo = deviceResult.rows[0];

    // Security flags
    const securityFlags = [];
    
    // Check for suspicious activity
    if (deviceInfo.hours_since_last_login > 24 * 30) { // 30 days
      securityFlags.push({
        type: 'warning',
        message: 'User has not been online for over 30 days',
        severity: 'medium'
      });
    }

    if (deviceInfo.hours_since_last_login > 24 * 90) { // 90 days
      securityFlags.push({
        type: 'danger',
        message: 'User has not been online for over 90 days',
        severity: 'high'
      });
    }

    if (user.user_type === 'doctor' && !user.medical_licence) {
      securityFlags.push({
        type: 'warning',
        message: 'Doctor profile missing medical license number',
        severity: 'medium'
      });
    }

    if (!user.email_verified_at) {
      securityFlags.push({
        type: 'warning',
        message: 'Email address not verified',
        severity: 'medium'
      });
    }

    if (user.google_id && !user.password) {
      securityFlags.push({
        type: 'info',
        message: 'User signed up with Google (no password set)',
        severity: 'low'
      });
    }

    // Calculate account age
    const accountAge = Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));

    return NextResponse.json({
      user: {
        ...user,
        account_age_days: accountAge,
        email_verified: !!user.email_verified_at,
        phone_verified: false, // Not available in current schema
        two_factor_enabled: false, // Not available in current schema
        last_login: user.last_online_at,
        last_login_ip: null, // Not available in current schema
        device_info: null, // Not available in current schema
        user_agent: null, // Not available in current schema
        phone: null, // Not available in current schema
        address: null, // Not available in current schema
        state: null, // Not available in current schema
        postal_code: null, // Not available in current schema
        preferred_language: null, // Not available in current schema
        timezone: null, // Not available in current schema
        emergency_contact_name: null, // Not available in current schema
        emergency_contact_phone: null, // Not available in current schema
        medical_license_number: user.medical_licence,
        hospital_affiliation: null, // Not available in current schema
        consultation_fee: null, // Not available in current schema
        availability_status: user.is_online_for_instant_sessions ? 'available' : 'unavailable'
      },
      currentSubscription,
      activityStats,
      recentAppointments,
      recentPayments,
      deviceInfo: {
        ...deviceInfo,
        last_login_ip: null,
        device_info: null,
        user_agent: null,
        security_flags: securityFlags
      }
    });

  } catch (error) {
    console.error('User details fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check if user exists
    const userResult = await query('SELECT id, first_name, last_name FROM users WHERE id = $1', [id]);
    
    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Delete user (this will cascade to related records due to foreign key constraints)
    await query('DELETE FROM users WHERE id = $1', [id]);

    return NextResponse.json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('User deletion error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}