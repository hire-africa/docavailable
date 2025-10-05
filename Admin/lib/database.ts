import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined
  }
});

export default pool;

// Database query helper
export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    console.log('Executing query:', text);
    console.log('With params:', params);
    const result = await client.query(text, params);
    console.log('Query result:', result.rows.length, 'rows');
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    console.error('Query:', text);
    console.error('Params:', params);
    throw error;
  } finally {
    client.release();
  }
}

// Test database connection
export async function testConnection() {
  try {
    const result = await query('SELECT NOW()');
    console.log('Database connected successfully:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
