# DocAvailable Complete Setup Documentation

## Overview
This document provides a comprehensive guide to the DocAvailable application setup, including backend (Laravel), frontend (React Native with Expo), and the complete development build configuration.

## Project Architecture

### Frontend: React Native with Expo
- **Framework**: React Native 0.79.5 with Expo SDK 53
- **Navigation**: Expo Router 5.1.6
- **State Management**: React Context API
- **Build System**: EAS Build for development builds

### Backend: Laravel 12
- **Framework**: Laravel 12 with PHP 8.2
- **Database**: PostgreSQL (DigitalOcean Managed Database)
- **Authentication**: JWT with Laravel Sanctum
- **API**: RESTful API with comprehensive endpoints

### WebRTC Signaling Server
- **Technology**: Node.js with WebSocket (ws library)
- **Purpose**: Real-time audio/video call signaling
- **Deployment**: DigitalOcean Droplet

---

## Frontend Setup (React Native + Expo)

### 1. Core Configuration Files

#### `package.json` - Main Dependencies
```json
{
  "name": "docavailable-minimal",
  "main": "expo-router/entry",
  "version": "1.0.0",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "build:cloud-development": "eas build --platform android --profile development",
    "build:cloud-preview": "eas build --platform android --profile preview",
    "build:cloud-production": "eas build --platform android --profile production"
  }
}
```

**Key Dependencies:**
- `expo-dev-client`: Enables development builds
- `expo-router`: File-based routing system
- `react-native-webrtc`: WebRTC functionality for audio/video calls
- `@react-native-async-storage/async-storage`: Local storage
- `expo-auth-session`: OAuth authentication
- `expo-av`: Audio/video recording and playback

#### `app.config.js` - Expo Configuration
```javascript
export default {
  expo: {
    name: "DocAvailable",
    slug: "Doc_available",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#4CAF50"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.docavailable.minimal"
    },
    android: {
      package: "com.docavailable.app",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      }
    },
    scheme: "com.docavailable.app",
    linking: {
      prefixes: ["com.docavailable.app://"],
      config: {
        screens: {
          "oauth-callback": "oauth-callback"
        }
      }
    },
    plugins: [
      "expo-router",
      [
        "expo-av",
        {
          "microphonePermission": "Allow DocAvailable to access your microphone for audio calls with healthcare providers.",
          "cameraPermission": "Allow DocAvailable to access your camera for video consultations with healthcare providers."
        }
      ]
    ],
    extra: {
      // API Configuration
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "https://docavailable-3vbdv.ondigitalocean.app",
      laravelApiUrl: process.env.EXPO_PUBLIC_LARAVEL_API_URL || "https://docavailable-3vbdv.ondigitalocean.app",
      
      // Google OAuth Configuration
      EXPO_PUBLIC_GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_CLIENT_SECRET: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET,
      
      // WebRTC Configuration
      webrtc: {
        signalingUrl: process.env.EXPO_PUBLIC_WEBRTC_SIGNALING_URL || 'ws://46.101.123.123/audio-signaling',
        chatSignalingUrl: process.env.EXPO_PUBLIC_WEBRTC_CHAT_SIGNALING_URL || 'ws://46.101.123.123/chat-signaling',
        stunServers: process.env.EXPO_PUBLIC_WEBRTC_STUN_SERVERS ? 
          process.env.EXPO_PUBLIC_WEBRTC_STUN_SERVERS.split(',') : [
            'stun:stun.l.google.com:19302',
            'stun:stun1.l.google.com:19302'
          ],
        enableAudioCalls: process.env.EXPO_PUBLIC_ENABLE_AUDIO_CALLS !== 'false',
        enableVideoCalls: process.env.EXPO_PUBLIC_ENABLE_VIDEO_CALLS === 'true',
        enableCallRecording: process.env.EXPO_PUBLIC_ENABLE_CALL_RECORDING === 'true',
      },
      
      // EAS Configuration
      eas: {
        projectId: "55ebf2c0-d2b4-42ff-9b39-e65328778c63"
      }
    }
  }
};
```

