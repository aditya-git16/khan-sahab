# Environment Configuration

This document describes the environment variables you can use to configure the Khan Sahab Restaurant Management System.

## Environment Variables

### Flask Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_ENV` | `production` | Flask environment (`development` or `production`) |
| `SECRET_KEY` | `your-secret-key-here-change-in-production` | Secret key for Flask sessions and security. **Change this in production!** |
| `PORT` | `5001` | Port on which the application runs |
| `HOST` | `0.0.0.0` | Host address to bind to |

### Database Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///restaurant.db` | Database connection URL. SQLite by default |
| `SQLALCHEMY_TRACK_MODIFICATIONS` | `False` | Track modifications in SQLAlchemy |

### CORS Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | `*` (all) | Allowed CORS origins. Set to your domain in production |

### Printer Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PRINTER_TYPE` | `network` | Printer type (`network`, `usb`, or `serial`) |
| `PRINTER_IP` | `192.168.1.100` | IP address or hostname of network printer |
| `PRINTER_PORT` | `9100` | Port of network printer |

## Setting Environment Variables

### For Docker Deployment

Create a `.env` file in the project root:

```bash
# .env file
FLASK_ENV=production
SECRET_KEY=your-very-secret-and-random-key-change-this
PORT=5001
PRINTER_IP=192.168.1.100
PRINTER_PORT=9100
```

Then modify `docker-compose.yml` to use the env file:

```yaml
services:
  khan-sahab-app:
    # ... other config
    env_file:
      - .env
```

### For Manual Deployment

Export environment variables before starting the application:

```bash
export FLASK_ENV=production
export SECRET_KEY=your-secret-key
export PORT=5001
```

Or use a `.env` file and load it:

```bash
# Install python-dotenv
pip install python-dotenv

# The app will automatically load .env file
```

### For Digital Ocean App Platform

1. Go to your app settings
2. Navigate to "Environment Variables"
3. Add each variable:
   - Key: `SECRET_KEY`
   - Value: `your-secret-random-key`
   - Encrypt: ✓ (for sensitive values)

## Generating a Secret Key

Generate a secure secret key using Python:

```python
import secrets
print(secrets.token_hex(32))
```

Or using command line:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

## Production Configuration Checklist

Before deploying to production, ensure you:

- [ ] **Change the SECRET_KEY** to a random, secure value
- [ ] Set **FLASK_ENV=production**
- [ ] Configure **CORS_ORIGINS** to your domain only
- [ ] Set up **proper database backups**
- [ ] Configure **printer settings** if using network printer
- [ ] Set appropriate **file permissions** (especially for SQLite database)
- [ ] Configure **SSL/HTTPS** (see DEPLOYMENT.md)
- [ ] Set up **monitoring and logging**

## Example .env File for Production

```bash
# Flask Configuration
FLASK_ENV=production
SECRET_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
PORT=5001
HOST=0.0.0.0

# Database Configuration (SQLite default)
# For PostgreSQL: DATABASE_URL=postgresql://user:pass@localhost/dbname
SQLALCHEMY_TRACK_MODIFICATIONS=False

# CORS Configuration
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Printer Configuration
PRINTER_TYPE=network
PRINTER_IP=192.168.1.100
PRINTER_PORT=9100

# Optional: Application Settings
# MAX_CONTENT_LENGTH=16777216  # 16MB max upload
# SESSION_COOKIE_SECURE=True
# SESSION_COOKIE_HTTPONLY=True
# PERMANENT_SESSION_LIFETIME=3600
```

## Environment-Specific Configurations

### Development

```bash
FLASK_ENV=development
SECRET_KEY=dev-key-not-for-production
PORT=5001
```

### Staging

```bash
FLASK_ENV=production
SECRET_KEY=staging-secret-key
PORT=5001
CORS_ORIGINS=https://staging.yourdomain.com
```

### Production

```bash
FLASK_ENV=production
SECRET_KEY=production-secret-key-very-secure
PORT=5001
CORS_ORIGINS=https://yourdomain.com
```

## Security Notes

1. **Never commit** `.env` files to version control
2. **Always use** strong, random secret keys in production
3. **Restrict CORS** to only your domain in production
4. **Use HTTPS** in production (configure via Nginx/SSL)
5. **Rotate secrets** periodically
6. **Limit access** to environment files (chmod 600)
7. **Use environment variables** for all sensitive data
8. **Enable firewall** and restrict port access

## Troubleshooting

### Application won't start

Check if environment variables are loaded:
```bash
docker exec khan-sahab-restaurant env | grep FLASK
```

### Database connection issues

Verify database URL:
```bash
echo $DATABASE_URL
```

### CORS errors

Ensure CORS_ORIGINS includes your frontend domain:
```bash
echo $CORS_ORIGINS
```

### Printer not working

Check printer configuration:
```bash
docker exec khan-sahab-restaurant env | grep PRINTER
```

## Advanced Configuration

### Using PostgreSQL instead of SQLite

For production with higher load, consider PostgreSQL:

1. Set up PostgreSQL:
```bash
apt install postgresql postgresql-contrib
```

2. Create database:
```sql
CREATE DATABASE restaurant_db;
CREATE USER restaurant_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE restaurant_db TO restaurant_user;
```

3. Update environment:
```bash
DATABASE_URL=postgresql://restaurant_user:secure_password@localhost:5432/restaurant_db
```

4. Update requirements.txt:
```
psycopg2-binary==2.9.9
```

### Using Redis for Sessions

For better session management:

1. Install Redis:
```bash
apt install redis-server
```

2. Add to requirements.txt:
```
flask-session==0.5.0
redis==5.0.0
```

3. Configure in app:
```python
from flask_session import Session
app.config['SESSION_TYPE'] = 'redis'
app.config['SESSION_REDIS'] = redis.from_url('redis://localhost:6379')
Session(app)
```

