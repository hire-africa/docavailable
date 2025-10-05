import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const plansResult = await query(`
      SELECT 
        p.*,
        COUNT(s.id) as subscription_count
      FROM plans p
      LEFT JOIN subscriptions s ON p.id = s.plan_id AND s.is_active = true
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    const plans = plansResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      currency: row.currency,
      duration: row.duration,
      status: row.status,
      text_sessions: row.text_sessions,
      voice_calls: row.voice_calls,
      video_calls: row.video_calls,
      features: row.features || [],
      created_at: row.created_at,
      subscription_count: parseInt(row.subscription_count),
    }));

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('Plans fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token || !verifyToken(token)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const {
      name,
      description,
      price,
      currency,
      duration,
      text_sessions,
      voice_calls,
      video_calls,
      features,
      status,
    } = await request.json();

    if (!name || !price) {
      return NextResponse.json(
        { message: 'Name and price are required' },
        { status: 400 }
      );
    }

    const result = await query(`
      INSERT INTO plans (name, description, price, currency, duration, text_sessions, voice_calls, video_calls, features, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      name,
      description || null,
      price,
      currency || 'USD',
      duration || 30,
      text_sessions || 0,
      voice_calls || 0,
      video_calls || 0,
      features || [],
      status || 1,
    ]);

    return NextResponse.json({
      message: 'Plan created successfully',
      plan: result.rows[0],
    });
  } catch (error) {
    console.error('Plan creation error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}






