// API Configuration
// In production, use relative URLs (same domain as frontend)
// In development, use localhost
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Printer Configuration
// Change these values to match your printer settings
export const PRINTER_CONFIG = {
  type: 'network',
  ip: 'KPC307-UEWB-6D3A',  // Your printer's hostname
  port: 9100                // Your printer's port (usually 9100 for network printers)
}; 