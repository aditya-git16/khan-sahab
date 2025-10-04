# Digital Ocean Deployment & Troubleshooting

## Quick Deploy Steps

### 1. Push your code to GitHub/GitLab
```bash
git add .
git commit -m "Add Docker configuration"
git push origin main
```

### 2. Deploy on Digital Ocean

#### Option A: Using Docker Compose on Droplet

**SSH into your droplet:**
```bash
ssh root@your_droplet_ip
```

**Install Docker:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
apt install docker-compose -y
```

**Clone and run:**
```bash
git clone <your-repo-url>
cd khan_sahab
docker-compose up -d --build
```

**Check if it's running:**
```bash
# Check container status
docker-compose ps

# Check logs
docker-compose logs -f

# Test the API
curl http://localhost:5001/api/health
```

#### Option B: Using Digital Ocean App Platform

1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Connect your GitHub/GitLab repository
4. Select the `khan_sahab` repository
5. Digital Ocean will auto-detect the Dockerfile
6. Configure:
   - **Environment**: Production
   - **Instance Size**: Basic (512 MB RAM minimum)
   - **HTTP Port**: 5001
   - **Health Check Path**: /api/health
7. Click "Create Resources"

---

## Troubleshooting: Backend Not Running

### Step 1: Check Container Status

```bash
# Check if container is running
docker ps

# If not listed, check stopped containers
docker ps -a
```

### Step 2: View Logs

```bash
# View all logs
docker-compose logs

# Follow logs in real-time
docker-compose logs -f

# View specific number of lines
docker-compose logs --tail=100
```

**Common errors to look for:**
- `ModuleNotFoundError`: Missing dependencies
- `Address already in use`: Port 5001 is occupied
- `Permission denied`: Database write permissions issue
- `Connection refused`: App crashed during startup

### Step 3: Check Application Logs

```bash
# Get container ID
docker ps

# Access container shell
docker exec -it <container-id> bash

# Or by name
docker exec -it khan-sahab-restaurant bash

# Inside container, check if gunicorn is running
ps aux | grep gunicorn

# Test Python imports
cd /app/backend
python -c "from app import app; print('OK')"

# Check if database was created
ls -la /app/backend/instance/
```

### Step 4: Test Connectivity

```bash
# From inside the droplet
curl http://localhost:5001/api/health

# From outside (replace with your IP)
curl http://your_droplet_ip:5001/api/health
```

### Step 5: Check Firewall

```bash
# Check UFW status
ufw status

# If port 5001 is not allowed, add it
ufw allow 5001/tcp

# Reload firewall
ufw reload
```

---

## Common Issues & Solutions

### Issue 1: Container Exits Immediately

**Check logs:**
```bash
docker-compose logs
```

**Solution:** Usually a Python error. Look for:
- Import errors
- Database initialization failures
- Port binding issues

**Fix:**
```bash
# Rebuild with no cache
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Issue 2: Port 5001 Already in Use

**Check what's using the port:**
```bash
lsof -i :5001
# or
netstat -tulpn | grep 5001
```

**Solution:**
```bash
# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "8080:5001"  # Access via port 8080 instead
```

### Issue 3: Database Initialization Fails

**Error:** `unable to open database file`

**Solution:**
```bash
# Ensure volume has correct permissions
docker-compose down
docker volume rm khan-sahab_khan-sahab-data
docker-compose up -d
```

### Issue 4: 502 Bad Gateway

**This means the container is running but the app isn't responding.**

**Check:**
```bash
# View logs for Python errors
docker-compose logs -f

# Check if gunicorn started
docker exec khan-sahab-restaurant ps aux | grep gunicorn

# Check if port is listening
docker exec khan-sahab-restaurant netstat -tuln | grep 5001
```

### Issue 5: Frontend Shows But API Doesn't Work

**Check CORS settings** in `/app/backend/app.py`:
```python
CORS(app, origins=["*"])  # For testing
# Or specific domain:
# CORS(app, origins=["http://your-domain.com"])
```

### Issue 6: App Works Locally But Not on Digital Ocean

**Common causes:**
1. Environment differences
2. Database volume not persisted
3. Firewall blocking connections

