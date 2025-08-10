# Simple Laravel Dockerfile for Render
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
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install pdo_pgsql pdo_mysql mbstring exif pcntl bcmath gd zip

# Get Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www

# Debug: Check what's in the build context
RUN echo "=== Debug: Build context ===" && ls -la /var/www || echo "Build context is empty"

# Copy the entire Laravel application first
COPY backend/ .

# Debug: Check what files were copied
RUN echo "=== Debug: Files in /var/www after copy ===" && ls -la /var/www
RUN echo "=== Debug: Files in /var/www/public ===" && ls -la /var/www/public || echo "public directory not found"
RUN echo "=== Debug: Checking for key Laravel files ===" && \
    echo "artisan exists: $(test -f artisan && echo 'YES' || echo 'NO')" && \
    echo "index.php exists: $(test -f public/index.php && echo 'YES' || echo 'NO')" && \
    echo "router.php exists: $(test -f public/router.php && echo 'YES' || echo 'NO')"

# Debug: Check composer files
RUN echo "=== Debug: Composer files ===" && \
    echo "composer.json exists: $(test -f composer.json && echo 'YES' || echo 'NO')" && \
    echo "composer.lock exists: $(test -f composer.lock && echo 'YES' || echo 'NO')" && \
    echo "composer.json content:" && head -20 composer.json || echo "composer.json not found"

# Install dependencies with more debugging and fallback options
RUN echo "=== Starting composer install ===" && \
    echo "=== PHP version: $(php -v)" && \
    echo "=== Composer version: $(composer --version)" && \
    echo "=== Available memory: $(free -h || echo 'free command not available')" && \
    composer install --optimize-autoloader --no-interaction --prefer-dist --no-progress --no-dev || \
    (echo "=== First attempt failed, trying without --no-dev ===" && \
     composer install --optimize-autoloader --no-interaction --prefer-dist --no-progress) || \
    (echo "=== Second attempt failed, trying with verbose output ===" && \
     composer install --optimize-autoloader --no-interaction --prefer-dist -vvv) || \
    (echo "=== All attempts failed, trying with memory limit ===" && \
     COMPOSER_MEMORY_LIMIT=-1 composer install --optimize-autoloader --no-interaction --prefer-dist --no-progress)

# Set permissions
RUN chown -R www-data:www-data /var/www \
    && chmod -R 755 /var/www \
    && chmod -R 775 storage \
    && chmod -R 775 bootstrap/cache

# Create storage directories
RUN mkdir -p storage/framework/{sessions,views,cache} \
    && mkdir -p storage/logs \
    && chmod -R 775 storage \
    && chmod -R 775 bootstrap/cache

# Copy environment file
RUN if [ ! -f .env ]; then cp .env.example .env; fi

# Generate keys
RUN php artisan key:generate --force || echo "Key already exists"
RUN php artisan jwt:secret --force || echo "JWT secret already exists"

# Create storage link
RUN php artisan storage:link || echo "Storage link already exists"

# Copy startup script
COPY backend/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Expose port 8000
EXPOSE 8000

# Start the application
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
