# Deploying Khan Sahab on Vercel

## Important: Architecture Considerations

This app has a **React frontend** and a **Flask + SQLite backend**. Vercel is optimized for
frontend/serverless deployments. SQLite does NOT persist on Vercel's ephemeral filesystem.

**Recommended approach:** Deploy the **frontend on Vercel** and the **backend on Railway/Render**
(free tiers available). This is the simplest path that actually works in production.

---

## Option A: Frontend on Vercel + Backend on Railway (Recommended)

This is the most reliable approach for a restaurant POS system.

### Step 1: Deploy the Backend on Railway

1. Go to [railway.app](https://railway.app) and sign up with GitHub.
2. Click **"New Project"** > **"Deploy from GitHub Repo"** and select `khan_sahab`.
3. Railway will auto-detect Docker. Configure the service:
  - **Root Directory:** `/` (uses the existing Dockerfile)
  - **Port:** `5001`
4. Add environment variables in Railway dashboard:
  ```
   SECRET_KEY=<generate-a-random-secret-key>
   FLASK_ENV=production
  ```
5. Once deployed, Railway gives you a public URL like:
  ```
  khan-sahab-production.up.railway.app
  ```
   Copy this URL — you'll need it for the frontend.

### Step 2: Deploy the Frontend on Vercel

#### 2a. Create Vercel configuration

Create `frontend/vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This handles client-side routing (React Router).

#### 2b. Update the API base URL for production

Edit `frontend/src/config.js`:

```js
export const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://khan-sahab-production.up.railway.app/api'  // Your Railway URL
  : 'http://localhost:5001/api';
```

Also update `frontend/src/components/MainPage.js` and all other components that
have their own `API_BASE` definition:

```js
const API_BASE = process.env.NODE_ENV === 'production'
  ? 'https://khan-sahab-production.up.railway.app/api'
  : 'http://localhost:5001/api';
```

**Better approach** — use an environment variable so you don't hardcode the URL:

Edit all components to use:

```js
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
```

Then set `REACT_APP_API_URL` in Vercel's dashboard (see step 2d).

#### 2c. Deploy to Vercel

**Option 1: Vercel CLI**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from the frontend directory
cd frontend
vercel

# Follow the prompts:
#   - Set up and deploy? Yes
#   - Which scope? (your account)
#   - Link to existing project? No
#   - Project name: khan-sahab
#   - Directory: ./
#   - Override settings? No
```

**Option 2: Vercel Dashboard (easier)**

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub.
2. Click **"Add New" > "Project"**.
3. Import your `khan_sahab` GitHub repository.
4. Configure:
  - **Framework Preset:** Create React App
  - **Root Directory:** `frontend`
  - **Build Command:** `npm run build`
  - **Output Directory:** `build`
5. Click **Deploy**.

#### 2d. Set Environment Variables in Vercel

In the Vercel dashboard for your project:

1. Go to **Settings** > **Environment Variables**
2. Add:
  ```
   REACT_APP_API_URL = https://khan-sahab-production.up.railway.app/api
  ```
3. Redeploy for the variable to take effect.

#### 2e. Configure CORS on the Backend

Your backend already has `CORS(app)` which allows all origins. For production,
restrict it to your Vercel domain. In `backend/app.py`, change:

```python
CORS(app)
```

to:

```python
CORS(app, origins=[
    "http://localhost:4000",
    "http://localhost:3000",
    "https://khan-sahab.vercel.app",      # Your Vercel URL
    "https://your-custom-domain.com",      # If you add a custom domain
])
```

---

## Option B: Full Stack on Vercel (Serverless)

This requires converting the Flask backend into a Vercel serverless function and
migrating from SQLite to a cloud database. More work, but everything lives on Vercel.

### Step 1: Set Up a Cloud Database

SQLite won't work on Vercel (ephemeral filesystem). Use one of:

- **Neon** (free PostgreSQL): [neon.tech](https://neon.tech)
- **Supabase** (free PostgreSQL): [supabase.com](https://supabase.com)
- **PlanetScale** (free MySQL): [planetscale.com](https://planetscale.com)

Example with Neon:

1. Sign up at neon.tech
2. Create a new project
3. Copy the connection string:
  ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
  ```

### Step 2: Update Backend for PostgreSQL

Install `psycopg2-binary` in `backend/requirements.txt`:

```
psycopg2-binary==2.9.9
```

Update `backend/app.py` database URI:

```python
import os
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    'DATABASE_URL',
    'sqlite:///restaurant.db'  # Fallback for local dev
)
```

### Step 3: Create Vercel Serverless Function

Create `api/index.py` in the project root:

```python
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app import app

# Vercel serverless handler
def handler(request):
    return app(request.environ, request.start_response)
```

Create `vercel.json` in the project root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "frontend/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    },
    {
      "src": "api/index.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "api/index.py" },
    { "src": "/(.*)", "dest": "frontend/$1" }
  ]
}
```

### Step 4: Set Environment Variables

In Vercel dashboard > Settings > Environment Variables:

```
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require
SECRET_KEY=your-random-secret-key
FLASK_ENV=production
```

### Step 5: Deploy

```bash
vercel --prod
```

### Limitations of Option B

- **Printer functionality won't work** — `webbrowser.open()` and `tempfile` don't
work in serverless. The print-bill endpoint will need to return HTML directly
to the browser instead.
- **Cold starts** — First request after inactivity may be slow (~2-5 seconds).
- **10-second timeout** on Vercel Hobby plan for serverless functions.
- **PDF generation** may hit memory/time limits on the free plan.

---

## Option C: Use Vercel + Existing DigitalOcean/VPS Backend

If you already have a VPS running the backend, just deploy the frontend to Vercel
and point it to your existing server. Follow only **Step 2** from Option A.

---

## Post-Deployment Checklist

- Backend is running and accessible at its public URL
- `REACT_APP_API_URL` is set correctly in Vercel environment variables
- CORS is configured to allow your Vercel domain
- Test all pages: Tables, Menu, POS, Orders, Bills, Payment
- Test menu item CRUD (create, edit price, delete)
- Test order creation and payment flow
- Test bill generation and PDF export
- (If applicable) Test printer functionality

## Custom Domain (Optional)

1. In Vercel dashboard > Settings > Domains
2. Add your domain (e.g., `khansahab.com`)
3. Update DNS records as instructed by Vercel:
  - **A record:** `76.76.21.21`
  - **CNAME:** `cname.vercel-dns.com`
4. Update CORS on the backend to include your custom domain

## Quick Reference


| Component | Local Dev               | Production (Option A)                          |
| --------- | ----------------------- | ---------------------------------------------- |
| Frontend  | `http://localhost:4000` | `https://khan-sahab.vercel.app`                |
| Backend   | `http://localhost:5001` | `https://khan-sahab-production.up.railway.app` |
| Database  | SQLite (local file)     | SQLite on Railway (persistent volume)          |






[khan-sahab-production.up.railway.app](http://khan-sahab-production.up.railway.app)  
