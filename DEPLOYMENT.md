# Khan Sahab Restaurant - Deployment Guide for Digital Ocean

This guide will help you deploy the Khan Sahab Restaurant Management System on Digital Ocean.

## Prerequisites

- A Digital Ocean account
- Docker installed on your Digital Ocean Droplet
- Basic knowledge of SSH and Linux command line

## Option 1: Deploy on Digital Ocean Droplet (Recommended)

### Step 1: Create a Droplet

1. Log in to your Digital Ocean account
2. Create a new Droplet with the following specifications:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic (Regular) - $12/month (2 GB RAM, 1 vCPU) or higher
   - **Datacenter**: Choose closest to your location
   - **Additional Options**: Enable "Monitoring"

### Step 2: Install Docker on the Droplet

SSH into your droplet:
```bash
ssh root@your_droplet_ip
```

Install Docker and Docker Compose:
```bash
# Update package list
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Start Docker
systemctl start docker
systemctl enable docker
```

### Step 3: Deploy the Application

1. Clone or upload your application to the droplet:
```bash
# Option A: Using Git (recommended)
git clone <your-repository-url>
cd khan_sahab

# Option B: Upload via SCP from your local machine
# From your local machine:
# scp -r /Users/adityaanand/khan_sahab root@your_droplet_ip:/root/
```

2. Build and run the application:
```bash
cd khan_sahab

# Build the Docker image
docker-compose build

# Start the application
docker-compose up -d
```

3. Verify the application is running:
```bash
# Check container status
docker-compose ps

# Check logs
docker-compose logs -f
```

4. The application should now be accessible at:
   - `http://your_droplet_ip:5001`

### Step 4: Configure Firewall

```bash
# Allow SSH (if not already allowed)
ufw allow ssh

# Allow application port
ufw allow 5001/tcp

# Enable firewall
ufw enable
```

### Step 5: Access Your Application

Your application is now running and accessible at:
- `http://your_droplet_ip:5001`

If you have a domain name, point it to your droplet's IP address and access via:
- `http://your_domain.com:5001`

## Option 2: Deploy on Digital Ocean App Platform

### Step 1: Prepare Your Repository

1. Push your code to GitHub/GitLab
2. Ensure your repository includes:
   - Dockerfile
   - docker-compose.yml (optional for App Platform)
   - All application code

### Step 2: Create App on Digital Ocean

1. Go to Digital Ocean App Platform
2. Click "Create App"
3. Connect your GitHub/GitLab repository
4. Select the branch to deploy from
5. Digital Ocean will auto-detect the Dockerfile
6. Configure:
   - **Name**: khan-sahab-restaurant
   - **Region**: Choose closest to your location
   - **Plan**: Basic ($12/month or higher)
   - **Environment Variables**: Add any required variables

### Step 3: Configure Health Checks

- Path: `/api/health`
- Port: `5001`

### Step 4: Deploy

Click "Create Resources" and wait for deployment to complete.

## Managing the Application

### View Logs
```bash
docker-compose logs -f
```

### Stop the Application
```bash
docker-compose down
```

### Restart the Application
```bash
docker-compose restart
```

### Update the Application
```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

### Backup Database
```bash
# Create backup
docker cp khan-sahab-restaurant:/app/backend/instance/restaurant.db ./backup_$(date +%Y%m%d).db
```

### Restore Database
```bash
# Restore from backup
docker cp ./backup_20231215.db khan-sahab-restaurant:/app/backend/instance/restaurant.db
docker-compose restart
```

## Database Management

The SQLite database is persisted in a Docker volume. To access it:

```bash
# Access the container
docker exec -it khan-sahab-restaurant bash

# Navigate to database location
cd /app/backend/instance

# You can copy it out or use sqlite3 to query it
```

## Monitoring

### Check Application Health
```bash
curl http://localhost:5001/api/health
```

### Monitor Resource Usage
```bash
docker stats khan-sahab-restaurant
```

### Set Up Monitoring Alerts

1. Enable Digital Ocean Monitoring in your droplet settings
2. Configure alerts for:
   - CPU usage > 80%
   - Memory usage > 80%
   - Disk usage > 80%

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs

# Check if port is already in use
netstat -tulpn | grep 5001
```

### Database issues
```bash
# Recreate database
docker-compose down
docker volume rm khan-sahab_khan-sahab-data
docker-compose up -d
```

### Frontend not loading
```bash
# Rebuild with no cache
docker-compose build --no-cache
docker-compose up -d
```

## Security Best Practices

1. **Change default secret key** in app.py or use environment variable
2. **Keep system updated**: `apt update && apt upgrade`
3. **Use strong passwords** for all accounts
4. **Enable firewall** with only necessary ports open
5. **Regular backups** of the database
6. **Monitor logs** for suspicious activity
7. **Use SSL/HTTPS** for production
8. **Limit SSH access** to specific IP addresses if possible

## Scaling Recommendations

For higher traffic:
1. Upgrade to larger droplet (more CPU/RAM)
2. Use PostgreSQL instead of SQLite
3. Add Redis for caching
4. Use a CDN for static files
5. Consider load balancing with multiple containers

## Cost Estimate

- **Basic Droplet**: $12-24/month (2-4 GB RAM)
- **Domain Name** (optional): $10-15/year
- **Monitoring**: Free (Digital Ocean built-in)

**Total**: ~$12-24/month

## Support

For issues specific to Digital Ocean, check their documentation:
- [Digital Ocean Documentation](https://docs.digitalocean.com/)
- [Docker on Digital Ocean](https://www.digitalocean.com/community/tags/docker)

## Optional Enhancements

### Using a Domain Name (Optional)

If you want to use a domain name instead of IP address:

1. Purchase a domain from a registrar (Namecheap, GoDaddy, etc.)
2. Add an A record pointing to your droplet's IP:
   - Type: A
   - Host: @
   - Value: your_droplet_ip
   - TTL: 3600
3. Wait for DNS propagation (5-30 minutes)
4. Access your app at: `http://yourdomain.com:5001`

### Port 80 Access (Optional)

If you want to access without port number (`:5001`), you can change the port in `docker-compose.yml`:

```yaml
ports:
  - "80:5001"  # Maps port 80 to container port 5001
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

Access at: `http://your_droplet_ip` or `http://yourdomain.com`

## Next Steps

1. Set up automated backups
2. Configure monitoring and alerts
3. Set up CI/CD pipeline for automatic deployments
4. Consider adding a staging environment

