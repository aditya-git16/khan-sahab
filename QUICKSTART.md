# Khan Sahab Restaurant - Quick Start Guide

## Quick Deploy with Docker

### Prerequisites
- Docker and Docker Compose installed
- Git (optional, for cloning)

### Deploy in 3 Steps

1. **Clone or navigate to the project**
   ```bash
   cd khan_sahab
   ```

2. **Build and start the application**
   ```bash
   docker-compose up -d --build
   ```

3. **Access the application**
   - Open your browser and go to: `http://localhost:5001`
   - The database will be automatically initialized with sample menu items

That's it! The application is now running.

## Useful Commands

### View logs
```bash
docker-compose logs -f
```

### Stop the application
```bash
docker-compose down
```

### Restart the application
```bash
docker-compose restart
```

### Rebuild the application (after code changes)
```bash
docker-compose down
docker-compose up -d --build
```

### Access the container shell
```bash
docker exec -it khan-sahab-restaurant bash
```

### Backup database
```bash
docker cp khan-sahab-restaurant:/app/backend/instance/restaurant.db ./backup.db
```

### Restore database
```bash
docker cp ./backup.db khan-sahab-restaurant:/app/backend/instance/restaurant.db
docker-compose restart
```

## For Digital Ocean Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment instructions on Digital Ocean.

### Quick Deploy on Digital Ocean Droplet

1. **Create Ubuntu 22.04 Droplet on Digital Ocean**

2. **SSH into your droplet**
   ```bash
   ssh root@your_droplet_ip
   ```

3. **Install Docker**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   apt install docker-compose -y
   ```

4. **Clone and deploy**
   ```bash
   git clone <your-repo-url>
   cd khan_sahab
   docker-compose up -d --build
   ```

5. **Configure firewall**
   ```bash
   ufw allow 5001/tcp
   ufw enable
   ```

6. **Access your app**
   - Open: `http://your_droplet_ip:5001`

## Application Structure

```
khan_sahab/
├── backend/              # Flask API
│   ├── app.py           # Main application
│   ├── requirements.txt # Python dependencies
│   └── instance/        # Database location (created automatically)
├── frontend/            # React frontend
│   ├── src/            # Source code
│   └── package.json    # Node dependencies
├── Dockerfile          # Docker build instructions
├── docker-compose.yml  # Docker Compose configuration
└── DEPLOYMENT.md       # Detailed deployment guide
```

## Features

- **POS System**: Create and manage orders
- **Table Management**: Track table status and occupancy
- **Menu Management**: Add/edit menu items with categories
- **Billing**: Generate bills with tax calculations
- **Reports**: View sales statistics and reports
- **Print Support**: Print bills (network printer support)

## Default Configuration

- **Backend Port**: 5001
- **Database**: SQLite (auto-created in backend/instance/)
- **Sample Data**: 10 tables and full menu automatically loaded
- **Frontend**: Served from the same port as backend in production

## Troubleshooting

### Port already in use
```bash
# Find process using port 5001
lsof -i :5001

# Kill the process or change port in docker-compose.yml
```

### Container won't start
```bash
# Check logs
docker-compose logs

# Remove and recreate
docker-compose down -v
docker-compose up -d --build
```

### Database issues
```bash
# Reset database
docker-compose down
docker volume rm khan-sahab_khan-sahab-data
docker-compose up -d
```

## Support

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)

For production deployment best practices, including:
- Setting up Nginx reverse proxy
- Configuring SSL/HTTPS
- Database backups
- Monitoring and alerts
- Security hardening

