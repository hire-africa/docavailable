# Performance & Optimization Guide

## Overview

This document outlines the performance optimizations implemented in the Doc Available backend API to ensure fast, scalable, and efficient operation.

## 🚀 Performance Optimizations Implemented

### 1. Database Query Optimization

#### Database Indexes
- **Performance Indexes Migration**: Added strategic indexes on frequently queried fields
- **Composite Indexes**: Created multi-column indexes for complex queries
- **Foreign Key Indexes**: Optimized relationship queries

```sql
-- Users table indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_active ON users(role, is_active);

-- Appointments table indexes
CREATE INDEX idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_doctor_date ON appointments(doctor_id, appointment_date);
CREATE INDEX idx_appointments_patient_date ON appointments(patient_id, appointment_date);
CREATE INDEX idx_appointments_status_date ON appointments(status, appointment_date);
```

#### Query Optimization
- **Eager Loading**: Implemented `with()` relationships to prevent N+1 queries
- **Pagination**: Added pagination to all list endpoints
- **Selective Loading**: Only load required fields when possible

### 2. Caching Implementation

#### Cache Service (`App\Services\CacheService`)
- **User Data Caching**: Cache user profiles with relationships
- **Appointment Caching**: Cache appointment lists with filters
- **Doctor Caching**: Cache available doctors with working hours
- **Dashboard Stats**: Cache admin dashboard statistics
- **Cache Duration**: 60 minutes for most data, 5 minutes for stats

#### Cache Keys Structure
```php
// User cache
'user_{userId}'

// Appointment cache
'user_appointments_{userId}_{role}_{perPage}_{status}_{date}'

// Doctor cache
'available_doctors_{perPage}_{specialty}_{date}'

// Stats cache
'admin_dashboard_stats'
```

#### Cache Invalidation
- **Automatic Invalidation**: Clear related caches when data changes
- **Manual Invalidation**: Admin can clear performance cache
- **Smart Invalidation**: Only clear affected caches

### 3. Queue Implementation

#### Background Jobs
- **Appointment Notifications**: Async email and push notifications
- **File Processing**: Image compression and optimization
- **Heavy Operations**: Move time-consuming tasks to background

#### Job Classes
```php
// Appointment notifications
App\Jobs\SendAppointmentNotification

// File processing
App\Jobs\ProcessFileUpload
```

#### Queue Configuration
- **Driver**: Database (configurable to Redis)
- **Retry Logic**: 3 attempts with exponential backoff
- **Timeout**: 30-60 seconds depending on job type
- **Failure Handling**: Log failures and cleanup

### 4. API Response Optimization

#### Pagination
- **Default**: 15-20 items per page
- **Configurable**: `per_page` parameter
- **Metadata**: Total count, current page, last page

#### Filtering & Sorting
- **Status Filtering**: Filter by appointment status
- **Date Filtering**: Filter by specific dates
- **Search**: Full-text search on user names and emails
- **Sorting**: Order by date, time, or relevance

#### Response Compression
- **Gzip**: Enable response compression
- **Headers**: Performance monitoring headers
- **Optimized JSON**: Minimize response size

### 5. File Upload Optimization

#### Image Processing
- **Multiple Sizes**: Generate thumbnails, preview, and full sizes
- **Compression**: Optimize image quality and file size
- **Format Optimization**: Convert to optimal formats
- **Async Processing**: Process images in background

#### File Types Supported
- **Profile Pictures**: 150x150 to 1200x1200px
- **Chat Images**: 100x100 to 800x800px
- **ID Documents**: 200x200 to 1200x1200px
- **PDFs**: Validation and storage

#### Storage Optimization
- **CDN Ready**: Structured for CDN integration
- **Cleanup**: Remove original files after processing
- **Error Handling**: Clean up failed uploads

### 6. Performance Monitoring

#### Performance Monitor Middleware
- **Response Time**: Track execution time in milliseconds
- **Memory Usage**: Monitor memory consumption
- **Request Logging**: Log slow requests (>1s)
- **Metrics Storage**: Store performance data in cache

#### Performance Headers
```
X-Execution-Time: 45.23ms
X-Memory-Usage: 12.5MB
```

#### Admin Performance Dashboard
- **Overall Stats**: Daily/hourly performance metrics
- **Endpoint Stats**: Per-endpoint performance analysis
- **Slowest Endpoints**: Identify performance bottlenecks
- **System Stats**: Server resource usage
- **Cache Stats**: Cache hit/miss rates
- **Queue Stats**: Background job statistics

## 📊 Performance Metrics

### Target Performance
- **Response Time**: < 200ms for most endpoints
- **Memory Usage**: < 50MB per request
- **Database Queries**: < 10 queries per request
- **Cache Hit Rate**: > 80%

### Monitoring Endpoints
```
GET /api/admin/performance/overall-stats
GET /api/admin/performance/endpoint-stats?endpoint=GET /api/appointments
GET /api/admin/performance/slowest-endpoints
GET /api/admin/performance/cache-stats
GET /api/admin/performance/database-stats
GET /api/admin/performance/system-stats
GET /api/admin/performance/queue-stats
POST /api/admin/performance/clear-cache
```