#### `eas.json` - EAS Build Configuration
```json
{
  "cli": {
    "version": ">= 16.17.4",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development",
      "env": {
        "EXPO_IGNORE_TYPESCRIPT_ERRORS": "true"
      }
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview",
      "env": {
        "EXPO_IGNORE_TYPESCRIPT_ERRORS": "true",
        "EXPO_PUBLIC_WEBRTC_SIGNALING_URL": "ws://46.101.123.123/audio-signaling",
        "EXPO_PUBLIC_WEBRTC_CHAT_SIGNALING_URL": "ws://46.101.123.123/chat-signaling",
        "EXPO_PUBLIC_WEBRTC_STUN_SERVERS": "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302",
        "EXPO_PUBLIC_ENABLE_AUDIO_CALLS": "true",
        "EXPO_PUBLIC_ENABLE_VIDEO_CALLS": "false",
        "EXPO_PUBLIC_ENABLE_CALL_RECORDING": "false"
      }
    },
    "production": {
      "autoIncrement": true,
      "channel": "production",
      "env": {
        "EXPO_IGNORE_TYPESCRIPT_ERRORS": "true",
        "EXPO_PUBLIC_WEBRTC_SIGNALING_URL": "ws://46.101.123.123/audio-signaling",
        "EXPO_PUBLIC_WEBRTC_CHAT_SIGNALING_URL": "ws://46.101.123.123/chat-signaling",
        "EXPO_PUBLIC_WEBRTC_STUN_SERVERS": "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302",
        "EXPO_PUBLIC_ENABLE_AUDIO_CALLS": "true",
        "EXPO_PUBLIC_ENABLE_VIDEO_CALLS": "false",
        "EXPO_PUBLIC_ENABLE_CALL_RECORDING": "false"
      }
    }
  }
}
```

### 2. Environment Configuration

#### `.env` - Frontend Environment Variables
```env
# App Configuration
EXPO_PUBLIC_APP_NAME=DocAvailable
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_ENVIRONMENT=development

# API Configuration
EXPO_PUBLIC_API_BASE_URL=https://docavailable-3vbdv.ondigitalocean.app
EXPO_PUBLIC_API_TIMEOUT=30000

# Google OAuth Configuration
EXPO_PUBLIC_GOOGLE_CLIENT_ID=584940778531-f1n0j5i8a7bd7hm8g57fbafk0falikbv.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=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

# WebRTC Audio Call Configuration
EXPO_PUBLIC_WEBRTC_SIGNALING_URL=ws://46.101.123.123:8080/audio-signaling
EXPO_PUBLIC_WEBRTC_CHAT_SIGNALING_URL=ws://46.101.123.123:8081/chat-signaling
EXPO_PUBLIC_WEBRTC_STUN_SERVERS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
EXPO_PUBLIC_ENABLE_AUDIO_CALLS=true
EXPO_PUBLIC_ENABLE_VIDEO_CALLS=false
EXPO_PUBLIC_ENABLE_CALL_RECORDING=false

# AI Service Configuration
DEEPSEEK_API_KEY=your_deepseek_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

### 3. Build Configuration

#### `metro.config.js` - Metro Bundler Configuration
```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Simple configuration - remove complex resolver settings
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

// Basic resolver configuration
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// Add fallbacks for common module resolution issues
config.resolver.fallback = {
  ...config.resolver.fallback,
  'fs': false,
};

module.exports = config;
```

#### `babel.config.js` - Babel Configuration
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Handle reanimated
      'react-native-reanimated/plugin',
      // Add runtime transform
      ['@babel/plugin-transform-runtime', {
        helpers: true,
        regenerator: true,
        useESModules: false,
      }],
    ],
  };
};
```

---

## Backend Setup (Laravel 12)

### 1. Core Configuration Files

#### `backend/composer.json` - PHP Dependencies
```json
{
    "name": "laravel/laravel",
    "type": "project",
    "description": "The skeleton application for the Laravel framework.",
    "keywords": ["laravel", "framework"],
    "license": "MIT",
    "require": {
        "php": "^8.2",
        "doctrine/dbal": "^3.0",
        "google/auth": "^1.47",
        "intervention/image": "^3.0",
        "laravel/framework": "^12.0",
        "laravel/sanctum": "^4.1",
        "laravel/tinker": "^2.10.1",
        "onesignal/onesignal-php-api": "^2.2",
        "tymon/jwt-auth": "^2.2",
        "laravel/breeze": "^2.3"
    }
}
```

#### `backend/.env` - Backend Environment Variables
```env
APP_NAME="DocAvailable"
APP_ENV=production
APP_KEY=base64:your-app-key-here
APP_DEBUG=false
APP_URL=https://docavailable-3vbdv.ondigitalocean.app
APP_TIMEZONE=UTC
APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US

# Database Configuration - DigitalOcean PostgreSQL
DB_CONNECTION=pgsql
DB_HOST=docavailable-db-do-user-25123073-0.h.db.ondigitalocean.com
DB_PORT=25060
DB_DATABASE=defaultdb
DB_USERNAME=doadmin
DB_PASSWORD=your_database_password_here
DB_SSLMODE=require
DB_CHARSET=utf8

# Cache Configuration
CACHE_STORE=database
CACHE_PREFIX=laravel-cache-

# Queue Configuration
QUEUE_CONNECTION=database
QUEUE_FAILED_DRIVER=database-uuids

# Mail Configuration
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@docavailable.com
MAIL_FROM_NAME="DocAvailable"

# JWT Authentication
JWT_SECRET=your-jwt-secret-here
JWT_TTL=60
JWT_REFRESH_TTL=20160
JWT_ALGO=HS256

# CORS Configuration
FRONTEND_URL=https://docavailable-3vbdv.ondigitalocean.app

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# PayChangu Configuration
PAYCHANGU_ENVIRONMENT=production
PAYCHANGU_PUBLIC_KEY=your_paychangu_public_key_here
PAYCHANGU_SECRET_KEY=your_paychangu_secret_key_here
PAYCHANGU_WEBHOOK_SECRET=https://docavailable-3vbdv.ondigitalocean.app/api/payments/webhook
PAYCHANGU_CALLBACK_URL=https://docavailable-3vbdv.ondigitalocean.app/api/payments/paychangu/callback
PAYCHANGU_RETURN_URL=https://docavailable-3vbdv.ondigitalocean.app/api/payments/paychangu/return
```

