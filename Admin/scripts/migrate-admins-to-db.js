const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

// Admin accounts from lib/auth.ts
const ADMIN_ACCOUNTS = [
  {
    email: 'blacksleeky84@gmail.com',
    name: 'Praise Mtosa',
    role: 'admin'
  },
  {
    email: 'admin@docavailable.com',
    name: 'System Admin',
    role: 'admin'
  },
  {
    email: 'macnyoni4@gmail.com',
    name: 'Mac Nyoni',
    role: 'admin'
  }
];

async function migrateAdminsToDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Migrating admin accounts to database...');
    
    for (const admin of ADMIN_ACCOUNTS) {
      console.log(`\n📝 Processing: ${admin.name} (${admin.email})`);
      
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id, user_type FROM users WHERE email = $1',
        [admin.email]
      );

      if (existingUser.rows.length > 0) {
        const user = existingUser.rows[0];
        console.log(`   User exists with ID: ${user.id}, type: ${user.user_type}`);
        
        if (user.user_type !== 'admin') {
          // Update existing user to admin
          await client.query(
            'UPDATE users SET user_type = $1, status = $2, updated_at = NOW() WHERE id = $3',
            ['admin', 'approved', user.id]
          );
          console.log('   ✅ Updated existing user to admin role');
        } else {
          console.log('   ✅ User is already an admin');
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
          admin.email,
          admin.name.split(' ')[0], // first_name
          admin.name.split(' ').slice(1).join(' '), // last_name
          'admin',
          'approved',
          true
        ]);

        console.log(`   ✅ Created new admin user with ID: ${result.rows[0].id}`);
      }
    }

    // Verify all admins were created/updated
    console.log('\n🔍 Verifying admin users in database...');
    const verifyAdmins = await client.query(
      'SELECT id, email, first_name, last_name, user_type, status FROM users WHERE user_type = $1 ORDER BY first_name',
      ['admin']
    );

    console.log('\n📋 Current admin users in database:');
    verifyAdmins.rows.forEach(admin => {
      console.log(`   - ID: ${admin.id} | ${admin.first_name} ${admin.last_name} (${admin.email}) | Status: ${admin.status}`);
    });

    console.log(`\n✅ Migration complete! Total admins: ${verifyAdmins.rows.length}`);

  } catch (error) {
    console.error('❌ Error migrating admins:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
migrateAdminsToDatabase()
  .then(() => {
    console.log('\n🎉 Admin migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Admin migration failed:', error);
    process.exit(1);
  });
