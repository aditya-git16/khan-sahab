# Restaurant Management System

A modern restaurant management system with order, table, and menu management capabilities.

## Features
- Order management
- Table management  
- Menu management
- Point of Sale (POS) interface

## Tech Stack
- **Backend**: Flask (Python)
- **Frontend**: React
- **Database**: SQLite (for development)

## Project Structure
```
restaurant-management/
├── backend/          # Flask API
├── frontend/         # React app
└── README.md
```

## Setup Instructions

### Backend Setup
1. Navigate to backend directory
2. Create virtual environment: `python -m venv venv`
3. Activate virtual environment: `source venv/bin/activate` (Unix) or `venv\Scripts\activate` (Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. Run the server: `python app.py`

### Frontend Setup
1. Navigate to frontend directory
2. Install dependencies: `npm install`
3. Start development server: `npm start`

## API Endpoints
- `GET /api/menu` - Get all menu items
- `POST /api/orders` - Create new order
- `GET /api/tables` - Get table status
- `POST /api/tables` - Update table status

## Access URLs
- **Frontend**: http://localhost:4000
- **Backend API**: http://localhost:5001 