import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing basic database connection...');

    // Test basic connection
    const connectionTest = await query('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully');
    console.log('Current time:', connectionTest.rows[0].current_time);

    // Test users table
    console.log('Testing users table...');
    const usersResult = await query('SELECT COUNT(*) as count FROM users');
    console.log('Total users:', usersResult.rows[0].count);

    // Test table structure
    console.log('Testing table structure...');
    const tableInfo = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log('Available tables:', tableInfo.rows.map(row => row.table_name));

    return NextResponse.json({
      success: true,
      currentTime: connectionTest.rows[0].current_time,
      totalUsers: usersResult.rows[0].count,
      tables: tableInfo.rows.map(row => row.table_name)
    });

  } catch (error) {
    console.error('❌ Database test error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        stack: errorStack 
      }, 
      { status: 500 }
    );
  }
}






