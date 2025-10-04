# Khan Sahab Restaurant - Windows Setup Guide

This guide will help you set up and run the Khan Sahab Restaurant Management System on Windows.

## Prerequisites

Before you begin, make sure you have the following installed:

### 1. Python 3.8 or higher
- Download from: https://www.python.org/downloads/
- **Important**: During installation, check the box "Add Python to PATH"
- Verify installation: Open Command Prompt and run:
  ```cmd
  python --version
  ```

### 2. Node.js 14 or higher
- Download from: https://nodejs.org/
- The installer will automatically add Node.js to PATH
- Verify installation: Open Command Prompt and run:
  ```cmd
  node --version
  npm --version
  ```

## Quick Start

### Option 1: Using the Automated Scripts (Recommended)

1. **Clone or download the project**
   ```cmd
   cd khan_sahab
   ```

2. **Run the setup script**
   
   Using PowerShell (Recommended):
   ```powershell
   powershell -ExecutionPolicy Bypass -File setup-windows.ps1
   ```

3. **Run the application**
   ```cmd
   run-windows.bat
   ```

   This will open two new windows:
   - Backend server (Flask) running on port 5001
   - Frontend server (React) running on port 4000

4. **Access the application**
   - Open your browser and go to: http://localhost:4000

### Option 2: Manual Setup

#### Step 1: Setup Backend

1. Open Command Prompt or PowerShell
2. Navigate to the backend directory:
   ```cmd
   cd backend
   ```

3. Create a virtual environment:
   ```cmd
   python -m venv venv
   ```

4. Activate the virtual environment:
   
   In Command Prompt:
   ```cmd
   venv\Scripts\activate
   ```
   
   In PowerShell:
   ```powershell
   .\venv\Scripts\Activate.ps1
   ```
   
   **Note**: If you get an error in PowerShell about execution policies, run:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

5. Install Python dependencies:
   ```cmd
   pip install -r requirements.txt
   ```

#### Step 2: Setup Frontend

1. Open a **new** Command Prompt or PowerShell window
2. Navigate to the frontend directory:
   ```cmd
   cd frontend
   ```

3. Install Node.js dependencies:
   ```cmd
   npm install
   ```

#### Step 3: Run the Application

1. **Start the Backend** (in the first terminal):
   ```cmd
   cd backend
   venv\Scripts\activate
   python app.py
   ```
   The backend will start on http://localhost:5001

2. **Start the Frontend** (in the second terminal):
   ```cmd
   cd frontend
   npm start
   ```
   The frontend will start on http://localhost:4000

3. **Access the application**
   - Open your browser and go to: http://localhost:4000

## Common Issues and Solutions

### PowerShell Execution Policy Error

If you get an error like "cannot be loaded because running scripts is disabled":

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then run the setup script again.

### Python Not Found

If you get "python is not recognized":
1. Reinstall Python from https://www.python.org/downloads/
2. Make sure to check "Add Python to PATH" during installation
3. Restart your Command Prompt/PowerShell

### Node/NPM Not Found

If you get "node is not recognized":
1. Reinstall Node.js from https://nodejs.org/
2. Restart your Command Prompt/PowerShell

### Port Already in Use

If port 5001 or 4000 is already in use:

1. Find and kill the process:
   ```cmd
   netstat -ano | findstr :5001
   taskkill /PID <process_id> /F
   ```

2. Or change the port in the configuration files

### Virtual Environment Issues

If you have issues with the virtual environment:

1. Delete the venv folder:
   ```cmd
   rmdir /s venv
   ```

2. Create it again:
   ```cmd
   python -m venv venv
   ```

## Application Structure

```
khan_sahab/
├── backend/              # Flask API
│   ├── app.py           # Main application
│   ├── requirements.txt # Python dependencies
│   ├── venv/            # Virtual environment (created during setup)
│   └── instance/        # Database location (created automatically)
├── frontend/            # React frontend
│   ├── src/            # Source code
│   ├── package.json    # Node dependencies
│   └── node_modules/   # Dependencies (created during setup)
├── setup-windows.ps1   # Windows setup script
└── run-windows.bat     # Windows run script
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
- **Frontend Port**: 4000
- **Database**: SQLite (auto-created in backend/instance/)
- **Sample Data**: 10 tables and full menu automatically loaded

## Stopping the Application

To stop the servers:
1. Close the Command Prompt/PowerShell windows running the backend and frontend
2. Or press `Ctrl+C` in each terminal window

## Building for Production

To create a production build:

1. Build the frontend:
   ```cmd
   cd frontend
   npm run build
   ```

2. The backend will automatically serve the built frontend from the `build` folder

3. Run only the backend:
   ```cmd
   cd backend
   venv\Scripts\activate
   python app.py
   ```

4. Access at: http://localhost:5001

## Using Docker (Alternative)

If you prefer using Docker on Windows:

1. Install Docker Desktop for Windows: https://www.docker.com/products/docker-desktop

2. Run the application:
   ```cmd
   docker-compose up -d --build
   ```

3. Access at: http://localhost:5001

## Support

For detailed deployment instructions and production setup, see:
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [QUICKSTART.md](QUICKSTART.md)

## Troubleshooting

If you encounter any issues:

1. Make sure Python and Node.js are properly installed and in PATH
2. Try running Command Prompt or PowerShell as Administrator
3. Check if antivirus software is blocking the scripts
4. Make sure ports 4000 and 5001 are not being used by other applications
5. Try deleting `node_modules` and `venv` folders and running setup again

## Need Help?

If you continue to face issues:
1. Check the error messages carefully
2. Search for the error message online
3. Make sure all prerequisites are properly installed
4. Try the manual setup method instead of automated scripts

