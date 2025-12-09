const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createAdminsTable() {
  const client = await pool.connect();
  
  try {
    console.log('Creating admins table...');
    
    // Create admins table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✅ Admins table created successfully');

    // Insert admin accounts
    const adminAccounts = [
      {
        email: 'blacksleeky84@gmail.com',
        password: 'PraiseAdmin2024!',
        name: 'Praise Mtosa',
        role: 'admin'
      },
      {
        email: 'admin@docavailable.com',
        password: 'admin123',
        name: 'System Admin',
        role: 'admin'
      },
      {
        email: 'macnyoni4@gmail.com',
        password: 'MacAdmin2025!',
        name: 'Mac Nyoni',
        role: 'admin'
      }
    ];

    console.log('Inserting admin accounts...');
    
    for (const admin of adminAccounts) {
      // Check if admin already exists
      const existingAdmin = await client.query(
        'SELECT id FROM admins WHERE email = $1',
        [admin.email]
      );

      if (existingAdmin.rows.length === 0) {
        await client.query(`
          INSERT INTO admins (email, password, name, role, is_active)
          VALUES ($1, $2, $3, $4, $5)
        `, [admin.email, admin.password, admin.name, admin.role, true]);
        
        console.log(`✅ Created admin: ${admin.name} (${admin.email})`);
      } else {
        console.log(`⚠️  Admin already exists: ${admin.name} (${admin.email})`);
      }
    }

    // Verify admins were created
    const verifyAdmins = await client.query(
      'SELECT id, email, name, role, is_active FROM admins ORDER BY name'
    );

    console.log('\n📋 Current admins in database:');
    verifyAdmins.rows.forEach(admin => {
      console.log(`- ${admin.name} (${admin.email}) - ${admin.role} - Active: ${admin.is_active}`);
    });

    console.log(`\n✅ Total admins: ${verifyAdmins.rows.length}`);

  } catch (error) {
    console.error('❌ Error creating admins table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
createAdminsTable()
  .then(() => {
    console.log('\n🎉 Admins table setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Setup failed:', error);
    process.exit(1);
  });
