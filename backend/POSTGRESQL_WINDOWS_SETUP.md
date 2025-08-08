# PostgreSQL Setup for Windows - DocAvailable

This guide will help you set up PostgreSQL standalone on Windows for your DocAvailable backend.

## 🚀 Prerequisites

1. **Windows 10/11** (64-bit recommended)
2. **PHP 8.0+** installed and configured
3. **Composer** installed
4. **Git** (optional, for version control)

## 📋 Step-by-Step Setup

### Step 1: Install PostgreSQL

1. **Download PostgreSQL**
   - Go to https://www.postgresql.org/download/windows/
   - Download PostgreSQL 15 or later
   - Run the installer as Administrator

2. **Installation Settings**
   - **Installation Directory**: `C:\Program Files\PostgreSQL\15\` (default)
   - **Data Directory**: `C:\Program Files\PostgreSQL\15\data\` (default)
   - **Port**: `5432` (default)
   - **Locale**: `Default locale` (recommended)
   - **Password**: Set a strong password for the `postgres` user
   - **Stack Builder**: Uncheck (not needed)

3. **Post-Installation**
   - Add PostgreSQL to PATH: `C:\Program Files\PostgreSQL\15\bin\`
   - Restart your command prompt/PowerShell

### Step 2: Install PHP PostgreSQL Extension

1. **Check PHP Version**
   ```cmd
   php -v
   ```

2. **Download Extension**
   - Go to https://windows.php.net/downloads/pecl/releases/pgsql/
   - Download the appropriate version for your PHP
   - Extract `php_pgsql.dll`

3. **Install Extension**
   - Copy `php_pgsql.dll` to your PHP extensions directory
   - Edit `php.ini` and add: `extension=pgsql`
   - Restart your web server (if using one)

### Step 3: Run Setup Script

1. **Navigate to Backend Directory**
   ```cmd
   cd backend
   ```

2. **Run PowerShell Setup Script**
   ```powershell
   powershell -ExecutionPolicy Bypass -File setup_postgres_windows.ps1
   ```

   Or run the batch file:
   ```cmd
   setup_postgres_windows.bat
   ```

3. **Follow the Prompts**
   - Enter database name (default: `docavailable`)
   - Enter username (default: `docavailable_user`)
   - Enter password (required)

### Step 4: Verify Installation

1. **Test PostgreSQL Connection**
   ```cmd
   php test_postgres_connection.php
   ```

2. **Test Laravel Connection**
   ```cmd
   php artisan tinker
   DB::connection()->getPdo();
   ```

3. **Run Migrations**
   ```cmd
   php artisan migrate
   ```

4. **Seed Database**
   ```cmd
   php artisan db:seed
   ```

## 🔧 Manual Configuration (Alternative)

If the setup script doesn't work, you can configure manually:

### 1. Create Database and User

```cmd
psql -U postgres
```

```sql
CREATE DATABASE docavailable;
CREATE USER docavailable_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE docavailable TO docavailable_user;
\q
```

### 2. Update .env File

Edit your `.env` file and update these lines:

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=docavailable
DB_USERNAME=docavailable_user
DB_PASSWORD=your_password
DB_CHARSET=utf8
DB_SSLMODE=prefer
```

### 3. Clear Laravel Cache

```cmd
php artisan config:clear
php artisan cache:clear
```

## 🐳 Docker Alternative (Recommended)

If you prefer Docker, create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: docavailable-postgres
    environment:
      POSTGRES_DB: docavailable
      POSTGRES_USER: docavailable_user
      POSTGRES_PASSWORD: your_secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: docavailable-redis
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  postgres_data:
```

Then run:
```cmd
docker-compose up -d
```

## 🔍 Troubleshooting

### Common Issues

1. **PostgreSQL not found**
   - Add PostgreSQL to PATH
   - Restart command prompt
   - Verify installation: `psql --version`

2. **PHP PostgreSQL extension not found**
   - Download correct version for your PHP
   - Check `php.ini` configuration
   - Restart web server

3. **Connection refused**
   - Check if PostgreSQL service is running
   - Verify port 5432 is not blocked
   - Check firewall settings

4. **Authentication failed**
   - Verify username and password
   - Check `pg_hba.conf` configuration
   - Try connecting as `postgres` user first

### Verification Commands

```cmd
# Check PostgreSQL installation
psql --version

# Check PHP extensions
php -m | findstr pgsql

# Test PostgreSQL connection
psql -U postgres -c "SELECT version();"

# Test Laravel connection
php artisan tinker
DB::connection()->getPdo();
```

## 📊 Benefits of Local PostgreSQL

1. **Better Performance**: Direct connection without XAMPP overhead
2. **Easier Development**: More control over configuration
3. **Production-like Environment**: Closer to production setup
4. **No Port Conflicts**: Avoid conflicts with MySQL in XAMPP
5. **Better Tooling**: Access to PostgreSQL-specific tools

## 🔄 Migration from Neon

If you want to migrate data from Neon to local PostgreSQL:

1. **Export from Neon**
   ```cmd
   pg_dump "postgresql://neondb_owner:npg_FjoWxz8OU4CQ@ep-hidden-brook-aemmopjb-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require" > neon_backup.sql
   ```

2. **Import to Local PostgreSQL**
   ```cmd
   psql -U docavailable_user -d docavailable -f neon_backup.sql
   ```

## 🎉 Next Steps

After successful setup:

1. **Test your application**: `php artisan serve`
2. **Run migrations**: `php artisan migrate`
3. **Seed data**: `php artisan db:seed`
4. **Test API endpoints**: Use Postman or similar tool
5. **Monitor logs**: Check `storage/logs/laravel.log`

## 📞 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Laravel logs: `storage/logs/laravel.log`
3. Check PostgreSQL logs: `C:\Program Files\PostgreSQL\15\data\pg_log\`
4. Verify your `.env` configuration
5. Test with the provided test scripts

---

**Happy coding! 🚀** 