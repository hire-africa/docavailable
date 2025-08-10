# Multi-stage Dockerfile for DocAvailable
# Stage 1: Backend (Laravel) - Main service
FROM php:8.2-apache as backend

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
    supervisor \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PostgreSQL dependencies
RUN apt-get update && apt-get install -y libpq-dev

# Install PHP extensions (including PostgreSQL)
RUN docker-php-ext-install pdo_pgsql pdo_mysql mbstring exif pcntl bcmath gd zip

# Verify PostgreSQL extension is installed
RUN php -m | grep pdo_pgsql || echo "WARNING: pdo_pgsql extension not found"
RUN php -m | grep pgsql || echo "WARNING: pgsql extension not found"

# Test PDO PostgreSQL driver
RUN php -r "var_dump(PDO::getAvailableDrivers());" || echo "WARNING: PDO drivers test failed"

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Copy backend composer files first for better caching
COPY backend/composer.json backend/composer.lock ./

# Install dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Copy backend application directory contents
COPY backend/ .

# Verify public directory exists and has content
RUN ls -la public/ || echo "Public directory check failed"

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

# Create storage link
RUN php artisan storage:link || echo "Storage link already exists"

# Ensure public directory exists and has proper permissions
RUN mkdir -p public \
    && chmod -R 755 public \
    && chown -R www-data:www-data public

# Configure Apache
RUN a2enmod rewrite
RUN a2enmod headers
COPY backend/apache.conf /etc/apache2/sites-available/000-default.conf

# Copy startup script
COPY backend/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Expose port 8000
EXPOSE 8000

# Start using our script
CMD ["/usr/local/bin/start.sh"]

# Stage 2: Frontend (Expo/React Native) - Optional for web deployment
FROM node:18-alpine as frontend

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy frontend source
COPY . .

# Build for web (optional)
RUN npm run web || echo "Web build not configured"

# Expose port 3000 for web frontend
EXPOSE 3000

# Start web server (optional)
CMD ["npm", "start", "--", "--web"] 