### 2. Database Configuration

#### `backend/config/database.php` - Database Settings
```php
return [
    'default' => env('DB_CONNECTION', 'pgsql'),
    
    'connections' => [
        'pgsql' => [
            'driver' => 'pgsql',
            'url' => env('DB_URL'),
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '5432'),
            'database' => env('DB_DATABASE', 'laravel'),
            'username' => env('DB_USERNAME', 'root'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => env('DB_CHARSET', 'utf8'),
            'prefix' => '',
            'prefix_indexes' => true,
            'search_path' => 'public',
            'sslmode' => env('DB_SSLMODE', 'prefer'),
        ],
    ],
];
```

### 3. API Routes Configuration

#### `backend/routes/api.php` - Main API Routes
The API includes comprehensive endpoints for:
- Authentication (login, register, OAuth)
- User management
- Doctor profiles and reviews
- Appointments and working hours
- File uploads
- Chat and messaging
- Payment processing
- Admin functionality
- WebRTC signaling

### 4. Middleware Configuration

#### `backend/app/Http/Kernel.php` - Middleware Stack
```php
protected $middleware = [
    \App\Http\Middleware\TrustProxies::class,
    \Illuminate\Http\Middleware\HandleCors::class,
    \App\Http\Middleware\PreventRequestsDuringMaintenance::class,
    \Illuminate\Foundation\Http\Middleware\ValidatePostSize::class,
    \App\Http\Middleware\TrimStrings::class,
    \Illuminate\Foundation\Http\Middleware\ConvertEmptyStringsToNull::class,
    \App\Http\Middleware\ProcessQueueJobs::class, // Auto-process queue jobs
];
```

---

## WebRTC Signaling Server

### 1. Configuration

#### `backend/package.json` - WebRTC Server Dependencies
```json
{
  "name": "docavailable-webrtc-signaling",
  "version": "1.0.0",
  "description": "WebRTC signaling server for DocAvailable audio calls",
  "main": "webrtc-signaling-server.js",
  "scripts": {
    "start": "node webrtc-signaling-server.js",
    "dev": "nodemon webrtc-signaling-server.js"
  },
  "dependencies": {
    "ws": "^8.14.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### 2. Server Configuration
- **Port**: 8080 (audio signaling), 8081 (chat signaling)
- **Protocol**: WebSocket
- **Purpose**: Real-time communication for audio/video calls
- **Deployment**: DigitalOcean Droplet (46.101.123.123)

---

## Docker Configuration

### 1. Dockerfile
```dockerfile
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

# Expose port 8080
EXPOSE 8080

# Start server
CMD ["sh", "-c", "cd backend && php artisan config:clear && php artisan cache:clear && php artisan migrate --force && php -S 0.0.0.0:8080 -t public"]
```

### 2. Docker Compose
```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - APP_ENV=production
      - APP_DEBUG=false
      - DB_CONNECTION=pgsql
      - DB_HOST=docavailable-db-do-user-25123073-0.h.db.ondigitalocean.com
      - DB_PORT=25060
      - DB_DATABASE=defaultdb
      - DB_USERNAME=doadmin
      - DB_PASSWORD=${DB_PASSWORD}
    volumes:
      - ./backend/storage:/var/www/storage
    restart: unless-stopped
    networks:
      - docavailable-network

networks:
  docavailable-network:
    driver: bridge
```

---

## Development Build Setup (EAS)

### 1. Prerequisites
- Expo CLI installed globally: `npm install -g @expo/cli`
- EAS CLI installed: `npm install -g eas-cli`
- Expo account and project configured
- Android Studio (for Android builds)
- Xcode (for iOS builds)

### 2. EAS Build Profiles

#### Development Build
- **Purpose**: Local development with hot reloading
- **Features**: Full debugging, development client
- **Distribution**: Internal only
- **Channel**: development

#### Preview Build
- **Purpose**: Testing with production-like environment
- **Features**: Production optimizations, limited debugging
- **Distribution**: Internal
- **Channel**: preview

#### Production Build
- **Purpose**: App store deployment
- **Features**: Full optimizations, no debugging
- **Distribution**: App stores
- **Channel**: production

### 3. Build Commands

```bash
# Development build
npm run build:cloud-development

