import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    console.log('🔍 Dashboard API called');
    console.log('Token provided:', !!token);
    
    if (!token) {
      console.log('❌ No token provided');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    
    const verifiedUser = verifyToken(token);
    if (!verifiedUser) {
      console.log('❌ Token verification failed');
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Authentication successful for user:', verifiedUser.email);
    console.log('🔍 Fetching dashboard stats...');

    // Get total users
    console.log('Querying users...');
    const usersResult = await query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(usersResult.rows[0].count);
    console.log('Total users:', totalUsers);

    // Get doctors count
    console.log('Querying doctors...');
    const doctorsResult = await query('SELECT COUNT(*) as count FROM users WHERE user_type = $1', ['doctor']);
    const totalDoctors = parseInt(doctorsResult.rows[0].count);
    console.log('Total doctors:', totalDoctors);

    // Get patients count
    console.log('Querying patients...');
    const patientsResult = await query('SELECT COUNT(*) as count FROM users WHERE user_type = $1', ['patient']);
    const totalPatients = parseInt(patientsResult.rows[0].count);
    console.log('Total patients:', totalPatients);

    // Get active subscriptions
    console.log('Querying subscriptions...');
    const subscriptionsResult = await query('SELECT COUNT(*) as count FROM subscriptions WHERE is_active = true');
    const activeSubscriptions = parseInt(subscriptionsResult.rows[0].count);
    console.log('Active subscriptions:', activeSubscriptions);

    // Get total revenue (convert USD to MWK at rate 1800:1) - use plans table prices
    const revenueResult = await query(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN p.currency = 'USD' THEN CAST(p.price AS DECIMAL) * 1800
          ELSE CAST(p.price AS DECIMAL)
        END
      ), 0) as total_revenue 
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.is_active = true
    `);
    const totalRevenue = parseFloat(revenueResult.rows[0].total_revenue);

    // Get monthly revenue (current month) - convert USD to MWK at rate 1800:1 - use plans table prices
    const monthlyRevenueResult = await query(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN p.currency = 'USD' THEN CAST(p.price AS DECIMAL) * 1800
          ELSE CAST(p.price AS DECIMAL)
        END
      ), 0) as monthly_revenue 
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.is_active = true 
      AND s.created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `);
    const monthlyRevenue = parseFloat(monthlyRevenueResult.rows[0].monthly_revenue);

    // Get total appointments
    const appointmentsResult = await query('SELECT COUNT(*) as count FROM appointments');
    const totalAppointments = parseInt(appointmentsResult.rows[0].count);

    // Get pending appointments (status = 0 typically means pending)
    const pendingAppointmentsResult = await query('SELECT COUNT(*) as count FROM appointments WHERE status = $1', [0]);
    const pendingAppointments = parseInt(pendingAppointmentsResult.rows[0].count);

    // Get user growth data (last 12 weeks)
    const userGrowthResult = await query(`
      SELECT 
        TO_CHAR(created_at, 'Mon DD') as week,
        COUNT(*) as count
      FROM users 
      WHERE created_at >= CURRENT_DATE - INTERVAL '12 weeks'
      GROUP BY TO_CHAR(created_at, 'Mon DD')
      ORDER BY MIN(created_at)
    `);
    const userGrowthData = userGrowthResult.rows.map(row => ({
      name: row.week,
      value: parseInt(row.count)
    }));

    // Get revenue data (last 12 weeks) - convert USD to MWK at rate 1800:1 - use plans table prices
    const revenueDataResult = await query(`
      SELECT 
        TO_CHAR(s.created_at, 'Mon DD') as week,
        COALESCE(SUM(
          CASE 
            WHEN p.currency = 'USD' THEN CAST(p.price AS DECIMAL) * 1800
            ELSE CAST(p.price AS DECIMAL)
          END
        ), 0) as revenue
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.created_at >= CURRENT_DATE - INTERVAL '12 weeks'
      GROUP BY TO_CHAR(s.created_at, 'Mon DD')
      ORDER BY MIN(s.created_at)
    `);
    const revenueData = revenueDataResult.rows.map(row => ({
      name: row.week,
      value: parseFloat(row.revenue)
    }));

    // Get subscription distribution
    const subscriptionDistResult = await query(`
      SELECT 
        CASE 
          WHEN p.price >= 500 THEN CONCAT(p.name, ' USD')
          ELSE CONCAT(p.name, ' MWK')
        END as name,
        COUNT(s.id) as count
      FROM plans p
      LEFT JOIN subscriptions s ON p.id = s.plan_id AND s.is_active = true
      GROUP BY p.id, p.name, p.price
      HAVING COUNT(s.id) > 0
      ORDER BY count DESC
    `);
    const subscriptionData = subscriptionDistResult.rows.map(row => ({
      name: row.name,
      value: parseInt(row.count)
    }));

    // Calculate percentage changes (comparing current month to previous month)
    const previousMonthUsersResult = await query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      AND created_at < DATE_TRUNC('month', CURRENT_DATE)
    `);
    const previousMonthUsers = parseInt(previousMonthUsersResult.rows[0].count);
    const userGrowthPercentage = previousMonthUsers > 0 
      ? Math.round(((totalUsers - previousMonthUsers) / previousMonthUsers) * 100)
      : 0;

    const previousMonthRevenueResult = await query(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN p.currency = 'USD' THEN CAST(p.price AS DECIMAL) * 1800
          ELSE CAST(p.price AS DECIMAL)
        END
      ), 0) as revenue 
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.is_active = true 
      AND s.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      AND s.created_at < DATE_TRUNC('month', CURRENT_DATE)
    `);
    const previousMonthRevenue = parseFloat(previousMonthRevenueResult.rows[0].revenue);
    const revenueGrowthPercentage = previousMonthRevenue > 0 
      ? Math.round(((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100)
      : 0;

    const previousMonthAppointmentsResult = await query(`
      SELECT COUNT(*) as count 
      FROM appointments 
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      AND created_at < DATE_TRUNC('month', CURRENT_DATE)
    `);
    const previousMonthAppointments = parseInt(previousMonthAppointmentsResult.rows[0].count);
    const appointmentGrowthPercentage = previousMonthAppointments > 0 
      ? Math.round(((totalAppointments - previousMonthAppointments) / previousMonthAppointments) * 100)
      : 0;

    const previousMonthSubscriptionsResult = await query(`
      SELECT COUNT(*) as count 
      FROM subscriptions 
      WHERE is_active = true 
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      AND created_at < DATE_TRUNC('month', CURRENT_DATE)
    `);
    const previousMonthSubscriptions = parseInt(previousMonthSubscriptionsResult.rows[0].count);
    const subscriptionGrowthPercentage = previousMonthSubscriptions > 0 
      ? Math.round(((activeSubscriptions - previousMonthSubscriptions) / previousMonthSubscriptions) * 100)
      : 0;

    // Get additional real-time stats (status = 1 typically means completed)
    const completedAppointmentsResult = await query('SELECT COUNT(*) as count FROM appointments WHERE status = $1', [1]);
    const completedAppointments = parseInt(completedAppointmentsResult.rows[0].count);

    const todayAppointmentsResult = await query(`
      SELECT COUNT(*) as count 
      FROM appointments 
      WHERE DATE(created_at) = CURRENT_DATE
    `);
    const todayAppointments = parseInt(todayAppointmentsResult.rows[0].count);

    const todayRevenueResult = await query(`
      SELECT COALESCE(SUM(
        CASE 
          WHEN p.currency = 'USD' THEN CAST(p.price AS DECIMAL) * 1800
          ELSE CAST(p.price AS DECIMAL)
        END
      ), 0) as revenue 
      FROM subscriptions s
      JOIN plans p ON s.plan_id = p.id
      WHERE s.is_active = true 
      AND DATE(s.created_at) = CURRENT_DATE
    `);
    const todayRevenue = parseFloat(todayRevenueResult.rows[0].revenue);

    const stats = {
      totalUsers,
      totalDoctors,
      totalPatients,
      activeSubscriptions,
      totalRevenue,
      monthlyRevenue,
      totalAppointments,
      pendingAppointments,
      completedAppointments,
      todayAppointments,
      todayRevenue,
      userGrowthPercentage,
      revenueGrowthPercentage,
      appointmentGrowthPercentage,
      subscriptionGrowthPercentage,
    };

    return NextResponse.json({
      stats,
      userGrowthData,
      revenueData,
      subscriptionData,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