## 🔧 Configuration

### Cache Configuration
```php
// config/cache.php
'default' => env('CACHE_DRIVER', 'file'),
'stores' => [
    'file' => [
        'driver' => 'file',
        'path' => storage_path('framework/cache/data'),
    ],
    'redis' => [
        'driver' => 'redis',
        'connection' => 'cache',
    ],
],
```

### Queue Configuration
```php
// config/queue.php
'default' => env('QUEUE_CONNECTION', 'database'),
'connections' => [
    'database' => [
        'driver' => 'database',
        'table' => 'jobs',
        'queue' => 'default',
        'retry_after' => 90,
    ],
],
```

### Performance Monitoring
```php
// Add to routes
Route::middleware(['performance.monitor'])->group(function () {
    // Your routes
});
```

## 🚀 Deployment Optimizations

### Production Settings
```php
// config/app.php
'debug' => false,
'env' => 'production',

// config/cache.php
'default' => 'redis',

// config/queue.php
'default' => 'redis',
```

### Server Configuration
```nginx
# Nginx configuration
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;

# Cache static files
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Database Optimization
```sql
-- Enable query cache
SET GLOBAL query_cache_size = 67108864;
SET GLOBAL query_cache_type = 1;

-- Optimize tables
OPTIMIZE TABLE users, appointments, reviews;
```

## 📈 Performance Testing

### Load Testing
```bash
# Test with Apache Bench
ab -n 1000 -c 10 http://your-api.com/api/appointments

# Test with Artillery
artillery quick --count 100 --num 10 http://your-api.com/api/appointments
```

### Database Testing
```bash
# Test query performance
php artisan tinker
DB::enableQueryLog();
// Run your queries
DB::getQueryLog();
```

### Cache Testing
```bash
# Test cache performance
php artisan cache:clear
php artisan cache:table
```

## 🔍 Troubleshooting

### Common Performance Issues

#### Slow Queries
1. Check database indexes
2. Enable query logging
3. Analyze slow query log
4. Optimize complex queries

#### High Memory Usage
1. Check for memory leaks
2. Optimize image processing
3. Reduce eager loading
4. Implement pagination

#### Cache Issues
1. Check cache driver configuration
2. Verify cache permissions
3. Monitor cache hit rates
4. Clear cache if needed

#### Queue Issues
1. Check queue worker status
2. Monitor failed jobs
3. Verify queue configuration
4. Restart queue workers

### Performance Commands
```bash
# Clear all caches
php artisan cache:clear

# Restart queue workers
php artisan queue:restart

# Optimize autoloader
composer dump-autoload --optimize

# Clear compiled views
php artisan view:clear

# Optimize configuration
php artisan config:cache
php artisan route:cache
```

## 📚 Best Practices

### Code Optimization
1. **Use Eager Loading**: Always use `with()` for relationships
2. **Implement Pagination**: Never return unlimited results
3. **Cache Frequently**: Cache expensive operations
4. **Use Queues**: Move heavy tasks to background
5. **Optimize Images**: Compress and resize images
6. **Monitor Performance**: Track metrics continuously

### Database Optimization
1. **Use Indexes**: Create indexes on frequently queried columns
2. **Avoid N+1**: Use eager loading and relationships
3. **Limit Results**: Use pagination and limits
4. **Optimize Queries**: Use query builders efficiently
5. **Monitor Slow Queries**: Enable slow query logging

### Caching Strategy
1. **Cache Expensive Operations**: Cache database queries and API calls
2. **Use Appropriate TTL**: Set reasonable cache expiration times
3. **Invalidate Smartly**: Only clear affected caches
4. **Monitor Hit Rates**: Track cache effectiveness
5. **Use Redis for Production**: Better performance than file cache

### Queue Management
1. **Use Appropriate Queues**: Separate queues for different job types
2. **Handle Failures**: Implement proper error handling
3. **Monitor Queue Health**: Track job success/failure rates
4. **Scale Workers**: Adjust worker count based on load
5. **Retry Logic**: Implement exponential backoff

## 🎯 Future Optimizations

### Planned Improvements
1. **CDN Integration**: Implement CDN for static assets
2. **Database Sharding**: Scale database horizontally
3. **Microservices**: Split into smaller services
4. **GraphQL**: Implement GraphQL for flexible queries
5. **Real-time Updates**: WebSocket implementation
6. **Advanced Caching**: Redis cluster and cache warming

### Monitoring Enhancements
1. **APM Integration**: Application Performance Monitoring
2. **Alerting**: Performance threshold alerts
3. **Dashboards**: Real-time performance dashboards
4. **Log Aggregation**: Centralized logging system
5. **Metrics Export**: Export metrics to external systems

---

## 📞 Support

For performance-related issues or questions:
1. Check the logs in `storage/logs/`
2. Monitor performance metrics via admin dashboard
3. Review this documentation
4. Contact the development team

---

*Last updated: January 2025* 