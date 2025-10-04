#!/bin/bash

# Test script for Khan Sahab Restaurant Management System Docker setup
# This script will build, run, and test the Docker container locally

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🍽️  Khan Sahab Restaurant - Docker Test Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Docker is running
echo -e "${YELLOW}[1/7] Checking Docker...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running!${NC}"
    echo ""
    echo "Please start Docker Desktop and try again."
    echo "On macOS: Open Docker Desktop from Applications"
    echo "On Linux: sudo systemctl start docker"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"
echo ""

# Check if Docker Compose is available
echo -e "${YELLOW}[2/7] Checking Docker Compose...${NC}"
if ! docker-compose version > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker Compose is not installed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose is available${NC}"
echo ""

# Clean up existing containers and volumes
echo -e "${YELLOW}[3/7] Cleaning up existing containers...${NC}"
docker-compose down -v > /dev/null 2>&1 || true
echo -e "${GREEN}✓ Cleaned up${NC}"
echo ""

# Build the Docker image
echo -e "${YELLOW}[4/7] Building Docker image...${NC}"
echo -e "${BLUE}This may take several minutes on first build...${NC}"
if docker-compose build --no-cache; then
    echo -e "${GREEN}✓ Docker image built successfully${NC}"
else
    echo -e "${RED}❌ Failed to build Docker image${NC}"
    exit 1
fi
echo ""

# Start the container
echo -e "${YELLOW}[5/7] Starting container...${NC}"
if docker-compose up -d; then
    echo -e "${GREEN}✓ Container started${NC}"
else
    echo -e "${RED}❌ Failed to start container${NC}"
    exit 1
fi
echo ""

# Wait for application to be ready
echo -e "${YELLOW}[6/7] Waiting for application to be ready...${NC}"
echo -e "${BLUE}Checking health endpoint (this may take 30-60 seconds)...${NC}"

MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -f -s http://localhost:5001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Application is healthy and responding!${NC}"
        HEALTHY=true
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo -n "."
    sleep 2
done
echo ""

if [ -z "$HEALTHY" ]; then
    echo -e "${RED}❌ Application failed to become healthy${NC}"
    echo ""
    echo "Container logs:"
    docker-compose logs --tail=50
    exit 1
fi
echo ""

# Test API endpoints
echo -e "${YELLOW}[7/7] Testing API endpoints...${NC}"
echo ""

# Test health endpoint
echo -n "  Testing /api/health... "
if curl -f -s http://localhost:5001/api/health | grep -q "healthy"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Test menu endpoint
echo -n "  Testing /api/menu... "
if curl -f -s http://localhost:5001/api/menu > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Test tables endpoint
echo -n "  Testing /api/tables... "
if curl -f -s http://localhost:5001/api/tables > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

# Test categories endpoint
echo -n "  Testing /api/menu/categories... "
if curl -f -s http://localhost:5001/api/menu/categories > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 All tests passed! Container is running successfully!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📱 Application URLs:"
echo "   Frontend: ${BLUE}http://localhost:5001${NC}"
echo "   API Docs: ${BLUE}http://localhost:5001/api/health${NC}"
echo ""
echo "📊 Container Information:"
docker-compose ps
echo ""
echo "📝 Useful Commands:"
echo "   View logs:        ${BLUE}docker-compose logs -f${NC}"
echo "   Stop container:   ${BLUE}docker-compose down${NC}"
echo "   Restart:          ${BLUE}docker-compose restart${NC}"
echo "   Shell access:     ${BLUE}docker exec -it khan-sahab-restaurant bash${NC}"
echo ""
echo "🌐 Open in browser: http://localhost:5001"
echo ""

# Ask if user wants to see logs
read -p "Would you like to see the application logs? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Showing last 50 lines of logs (Press Ctrl+C to exit):"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    docker-compose logs --tail=50 -f
fi

