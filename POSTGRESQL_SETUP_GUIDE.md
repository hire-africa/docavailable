# PostgreSQL and PHP Configuration Fix Guide

## Issues Identified:
1. PostgreSQL not found in PATH
2. PHP PostgreSQL extension missing (php_pgsql.dll not loading)
3. Environment configuration issues

## Step-by-Step Fixes:

### 1. Add PostgreSQL to System PATH
Run the provided batch script as Administrator:
```bash
# Run as Administrator
add_postgresql_to_path.bat
```

### 2. Copy Required PostgreSQL DLLs
Run the provided batch script as Administrator:
```bash
# Run as Administrator
fix_postgresql_php.bat
```

### 3. Restart Services
After running the scripts:
1. Restart your terminal/command prompt
2. Restart Apache/XAMPP
3. Restart your Laravel development server

### 4. Verify PostgreSQL Installation
```bash
psql --version
```

### 5. Verify PHP PostgreSQL Extensions
```bash
php -m | findstr pgsql
```

### 6. Test Database Connection
Navigate to your Laravel backend directory and run:
```bash
cd backend
php artisan tinker
# Then test the connection:
DB::connection()->getPdo();
```

## Environment Configuration

Your `.env` file has been updated with proper database configuration:
- DB_CONNECTION=pgsql
- DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD are now explicitly set
- DB_URL is maintained for compatibility

## Troubleshooting

### If PostgreSQL extension still doesn't load:
1. Check if all required DLLs are in C:\xampp\php\ext\
2. Verify PostgreSQL bin directory is in PATH
3. Restart Apache/XAMPP completely

### If database connection fails:
1. Verify your Neon PostgreSQL credentials
2. Check if the database is accessible from your IP
3. Test connection using psql command line

### Manual PATH Addition (if scripts don't work):
1. Open System Properties > Environment Variables
2. Edit the PATH variable
3. Add: C:\Program Files\PostgreSQL\17\bin
4. Click OK and restart

## Verification Commands

After completing all steps, run these commands to verify:

```bash
# Check PostgreSQL in PATH
where psql

# Check PHP PostgreSQL extensions
php -m | findstr pgsql

# Test Laravel database connection
cd backend
php artisan migrate:status
```

## Notes
- Your Laravel app is configured to use Neon PostgreSQL (cloud database)
- The local PostgreSQL installation is mainly for the PHP extensions
- Make sure your Neon database is accessible and the credentials are correct 