# Preview build
npm run build:cloud-preview

# Production build
npm run build:cloud-production

# Local development
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web
```

---

## Key Features Implementation

### 1. Authentication System
- **JWT Authentication**: Secure token-based authentication
- **Google OAuth**: Social login integration
- **Laravel Sanctum**: API authentication
- **Password Reset**: Email-based password recovery

### 2. Real-time Communication
- **WebRTC Audio Calls**: Peer-to-peer audio communication
- **WebSocket Signaling**: Real-time signaling server
- **Chat System**: Text-based messaging
- **File Sharing**: Image and document sharing

### 3. Payment Integration
- **PayChangu Gateway**: Payment processing
- **Subscription Management**: Recurring billing
- **Webhook Handling**: Payment status updates
- **Transaction Tracking**: Complete payment history

### 4. Database Architecture
- **PostgreSQL**: Primary database
- **DigitalOcean Managed Database**: Cloud-hosted solution
- **Migrations**: Version-controlled schema changes
- **Seeding**: Initial data population

### 5. File Management
- **DigitalOcean Spaces**: S3-compatible file storage
- **Image Processing**: Automatic image optimization
- **File Upload**: Secure file handling
- **CDN Integration**: Fast file delivery

---

## Deployment Architecture

### 1. Frontend Deployment
- **Platform**: EAS Build (Expo Application Services)
- **Distribution**: Internal (development/preview) and App Stores (production)
- **Environment Variables**: Configured per build profile
- **Updates**: OTA updates via Expo Updates

### 2. Backend Deployment
- **Platform**: DigitalOcean App Platform
- **Database**: DigitalOcean Managed PostgreSQL
- **Storage**: DigitalOcean Spaces
- **Domain**: docavailable-3vbdv.ondigitalocean.app

### 3. WebRTC Server
- **Platform**: DigitalOcean Droplet
- **IP**: 46.101.123.123
- **Ports**: 8080 (audio), 8081 (chat)
- **Protocol**: WebSocket

---

## Environment Variables Summary

### Frontend (.env)
- `EXPO_PUBLIC_API_BASE_URL`: Backend API URL
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`: Google OAuth client ID
- `EXPO_PUBLIC_WEBRTC_SIGNALING_URL`: WebRTC signaling server URL
- `EXPO_PUBLIC_ENABLE_AUDIO_CALLS`: Audio call feature flag

### Backend (backend/.env)
- `DB_HOST`: PostgreSQL database host
- `JWT_SECRET`: JWT signing secret
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `PAYCHANGU_SECRET_KEY`: Payment gateway secret

---

## Critical Files for Development

### Frontend
1. `package.json` - Dependencies and scripts
2. `app.config.js` - Expo configuration
3. `eas.json` - EAS build profiles
4. `.env` - Environment variables
5. `metro.config.js` - Metro bundler config
6. `babel.config.js` - Babel transpilation

### Backend
1. `backend/composer.json` - PHP dependencies
2. `backend/.env` - Backend environment
3. `backend/routes/api.php` - API routes
4. `backend/config/database.php` - Database config
5. `backend/app/Http/Kernel.php` - Middleware
6. `backend/webrtc-signaling-server.js` - WebRTC server

### Docker
1. `Dockerfile` - Container configuration
2. `docker-compose.yml` - Multi-service setup

---

## Development Workflow

### 1. Local Development
```bash
# Start frontend
npm start

# Start backend (in separate terminal)
cd backend && php artisan serve

# Start WebRTC server (in separate terminal)
cd backend && npm start
```

### 2. Building for Testing
```bash
# Development build
eas build --platform android --profile development

# Preview build
eas build --platform android --profile preview
```

### 3. Production Deployment
```bash
# Production build
eas build --platform android --profile production

# Submit to app stores
eas submit --platform android
```

---

## Troubleshooting

### Common Issues
1. **Metro bundler issues**: Clear cache with `npx expo start --clear`
2. **Database connection**: Check PostgreSQL credentials in `.env`
3. **WebRTC connection**: Verify signaling server is running
4. **Build failures**: Check EAS build logs for specific errors
5. **OAuth issues**: Verify Google OAuth configuration

### Debug Commands
```bash
# Test backend connection
npm run test:backend

# Test WebRTC connection
npm run test:webrtc

# Check database connection
cd backend && php artisan tinker
```

---

This documentation provides a complete overview of the DocAvailable application setup, from frontend React Native configuration to backend Laravel implementation, including the EAS development build process and deployment architecture.
