// API Configuration
// In production, use relative URLs (same domain as frontend)
// In development, use localhost
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '/api'  // Production: relative URL (same domain)
  : 'http://localhost:5001/api';  // Development: localhost

// Printer Configuration
// Change these values to match your printer settings
export const PRINTER_CONFIG = {
  type: 'network',
  ip: 'KPC307-UEWB-6D3A',  // Your printer's hostname
  port: 9100                // Your printer's port (usually 9100 for network printers)
}; 