**Solution:**
```bash
# Check environment variables
docker exec khan-sahab-restaurant env

# Ensure database volume exists
docker volume ls | grep khan-sahab

# Test from within droplet
curl http://localhost:5001/api/health
```

---

## Testing Deployment

### Manual Test Script

Run this on your Digital Ocean droplet:

```bash
#!/bin/bash

echo "Testing Khan Sahab Deployment..."
echo "================================"

# Test 1: Container Running
echo "1. Checking if container is running..."
if docker ps | grep -q khan-sahab-restaurant; then
    echo "✓ Container is running"
else
    echo "✗ Container is NOT running"
    exit 1
fi

# Test 2: Health Check
echo "2. Testing health endpoint..."
if curl -f http://localhost:5001/api/health 2>/dev/null; then
    echo "✓ Health check passed"
else
    echo "✗ Health check failed"
    exit 1
fi

# Test 3: API Endpoints
echo "3. Testing API endpoints..."
if curl -f http://localhost:5001/api/menu 2>/dev/null > /dev/null; then
    echo "✓ API endpoints working"
else
    echo "✗ API endpoints not responding"
    exit 1
fi

# Test 4: Database
echo "4. Checking database..."
if docker exec khan-sahab-restaurant test -f /app/backend/instance/restaurant.db; then
    echo "✓ Database file exists"
else
    echo "✗ Database file missing"
    exit 1
fi

echo ""
echo "✅ All tests passed!"
echo "Application URL: http://$(curl -s ifconfig.me):5001"
```

---

## Performance Optimization

### For Production Use:

1. **Increase workers** (based on CPU cores):
```dockerfile
# In Dockerfile, change:
--workers 4    # to --> --workers $((2 * $(nproc) + 1))
```

2. **Use PostgreSQL** instead of SQLite for better performance:
```bash
# Install PostgreSQL
apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb restaurant_db
sudo -u postgres createuser restaurant_user

# Update connection string
DATABASE_URL=postgresql://restaurant_user:password@localhost/restaurant_db
```

3. **Add Redis** for session management:
```bash
apt install redis-server
# Configure in app.py
```

---

## Logs & Monitoring

### View Live Logs:
```bash
docker-compose logs -f --tail=100
```

### Export Logs:
```bash
docker-compose logs > app-logs-$(date +%Y%m%d).txt
```

### Set Up Log Rotation:
```bash
# Create /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}

# Restart Docker
systemctl restart docker
```

---

## Emergency Commands

### Restart Everything:
```bash
docker-compose restart
```

### Complete Reset:
```bash
docker-compose down -v
docker-compose up -d --build
```

### View Real-Time Resource Usage:
```bash
docker stats khan-sahab-restaurant
```

### Backup Database:
```bash
docker cp khan-sahab-restaurant:/app/backend/instance/restaurant.db ./backup-$(date +%Y%m%d).db
```

### Restore Database:
```bash
docker cp ./backup-20241004.db khan-sahab-restaurant:/app/backend/instance/restaurant.db
docker-compose restart
```

---

## Getting Help

If you're still having issues:

1. **Collect information:**
```bash
# Get all relevant info
echo "=== Container Status ===" > debug-info.txt
docker ps -a >> debug-info.txt
echo "" >> debug-info.txt
echo "=== Logs ===" >> debug-info.txt
docker-compose logs --tail=200 >> debug-info.txt
echo "" >> debug-info.txt
echo "=== System Info ===" >> debug-info.txt
uname -a >> debug-info.txt
docker version >> debug-info.txt
```

2. **Check the debug-info.txt file** for error messages

3. **Common places to look:**
   - Container logs: `docker-compose logs`
   - System logs: `/var/log/syslog`
   - Docker logs: `journalctl -u docker`

---

## Access URLs

After successful deployment:

- **Application**: `http://your_droplet_ip:5001`
- **Health Check**: `http://your_droplet_ip:5001/api/health`
- **API Base**: `http://your_droplet_ip:5001/api/`

If using a domain:
- **Application**: `http://yourdomain.com:5001`
- **Health Check**: `http://yourdomain.com:5001/api/health`

