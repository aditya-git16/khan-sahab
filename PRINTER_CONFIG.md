# Printer Configuration

To configure your printer settings, you only need to edit **2 files**:

## 1. Backend Configuration
Edit `backend/printer_config.py`:
```python
# Printer Configuration
# Change these values to match your printer settings

PRINTER_HOSTNAME = "KPC307-UEWB-6D3A"  # Your printer's hostname
PRINTER_PORT = 9100                    # Your printer's port (usually 9100 for network printers)
```

## 2. Frontend Configuration
Edit `frontend/src/config.js`:
```javascript
// Printer Configuration
// Change these values to match your printer settings

export const PRINTER_CONFIG = {
  type: 'network',
  ip: 'KPC307-UEWB-6D3A',  // Your printer's hostname
  port: 9100                // Your printer's port (usually 9100 for network printers)
};
```

## Common Printer Ports
- **9100** - Most common TCP port for network printers
- **515** - LPR/LPD printing protocol  
- **631** - IPP (Internet Printing Protocol)

## How to Find Your Printer's Hostname/IP
1. Print a self-test page from your printer
2. Check your router's DHCP client list
3. Use network scanning tools
4. Check the printer's display/menu system

## Example Configuration
For a typical network thermal printer:
```python
PRINTER_HOSTNAME = "KPC307-UEWB-6D3A"  # Your printer's hostname
PRINTER_PORT = 9100                     # Standard TCP port
```

That's it! The printer settings will be used everywhere in the application automatically. 