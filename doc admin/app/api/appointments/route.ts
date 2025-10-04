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
    const type = searchParams.get('type') || 'all';

    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereConditions = [];
    let params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereConditions.push(`(
        d.first_name ILIKE $${paramCount} OR d.last_name ILIKE $${paramCount} OR d.email ILIKE $${paramCount} OR
        p.first_name ILIKE $${paramCount} OR p.last_name ILIKE $${paramCount} OR p.email ILIKE $${paramCount}
      )`);
      params.push(`%${search}%`);
    }

    if (status !== 'all') {
      whereConditions.push(`a.status = '${status}'`);
    }

    if (type !== 'all') {
      whereConditions.push(`a.appointment_type = '${type}'`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count from all sources
    const countQuery = `
      SELECT COUNT(*) as count FROM (
        SELECT a.id
        FROM appointments a
        JOIN users d ON a.doctor_id = d.id
        JOIN users p ON a.patient_id = p.id
        ${whereClause}
        
        UNION ALL
        
        SELECT ts.id
        FROM text_sessions ts
        JOIN users d ON ts.doctor_id = d.id
        JOIN users p ON ts.patient_id = p.id
        ${whereClause ? whereClause.replace(/a\./g, 'ts.') : ''}
        
        UNION ALL
        
        SELECT cs.id
        FROM call_sessions cs
        JOIN users d ON cs.doctor_id = d.id
        JOIN users p ON cs.patient_id = p.id
        ${whereClause ? whereClause.replace(/a\./g, 'cs.') : ''}
      ) as combined
    `;
    const countResult = await query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    // Get appointments with session data
    paramCount++;
    const appointmentsQuery = `
      SELECT 
        a.id, a.doctor_id, a.patient_id, a.appointment_type, a.status,
        a.appointment_date as scheduled_date, a.appointment_time as scheduled_time, 
        a.duration_minutes as duration, a.reason as notes, a.created_at,
        d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.email as doctor_email,
        p.first_name as patient_first_name, p.last_name as patient_last_name, p.email as patient_email,
        'appointment' as source_type,
        NULL as session_id,
        NULL as session_status,
        a.actual_start_time as session_started_at,
        a.actual_end_time as session_ended_at,
        NULL as call_duration,
        a.sessions_deducted as sessions_used
      FROM appointments a
      JOIN users d ON a.doctor_id = d.id
      JOIN users p ON a.patient_id = p.id
      ${whereClause}
      
      UNION ALL
      
      SELECT 
        ts.id as id, ts.doctor_id, ts.patient_id, 'text' as appointment_type, 
        ts.status, NULL as scheduled_date, NULL as scheduled_time, 
        NULL as duration, ts.description as notes, ts.created_at,
        d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.email as doctor_email,
        p.first_name as patient_first_name, p.last_name as patient_last_name, p.email as patient_email,
        'text_session' as source_type,
        ts.id as session_id,
        ts.status as session_status,
        ts.started_at as session_started_at,
        ts.ended_at as session_ended_at,
        NULL as call_duration,
        ts.sessions_used
      FROM text_sessions ts
      JOIN users d ON ts.doctor_id = d.id
      JOIN users p ON ts.patient_id = p.id
      ${whereClause ? whereClause.replace(/a\./g, 'ts.') : ''}
      
      UNION ALL
      
      SELECT 
        cs.id as id, cs.doctor_id, cs.patient_id, cs.call_type as appointment_type, 
        cs.status, NULL as scheduled_date, NULL as scheduled_time, 
        cs.call_duration as duration, cs.reason as notes, cs.created_at,
        d.first_name as doctor_first_name, d.last_name as doctor_last_name, d.email as doctor_email,
        p.first_name as patient_first_name, p.last_name as patient_last_name, p.email as patient_email,
        'call_session' as source_type,
        cs.id as session_id,
        cs.status as session_status,
        cs.started_at as session_started_at,
        cs.ended_at as session_ended_at,
        cs.call_duration,
        cs.sessions_used
      FROM call_sessions cs
      JOIN users d ON cs.doctor_id = d.id
      JOIN users p ON cs.patient_id = p.id
      ${whereClause ? whereClause.replace(/a\./g, 'cs.') : ''}
      
      ORDER BY created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    params.push(limit, offset);

    const appointmentsResult = await query(appointmentsQuery, params);

    // Format the response
    const appointments = appointmentsResult.rows.map(row => ({
      id: row.id,
      doctor_id: row.doctor_id,
      patient_id: row.patient_id,
      appointment_type: row.appointment_type,
      status: row.status,
      scheduled_date: row.scheduled_date,
      scheduled_time: row.scheduled_time,
      duration: row.duration,
      notes: row.notes,
      created_at: row.created_at,
      source_type: row.source_type,
      session_id: row.session_id,
      session_status: row.session_status,
      session_started_at: row.session_started_at,
      session_ended_at: row.session_ended_at,
      call_duration: row.call_duration,
      sessions_used: row.sessions_used,
      doctor: {
        first_name: row.doctor_first_name,
        last_name: row.doctor_last_name,
        email: row.doctor_email,
      },
      patient: {
        first_name: row.patient_first_name,
        last_name: row.patient_last_name,
        email: row.patient_email,
      },
    }));

    return NextResponse.json({
      appointments,
      totalPages,
      currentPage: page,
      totalCount,
    });
  } catch (error) {
    console.error('Appointments fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
