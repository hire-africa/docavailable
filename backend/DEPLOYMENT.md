# DocAvailable Backend Deployment Guide

This guide covers deploying the DocAvailable Laravel backend to different environments.

## 📋 Prerequisites

- PHP 8.1+ with required extensions
- Composer
- Database (SQLite, MySQL, or PostgreSQL)
- Web server (Apache/Nginx) or PHP built-in server
- Redis (optional, for production caching and queues)

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Copy environment file
cp env.example .env

# Generate application key
php artisan key:generate

# Generate JWT secret
php artisan jwt:secret
```

### 2. Database Setup

```bash
# Run migrations
php artisan migrate

# Seed database (optional)
php artisan db:seed
```

### 3. Storage Setup

```bash
# Create storage link
php artisan storage:link
```

### 4. Start Development Server

```bash
php artisan serve
```

## 🌍 Environment Configuration

### Required Environment Variables

Copy from `env.example` and configure:

```bash
# Application
APP_NAME="DocAvailable"
APP_ENV=local|staging|production
APP_KEY=base64:your-key-here
APP_DEBUG=true|false
APP_URL=http://172.20.10.11:8000

# Database
DB_CONNECTION=sqlite|mysql|pgsql
DB_DATABASE=database/database.sqlite
DB_HOST=127.0.0.1
DB_PORT=3306|5432
DB_USERNAME=root
DB_PASSWORD=

# JWT Authentication
JWT_SECRET=your-jwt-secret
JWT_TTL=60
JWT_REFRESH_TTL=20160

# CORS
FRONTEND_URL=http://172.20.10.11:3000

# Mail (for production)
MAIL_MAILER=smtp|log
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=null
MAIL_PASSWORD=null
MAIL_FROM_ADDRESS="hello@docavailable.com"
MAIL_FROM_NAME="DocAvailable"
```

### Production Settings

For production, ensure these settings:

```bash
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

# Use Redis for caching and queues
CACHE_STORE=redis
QUEUE_CONNECTION=redis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

# Use proper mail driver
MAIL_MAILER=smtp
MAIL_HOST=smtp.mailgun.org
MAIL_PORT=587
MAIL_USERNAME=your-username
MAIL_PASSWORD=your-password
MAIL_ENCRYPTION=tls
```

## 🚀 Deployment

### Using Deployment Script

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Deploy to production
./scripts/deploy.sh production

# Deploy to staging
./scripts/deploy.sh staging
```

### Manual Deployment

```bash
# Install dependencies
composer install --no-dev --optimize-autoloader

# Run migrations
php artisan migrate --force

# Clear and cache configuration
php artisan config:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Set up storage
php artisan storage:link

# Set permissions
chmod -R 755 storage bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

# Optimize for production
php artisan optimize

# Restart queue workers
php artisan queue:restart
```

## 🗄️ Database Management

### Backup Database

```bash
# Make script executable
chmod +x scripts/backup.sh

# Create backup
./scripts/backup.sh my_backup_name
```

### Restore Database

```bash
# Make script executable
chmod +x scripts/restore.sh

# Restore from backup
./scripts/restore.sh backups/my_backup_name.sql.gz
```

## 🔧 Web Server Configuration

### Apache (.htaccess already included)

The project includes a proper `.htaccess` file for Apache.

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/docavailable/backend/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;

    charset utf-8;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

## 🔒 Security Checklist

- [ ] `APP_DEBUG=false` in production
- [ ] `APP_KEY` is set and secure
- [ ] `JWT_SECRET` is set and secure
- [ ] Database credentials are secure
- [ ] Mail credentials are secure
- [ ] File permissions are correct
- [ ] HTTPS is enabled
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled

## 📊 Monitoring

### Health Check

The application provides a health check endpoint:

```bash
curl https://your-domain.com/up
```

### Logs

Check application logs:

```bash
tail -f storage/logs/laravel.log
```

### Queue Monitoring

```bash
# Check queue status
php artisan queue:work --once

# Monitor failed jobs
php artisan queue:failed
```

## 🔄 CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup PHP
      uses: shivammathur/setup-php@v2
      with:
        php-version: '8.1'
        extensions: mbstring, xml, ctype, iconv, intl, pdo_sqlite
        
    - name: Install Dependencies
      run: composer install --no-dev --optimize-autoloader
        
    - name: Deploy to Server
      run: |
        # Your deployment commands here
        ./scripts/deploy.sh production
```

## 🆘 Troubleshooting

### Common Issues

1. **500 Internal Server Error**
   - Check `storage/logs/laravel.log`
   - Ensure `APP_DEBUG=true` temporarily
   - Verify file permissions

2. **Database Connection Issues**
   - Check database credentials in `.env`
   - Ensure database server is running
   - Verify database exists

3. **JWT Token Issues**
   - Ensure `JWT_SECRET` is set
   - Run `php artisan jwt:secret` to generate

4. **Storage Issues**
   - Run `php artisan storage:link`
   - Check storage directory permissions

### Debug Mode

For debugging, temporarily set:

```bash
APP_DEBUG=true
LOG_LEVEL=debug
```

## 📞 Support

For deployment issues:

1. Check the logs: `storage/logs/laravel.log`
2. Verify environment configuration
3. Test database connectivity
4. Check web server configuration

## 🔄 Updates

To update the application:

```bash
# Pull latest changes
git pull origin main

# Run deployment script
./scripts/deploy.sh production

# Or manually:
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize
php artisan queue:restart
``` 