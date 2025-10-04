# Multi-stage Dockerfile for Khan Sahab Restaurant Management System

# Stage 1: Build React Frontend
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package*.json ./
RUN npm ci --only=production

# Copy frontend source code
COPY frontend/ ./

# Build the React app for production
RUN npm run build

# Stage 2: Python Backend Setup
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for reportlab and other packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libcairo2-dev \
    pkg-config \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Install gunicorn for production server
RUN pip install --no-cache-dir gunicorn

# Copy backend application code
COPY backend/ ./backend/

# Copy the built frontend from the previous stage
COPY --from=frontend-build /app/frontend/build ./frontend/build

# Create instance directory for SQLite database
RUN mkdir -p /app/backend/instance

# Copy logo files
COPY backend/khan_sahab_logo.jpg ./backend/

# Set environment variables
ENV FLASK_APP=backend/app.py
ENV FLASK_ENV=production
ENV PYTHONUNBUFFERED=1
ENV PORT=5001

# Expose port
EXPOSE 5001

# Create a startup script
RUN echo '#!/bin/bash\n\
cd /app/backend\n\
python -c "from app import app, db; \n\
with app.app_context(): \n\
    import os; \n\
    db_path = os.path.join(app.instance_path, \"restaurant.db\"); \n\
    if not os.path.exists(db_path): \n\
        print(\"Initializing database...\"); \n\
        from app import init_db; \n\
        init_db(); \n\
    else: \n\
        print(\"Database already exists, skipping initialization.\")"\n\
\n\
gunicorn --bind 0.0.0.0:5001 \\\n\
         --workers 4 \\\n\
         --threads 2 \\\n\
         --timeout 120 \\\n\
         --access-logfile - \\\n\
         --error-logfile - \\\n\
         app:app\n' > /app/start.sh && chmod +x /app/start.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:5001/api/health')" || exit 1

# Start the application
CMD ["/app/start.sh"]

