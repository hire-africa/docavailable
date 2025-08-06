# This Dockerfile is for Render deployment
# It simply copies the backend directory and uses the backend Dockerfile

FROM php:8.2-fpm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    unzip

# Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy backend directory contents
COPY backend/ .

# Install dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Set proper permissions
RUN chown -R www-data:www-data /var/www \
    && chmod -R 755 /var/www \
    && chmod -R 775 storage \
    && chmod -R 775 bootstrap/cache

# Create storage directories if they don't exist
RUN mkdir -p storage/framework/{sessions,views,cache} \
    && mkdir -p storage/logs \
    && chmod -R 775 storage \
    && chmod -R 775 bootstrap/cache

# Copy environment file if it doesn't exist
RUN if [ ! -f .env ]; then cp .env.example .env; fi

# Generate application key and JWT secret (only if not already set)
RUN php artisan key:generate --force || echo "Key already exists"
RUN php artisan jwt:secret --force || echo "JWT secret already exists"

# Run migrations (only if database is available)
RUN php artisan migrate --force || echo "Migrations failed, will retry at runtime"

# Cache configurations
RUN php artisan config:cache || echo "Config cache failed"
RUN php artisan route:cache || echo "Route cache failed"
RUN php artisan view:cache || echo "View cache failed"

# Create storage link
RUN php artisan storage:link || echo "Storage link already exists"

# Expose port 8000
EXPOSE 8000

# Start server
CMD php artisan serve --host=0.0.0.0 --port=8000 