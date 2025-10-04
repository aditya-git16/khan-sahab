#!/bin/bash

# Build script for Khan Sahab Restaurant Management System
# This script builds and deploys the Docker container

set -e  # Exit on error

echo "🍽️  Khan Sahab Restaurant - Docker Build Script"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    echo "Please install Docker Compose first: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker and Docker Compose are installed${NC}"
echo ""

# Stop existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
docker-compose down || true
echo ""

# Build the application
echo -e "${YELLOW}Building Docker image...${NC}"
docker-compose build --no-cache
echo ""

# Start the application
echo -e "${YELLOW}Starting the application...${NC}"
docker-compose up -d
echo ""

# Wait for the application to start
echo -e "${YELLOW}Waiting for application to start...${NC}"
sleep 5

# Check if the container is running
if [ "$(docker ps -q -f name=khan-sahab-restaurant)" ]; then
    echo -e "${GREEN}✓ Container is running${NC}"
    echo ""
    
    # Check health
    echo -e "${YELLOW}Checking application health...${NC}"
    for i in {1..10}; do
        if curl -f http://localhost:5001/api/health &> /dev/null; then
            echo -e "${GREEN}✓ Application is healthy and running!${NC}"
            echo ""
            echo "================================================"
            echo "🎉 Deployment successful!"
            echo "================================================"
            echo ""
            echo "Application URL: http://localhost:5001"
            echo ""
            echo "Useful commands:"
            echo "  View logs:       docker-compose logs -f"
            echo "  Stop app:        docker-compose down"
            echo "  Restart app:     docker-compose restart"
            echo "  Shell access:    docker exec -it khan-sahab-restaurant bash"
            echo ""
            exit 0
        fi
        echo "Waiting for application to be ready... ($i/10)"
        sleep 3
    done
    
    echo -e "${RED}Warning: Application started but health check failed${NC}"
    echo "Check logs with: docker-compose logs"
    exit 1
else
    echo -e "${RED}Error: Container failed to start${NC}"
    echo "Check logs with: docker-compose logs"
    exit 1
fi

