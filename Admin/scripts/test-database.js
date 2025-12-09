const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined
  }
});

async function testDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Testing Database Connection...\n');

    // Test basic connection
    const connectionTest = await client.query('SELECT NOW() as current_time');
    console.log('✅ Database connected successfully');
    console.log('Current time:', connectionTest.rows[0].current_time);

    // Check users table
    console.log('\n📊 Users Table:');
    const usersCount = await client.query('SELECT COUNT(*) as count FROM users');
    console.log('Total users:', usersCount.rows[0].count);

    const userTypes = await client.query(`
      SELECT user_type, COUNT(*) as count 
      FROM users 
      GROUP BY user_type 
      ORDER BY count DESC
    `);
    console.log('Users by type:');
    userTypes.rows.forEach(row => {
      console.log(`  ${row.user_type}: ${row.count}`);
    });

    // Check subscriptions table
    console.log('\n💳 Subscriptions Table:');
    const subsCount = await client.query('SELECT COUNT(*) as count FROM subscriptions');
    console.log('Total subscriptions:', subsCount.rows[0].count);

    const activeSubs = await client.query('SELECT COUNT(*) as count FROM subscriptions WHERE is_active = true');
    console.log('Active subscriptions:', activeSubs.rows[0].count);

    // Check plans table
    console.log('\n📋 Plans Table:');
    const plansCount = await client.query('SELECT COUNT(*) as count FROM plans');
    console.log('Total plans:', plansCount.rows[0].count);

    if (plansCount.rows[0].count > 0) {
      const plans = await client.query('SELECT id, name, price, status FROM plans ORDER BY id');
      console.log('Plans:');
      plans.rows.forEach(plan => {
        console.log(`  ID: ${plan.id}, Name: ${plan.name}, Price: ${plan.price}, Status: ${plan.status}`);
      });
    }

    // Check appointments table
    console.log('\n📅 Appointments Table:');
    const appsCount = await client.query('SELECT COUNT(*) as count FROM appointments');
    console.log('Total appointments:', appsCount.rows[0].count);

    const appStatuses = await client.query(`
      SELECT status, COUNT(*) as count 
      FROM appointments 
      GROUP BY status 
      ORDER BY count DESC
    `);
    console.log('Appointments by status:');
    appStatuses.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`);
    });

    // Check payment_transactions table
    console.log('\n💰 Payment Transactions Table:');
    const paymentsCount = await client.query('SELECT COUNT(*) as count FROM payment_transactions');
    console.log('Total payments:', paymentsCount.rows[0].count);

    // Sample data from each table
    console.log('\n📝 Sample Data:');
    
    if (usersCount.rows[0].count > 0) {
      const sampleUsers = await client.query('SELECT id, email, user_type, created_at FROM users LIMIT 3');
      console.log('Sample users:');
      sampleUsers.rows.forEach(user => {
        console.log(`  ID: ${user.id}, Email: ${user.email}, Type: ${user.user_type}, Created: ${user.created_at}`);
      });
    }

    if (subsCount.rows[0].count > 0) {
      const sampleSubs = await client.query('SELECT id, user_id, plan_id, is_active, created_at FROM subscriptions LIMIT 3');
      console.log('Sample subscriptions:');
      sampleSubs.rows.forEach(sub => {
        console.log(`  ID: ${sub.id}, User: ${sub.user_id}, Plan: ${sub.plan_id}, Active: ${sub.is_active}, Created: ${sub.created_at}`);
      });
    }

  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the test
testDatabase();
