# Docker Deployment Guide

This guide explains how to deploy DocAvailable using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose (optional, for easier management)

## Quick Start

### Option 1: Using the build script

**Linux/Mac:**
```bash
chmod +x build.sh
./build.sh
```

**Windows:**
```cmd
build.bat
```

### Option 2: Manual Docker build

```bash
# Build the Docker image
docker build -t docavailable:latest .

# Run the container
docker run -p 8000:8000 docavailable:latest
```

### Option 3: Using Docker Compose

```bash
# Build and run using docker-compose
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

## Architecture

The Docker setup includes:

1. **Backend Service (Laravel)**
   - PHP 8.2 with FPM
   - Laravel application
   - Runs on port 8000
   - Includes all necessary PHP extensions

2. **Frontend Service (Optional)**
   - Node.js 18 Alpine
   - Expo React Native web build
   - Runs on port 3000 (commented out by default)

## Environment Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory or set environment variables:

```env
APP_NAME=DocAvailable
APP_ENV=production
APP_KEY=your-app-key
APP_DEBUG=false
APP_URL=http://172.20.10.11:8000

DB_CONNECTION=mysql
DB_HOST=your-database-host
DB_PORT=3306
DB_DATABASE=your-database-name
DB_USERNAME=your-database-user
DB_PASSWORD=your-database-password

JWT_SECRET=your-jwt-secret
JWT_TTL=60
JWT_REFRESH_TTL=20160
```

### Database Setup

The application requires a MySQL database. You can:

1. Use an external database service
2. Add a MySQL service to docker-compose.yml
3. Use a managed database service

## Production Deployment

### Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/docavailable/docavailable.git
cd docavailable
```

2. Set up environment variables:
```bash
cp backend/env.example backend/.env
# Edit backend/.env with your production settings
```

3. Build and run:
```bash
docker-compose up --build -d
```

### Using Docker directly

1. Build the image:
```bash
docker build -t docavailable:latest .
```

2. Run with environment variables:
```bash
docker run -d \
  -p 8000:8000 \
  -e APP_ENV=production \
  -e DB_HOST=your-db-host \
  -e DB_DATABASE=your-db-name \
  -e DB_USERNAME=your-db-user \
  -e DB_PASSWORD=your-db-password \
  docavailable:latest
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure your database is running and accessible
   - Check database credentials in environment variables
   - Verify network connectivity

2. **Permission Issues**
   - The Dockerfile sets proper permissions automatically
   - If you encounter permission issues, check the storage directory

3. **Port Already in Use**
   - Change the port mapping: `-p 8001:8000`
   - Or stop the service using the port

4. **Build Failures**
   - Ensure Docker has enough memory (at least 2GB)
   - Clear Docker cache: `docker system prune -a`
   - Check internet connectivity for package downloads

### Logs

View container logs:
```bash
# Using docker-compose
docker-compose logs -f

# Using docker directly
docker logs <container-id>
```

### Database Migrations

If you need to run migrations manually:
```bash
docker exec -it <container-id> php artisan migrate
```

## Development

For development, you can:

1. Mount the source code as a volume for live reloading
2. Enable debug mode in the environment
3. Use the development Dockerfile (if available)

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to version control
2. **Database**: Use strong passwords and restrict access
3. **HTTPS**: Use a reverse proxy (nginx) with SSL certificates
4. **Updates**: Regularly update the base images and dependencies

## Monitoring

Consider adding monitoring tools:
- Application performance monitoring (APM)
- Log aggregation
- Health checks
- Resource monitoring

## Support

For issues related to Docker deployment:
1. Check the logs: `docker logs <container-id>`
2. Verify environment variables
3. Test database connectivity
4. Review the Laravel logs in the container 