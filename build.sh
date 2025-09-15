#!/bin/bash

# DocAvailable Docker Build Script

echo "🚀 Building DocAvailable Docker image..."

# Build the Docker image
docker build -t docavailable:latest .

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully!"
    echo ""
    echo "To run the application:"
    echo "  docker run -p 8000:8000 docavailable:latest"
    echo ""
    echo "Or use docker-compose:"
    echo "  docker-compose up"
    echo ""
    echo "The backend API will be available at: http://172.20.10.11:8000"
else
    echo "❌ Docker build failed!"
    exit 1
fi 