const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createAdminUser() {
  const client = await pool.connect();
  
  try {
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id, user_type FROM users WHERE email = $1',
      ['blacksleeky84@gmail.com']
    );

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      console.log(`User with email blacksleeky84@gmail.com already exists with ID: ${user.id} and type: ${user.user_type}`);
      
      if (user.user_type !== 'admin') {
        // Update existing user to admin
        await client.query(
          'UPDATE users SET user_type = $1, status = $2 WHERE id = $3',
          ['admin', 'approved', user.id]
        );
        console.log('✅ Updated existing user to admin role');
      } else {
        console.log('✅ User is already an admin');
      }
    } else {
      // Create new admin user
      const result = await client.query(`
        INSERT INTO users (
          email, first_name, last_name, user_type, status, 
          is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id
      `, [
        'blacksleeky84@gmail.com',
        'Praise',
        'Mtosa',
        'admin',
        'approved',
        true
      ]);

      console.log('✅ Created new admin user with ID:', result.rows[0].id);
    }

    // Verify the admin user
    const verifyUser = await client.query(
      'SELECT id, email, first_name, last_name, user_type, status FROM users WHERE email = $1',
      ['blacksleeky84@gmail.com']
    );

    if (verifyUser.rows.length > 0) {
      const user = verifyUser.rows[0];
      console.log('\n🎉 Admin User Created Successfully:');
      console.log('=====================================');
      console.log(`Name: ${user.first_name} ${user.last_name}`);
      console.log(`Email: ${user.email}`);
      console.log(`User Type: ${user.user_type}`);
      console.log(`Status: ${user.status}`);
      console.log(`User ID: ${user.id}`);
      console.log('\n📧 Admin Login Credentials:');
      console.log('============================');
      console.log('Email: blacksleeky84@gmail.com');
      console.log('Password: PraiseAdmin2024!');
      console.log('\n⚠️  Note: This email can be used for both admin and regular user accounts.');
      console.log('The system will determine the appropriate access level based on the login context.');
    }

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
createAdminUser();






