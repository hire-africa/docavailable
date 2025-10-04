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
    const range = searchParams.get('range') || '6months';

    // Calculate date range
    let monthsBack = 6;
    switch (range) {
      case '1month':
        monthsBack = 1;
        break;
      case '3months':
        monthsBack = 3;
        break;
      case '6months':
        monthsBack = 6;
        break;
      case '1year':
        monthsBack = 12;
        break;
    }

    // Get user growth data
    const userGrowthResult = await query(`
      SELECT 
        TO_CHAR(created_at, 'Mon YYYY') as month,
        COUNT(*) as total_users,
        COUNT(CASE WHEN user_type = 'doctor' THEN 1 END) as doctors,
        COUNT(CASE WHEN user_type = 'patient' THEN 1 END) as patients
      FROM users 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${monthsBack} months'
      GROUP BY TO_CHAR(created_at, 'Mon YYYY')
      ORDER BY MIN(created_at)
    `);

    const userGrowth = userGrowthResult.rows.map(row => ({
      month: row.month,
      users: parseInt(row.total_users),
      doctors: parseInt(row.doctors),
      patients: parseInt(row.patients),
    }));

    // Get revenue data
    const revenueResult = await query(`
      SELECT 
        TO_CHAR(created_at, 'Mon YYYY') as month,
        COALESCE(SUM(CAST(plan_price AS DECIMAL)), 0) as revenue,
        COUNT(*) as subscriptions
      FROM subscriptions 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${monthsBack} months'
      AND is_active = true
      GROUP BY TO_CHAR(created_at, 'Mon YYYY')
      ORDER BY MIN(created_at)
    `);

    const revenueData = revenueResult.rows.map(row => ({
      month: row.month,
      revenue: parseFloat(row.revenue),
      subscriptions: parseInt(row.subscriptions),
    }));

    // Get appointment stats
    const appointmentStatsResult = await query(`
      SELECT 
        appointment_type as type,
        COUNT(*) as count
      FROM appointments 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${monthsBack} months'
      GROUP BY appointment_type
      ORDER BY count DESC
    `);

    const appointmentStats = appointmentStatsResult.rows.map(row => ({
      type: row.type,
      count: parseInt(row.count),
    }));

    // Get payment methods data
    const paymentMethodsResult = await query(`
      SELECT 
        payment_method as method,
        COUNT(*) as count,
        COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as amount
      FROM payment_transactions 
      WHERE created_at >= CURRENT_DATE - INTERVAL '${monthsBack} months'
      GROUP BY payment_method
      ORDER BY count DESC
    `);

    const paymentMethods = paymentMethodsResult.rows.map(row => ({
      method: row.method,
      count: parseInt(row.count),
      amount: parseFloat(row.amount),
    }));

    // Get monthly stats
    const monthlyStatsResult = await query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM users WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)) as new_users,
        (SELECT COALESCE(SUM(CAST(plan_price AS DECIMAL)), 0) FROM subscriptions WHERE is_active = true) as total_revenue,
        (SELECT COALESCE(SUM(CAST(plan_price AS DECIMAL)), 0) FROM subscriptions WHERE is_active = true AND created_at >= DATE_TRUNC('month', CURRENT_DATE)) as monthly_revenue,
        (SELECT COUNT(*) FROM appointments) as total_appointments,
        (SELECT COUNT(*) FROM appointments WHERE status = 'completed') as completed_appointments
    `);

    const monthlyStats = {
      totalUsers: parseInt(monthlyStatsResult.rows[0].total_users),
      newUsers: parseInt(monthlyStatsResult.rows[0].new_users),
      totalRevenue: parseFloat(monthlyStatsResult.rows[0].total_revenue),
      monthlyRevenue: parseFloat(monthlyStatsResult.rows[0].monthly_revenue),
      totalAppointments: parseInt(monthlyStatsResult.rows[0].total_appointments),
      completedAppointments: parseInt(monthlyStatsResult.rows[0].completed_appointments),
    };

    return NextResponse.json({
      userGrowth,
      revenueData,
      appointmentStats,
      paymentMethods,
      monthlyStats,
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}






