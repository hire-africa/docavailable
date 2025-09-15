FROM php:8.2-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    unzip \
    postgresql-client

# Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install pdo pdo_pgsql mbstring exif pcntl bcmath gd zip

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy the entire application
COPY . .

# Install dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Set proper permissions
RUN chown -R www-data:www-data /var/www \
    && chmod -R 755 /var/www \
    && chmod -R 775 storage \
    && chmod -R 775 bootstrap/cache

# Create storage directories
RUN mkdir -p storage/framework/{sessions,views,cache} \
    && mkdir -p storage/logs \
    && chmod -R 775 storage \
    && chmod -R 775 bootstrap/cache

# Copy environment file if it doesn't exist
RUN if [ ! -f .env ]; then cp .env.example .env; fi

# Generate application key only (JWT secret comes from environment variables)
RUN php artisan key:generate --force || echo "Key already exists"

# Expose port 8080
EXPOSE 8080

# Start server with proper configuration
CMD ["sh", "-c", "cd backend && echo '=== LARAVEL STARTUP ===' && php artisan config:clear && php artisan cache:clear && php artisan route:clear && php artisan view:clear && echo 'Testing database connection...' && php artisan tinker --execute='DB::connection()->getPdo(); echo \"Database connected successfully\";' && echo 'Running migrations...' && php artisan migrate --force || echo 'Migration failed, continuing anyway' && echo 'Starting Laravel server...' && php -S 0.0.0.0:8080 -t public"]
