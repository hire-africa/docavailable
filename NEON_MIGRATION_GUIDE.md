# Neon Database Migration Guide

This guide will help you migrate your DocAvailable application from SQLite to Neon PostgreSQL.

## 🚀 Prerequisites

1. **Neon Account**: Sign up at https://neon.tech
2. **PHP PostgreSQL Extension**: Ensure you have the PostgreSQL extension installed
3. **Backup**: Create a backup of your current SQLite database

## 📋 Step-by-Step Migration

### Step 1: Set up Neon Database

1. **Create Neon Account**
   - Go to https://neon.tech
   - Sign up for a free account
   - Create a new project

2. **Get Connection Details**
   - In your Neon dashboard, go to your project
   - Copy the connection details:
     - Host
     - Database name
     - Username
     - Password
     - Port (usually 5432)

### Step 2: Update Environment Configuration

1. **Edit your `.env` file** in the `backend/` directory
2. **Replace the database configuration** with your Neon details:

```env
# Neon PostgreSQL Configuration
DB_CONNECTION=pgsql
DB_HOST=your-neon-host.neon.tech
DB_PORT=5432
DB_DATABASE=neondb
DB_USERNAME=your-neon-username
DB_PASSWORD=your-neon-password
DB_CHARSET=utf8
DB_SSLMODE=require
```

### Step 3: Install PostgreSQL Extension

Make sure you have the PostgreSQL PHP extension installed:

```bash
# For Ubuntu/Debian
sudo apt-get install php-pgsql

# For macOS with Homebrew
brew install php
# PostgreSQL extension should be included

# For Windows
# Download the appropriate PostgreSQL extension for your PHP version
```

### Step 4: Run the Migration Script

1. **Navigate to your backend directory**:
   ```bash
   cd backend
   ```

2. **Run the migration script**:
   ```bash
   php scripts/migrate-to-neon.php
   ```

3. **The script will**:
   - Test the Neon connection
   - Run Laravel migrations on Neon
   - Export data from SQLite
   - Import data to Neon PostgreSQL
   - Verify the migration

### Step 5: Verify Migration

1. **Test your application**:
   ```bash
   php artisan serve
   ```

2. **Check database connection**:
   ```bash
   php artisan tinker
   DB::connection()->getPdo();
   ```

3. **Verify data integrity**:
   - Check that all tables exist
   - Verify record counts
   - Test application functionality

## 🔧 Troubleshooting

### Common Issues

1. **Connection Failed**
   - Verify your Neon connection details
   - Check if your IP is whitelisted (if required)
   - Ensure SSL is properly configured

2. **Migration Errors**
   - Check PostgreSQL extension is installed
   - Verify Laravel migrations are compatible with PostgreSQL
   - Review error logs for specific issues

3. **Data Type Issues**
   - SQLite and PostgreSQL have different data types
   - The migration script handles most conversions automatically
   - Check for any JSON or boolean field issues

### SSL Configuration

Neon requires SSL connections. The configuration includes:
```env
DB_SSLMODE=require
```

If you encounter SSL issues, try:
```env
DB_SSLMODE=prefer
```

## 📊 Performance Optimization

### Neon-Specific Optimizations

1. **Connection Pooling**
   - Neon supports connection pooling
   - Configure your application to use connection pooling for better performance

2. **Indexes**
   - Review and optimize database indexes for PostgreSQL
   - Use PostgreSQL-specific index types when beneficial

3. **Query Optimization**
   - PostgreSQL has different query optimization than SQLite
   - Review slow queries and optimize them

## 🔒 Security Considerations

1. **Environment Variables**
   - Never commit your `.env` file to version control
   - Use environment variables for sensitive data

2. **SSL/TLS**
   - Always use SSL connections to Neon
   - Verify SSL certificates

3. **Access Control**
   - Use least privilege principle for database users
   - Regularly rotate passwords

## 📈 Monitoring

1. **Neon Dashboard**
   - Monitor database performance in Neon dashboard
   - Check connection metrics and query performance

2. **Application Logs**
   - Monitor Laravel logs for database errors
   - Set up proper logging for database operations

## 🔄 Rollback Plan

If you need to rollback to SQLite:

1. **Backup Neon data** (if needed)
2. **Update `.env`** to use SQLite configuration
3. **Restore SQLite database** from backup
4. **Test application** functionality

## 📞 Support

- **Neon Documentation**: https://neon.tech/docs
- **Laravel PostgreSQL**: https://laravel.com/docs/database#postgresql-configuration
- **PHP PostgreSQL**: https://www.php.net/manual/en/book.pgsql.php

## ✅ Migration Checklist

- [ ] Create Neon account and project
- [ ] Get connection details from Neon dashboard
- [ ] Update `.env` file with Neon configuration
- [ ] Install PostgreSQL PHP extension
- [ ] Run migration script
- [ ] Verify data migration
- [ ] Test application functionality
- [ ] Update deployment configurations
- [ ] Monitor performance
- [ ] Document any custom configurations

## 🎉 Benefits of Neon

1. **Serverless**: No server management required
2. **Scalable**: Automatic scaling based on demand
3. **Reliable**: Built on PostgreSQL with high availability
4. **Cost-effective**: Pay only for what you use
5. **Global**: Low-latency access from anywhere
6. **Secure**: Built-in security features and SSL

Your DocAvailable application is now running on a modern, scalable PostgreSQL database! 