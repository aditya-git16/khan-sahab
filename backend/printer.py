import socket
import serial
import subprocess
import tempfile
import os
from datetime import datetime
from PIL import Image
import io

class ESCPOSBuilder:
    def __init__(self):
        self.buffer = bytearray()
    
    def init(self):
        """Initialize printer"""
        self.buffer.extend([0x1B, 0x40])  # ESC @
        return self
    
    def text(self, text):
        """Add text"""
        self.buffer.extend(text.encode('utf-8'))
        return self
    
    def newline(self):
        """Add newline"""
        self.buffer.extend([0x0A])  # LF
        return self
    
    def bold(self, enable=True):
        """Set bold text"""
        self.buffer.extend([0x1B, 0x45, 1 if enable else 0])  # ESC E
        return self
    
    def underline(self, enable=True):
        """Set underline"""
        self.buffer.extend([0x1B, 0x2D, 1 if enable else 0])  # ESC -
        return self
    
    def font_size(self, size):
        """Set font size (0=normal, 1=double height, 2=double width, 3=double both)"""
        self.buffer.extend([0x1B, 0x21, size])  # ESC !
        return self
    
    def align(self, alignment):
        """Set alignment (0=left, 1=center, 2=right)"""
        self.buffer.extend([0x1B, 0x61, alignment])  # ESC a
        return self
    
    def line_feed(self, lines=1):
        """Feed lines"""
        for _ in range(lines):
            self.buffer.extend([0x0A])
        return self
    
    def cut(self):
        """Cut paper"""
        self.buffer.extend([0x1D, 0x56, 0x00])  # GS V
        return self
    
    def qr_code(self, data, size=6):
        """Print QR code"""
        # QR Code model
        self.buffer.extend([0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, size, 0x00])
        # Error correction level
        self.buffer.extend([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x08])
        
        # Store data
        data_length = len(data) + 3
        self.buffer.extend([0x1D, 0x28, 0x6B, data_length & 0xFF, (data_length >> 8) & 0xFF, 0x31, 0x50, 0x30])
        self.buffer.extend(data.encode('utf-8'))
        
        # Print QR code
        self.buffer.extend([0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30])
        return self
    
    def print_bitmap(self, width, height, bitmap_data):
        """Print bitmap image (for logos)"""
        # This is a simplified bitmap implementation
        # For actual logo printing, you'd need to convert image to monochrome bitmap
        self.buffer.extend([0x1B, 0x2A, 0x00, width & 0xFF, (width >> 8) & 0xFF])
        self.buffer.extend(bitmap_data)
        return self
    
    def print_logo_text(self):
        """Print Khan Sahab logo as text art (fallback)"""
        # Since we can't print the actual logo image, we'll create a text representation
        self.align(1)  # Center
        self.text("┌─────────────────────────────┐").newline()
        self.text("│        حلال                │").newline()
        self.text("│   UNIT OF TUAHA FOOD        │").newline()
        self.text("│                             │").newline()
        self.text("│        KHAN SAHAB           │").newline()
        self.text("│                             │").newline()
        self.text("│         🐐                  │").newline()
        self.text("└─────────────────────────────┘").newline()
        self.newline()
        return self
    
    def print_logo_image(self, logo_path='khan_sahab_logo.jpg'):
        """Print Khan Sahab logo as bitmap image"""
        try:
            # Load and process the logo image
            with Image.open(logo_path) as img:
                # Convert to grayscale
                img = img.convert('L')
                
                # Resize to fit thermal printer width (typically 384 dots)
                # Maintain aspect ratio
                max_width = 384
                aspect_ratio = img.width / img.height
                new_width = min(max_width, img.width)
                new_height = int(new_width / aspect_ratio)
                
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
                
                # Convert to binary (black and white)
                threshold = 128
                img = img.point(lambda x: 0 if x < threshold else 255, '1')
                
                # Convert to bitmap data
                bitmap_data = []
                for y in range(img.height):
                    row = []
                    for x in range(0, img.width, 8):
                        byte = 0
                        for bit in range(8):
                            if x + bit < img.width:
                                pixel = img.getpixel((x + bit, y))
                                if pixel == 0:  # Black pixel
                                    byte |= (1 << (7 - bit))
                        row.append(byte)
                    bitmap_data.extend(row)
                
                # Print the bitmap
                self.align(1)  # Center
                self.print_bitmap(img.width, img.height, bitmap_data)
                self.newline()
                
        except Exception as e:
            print(f"Error printing logo image: {e}")
            # Fallback to text logo
            self.print_logo_text()
        
        return self
    
    def build(self):
        """Get the complete command buffer"""
        return bytes(self.buffer)

class RestaurantBillGenerator:
    @staticmethod
    def generate_bill(bill_data):
        """Generate ESC/POS commands for restaurant bill matching Khan Sahab format"""
        builder = ESCPOSBuilder()
        
        # Initialize printer
        builder.init()
        
        # Print Khan Sahab logo
        builder.print_logo_image()
        
        # Restaurant name - large and bold
        builder.font_size(1).bold(True)
        builder.text(bill_data.get('restaurant_name', 'KHAN SAHAB RESTAURANT'))
        builder.newline()
        
        # Address and details - normal size
        builder.font_size(0).bold(False)
        builder.text(bill_data.get('address', '4, BANSAL NAGAR FATEHABAD ROAD AGRA'))
        builder.newline()
        builder.text(f"State: {bill_data.get('state', 'Uttar Pradesh')} ({bill_data.get('state_code', '09')})")
        builder.newline()
        builder.text(f"Phone: {bill_data.get('phone', '9319209322')}")
        builder.newline()
        builder.text(f"GSTIN: {bill_data.get('gstin', '09AHDPA1039P2ZB')}")
        builder.newline()
        builder.text(f"FSSAI: {bill_data.get('fssai', '12722001001504')}")
        builder.newline()
        
        # Separator line
        builder.text('-' * 48).newline()
        
        # Tax Invoice header
        builder.align(1).bold(True)
        builder.text('Tax Invoice').newline()
        builder.bold(False).align(0)
        
        # Invoice details - two columns
        builder.text('Cash Sale').newline()
        builder.text(f"Place of Supply:").newline()
        builder.text(f"{bill_data.get('place_of_supply', 'Uttar Pradesh')}")
        
        # Move cursor up and print right side (simulated)
        current_date = datetime.now().strftime('%d/%m/%Y')
        current_time = datetime.now().strftime('%I:%M %p').lower()
        
        # Since thermal printers don't support true columns, we'll format it differently
        builder.newline()
        builder.text(f"Date: {bill_data.get('date', current_date)}")
        builder.newline()
        builder.text(f"Time: {bill_data.get('time', current_time)}")
        builder.newline()
        builder.text(f"Invoice no: {bill_data.get('invoice_number', '1')}")
        builder.newline()
        
        # Item header
        builder.text('-' * 48).newline()
        builder.text('Item Name                   Qty    Price    Amount')
        builder.newline()
        builder.text('-' * 48).newline()
        
        # Items
        subtotal = 0
        for item in bill_data.get('items', []):
            qty = item.get('qty', 1)
            price = item.get('price', 0)
            amount = qty * price
            subtotal += amount
            
            # Format item line to match preview
            name = item['name'][:20] if len(item['name']) > 20 else item['name']
            item_line = f"{name:<20} x{qty}    {price:.2f}    {amount:.2f}"
            builder.text(item_line).newline()
        
        builder.text('-' * 48).newline()
        
        # Calculate taxes based on tax_rate from bill_data
        tax_rate = bill_data.get('tax_rate', 0.05)  # Default 5% GST
        tax_amount = subtotal * tax_rate
        total = subtotal + tax_amount
        
        # Totals
        builder.text(f"Subtotal{' ' * 32}{subtotal:.2f}").newline()
        if tax_rate > 0:
            builder.text(f"Taxes{' ' * 35}{tax_amount:.2f}").newline()
        builder.bold(True)
        builder.text(f"Total{' ' * 35}{total:.2f}").newline()
        builder.bold(False)
        
        builder.text('-' * 48).newline()
        
        # Tax breakdown header (only if tax is applied)
        if tax_rate > 0:
            builder.text('Tax Type          Taxable Amt    Tax Amt')
            builder.newline()
            builder.text('-' * 48).newline()
            
            # GST breakdown
            gst_text = f"GST@{int(tax_rate*100)}%"
            builder.text(f"{gst_text:<18}{subtotal:.2f}      {tax_amount:.2f}")
            builder.newline()
            
            builder.text('-' * 48).newline()
        
        # Footer
        builder.align(1)
        builder.newline()
        builder.text('Thank you for your visit!')
        builder.newline()
        
        # QR code for digital receipt (optional)
        if bill_data.get('receipt_url'):
            builder.qr_code(bill_data['receipt_url'])
            builder.newline()
        
        # Feed and cut
        builder.line_feed(3)
        builder.cut()
        
        return builder.build()

class BillGenerator:
    @staticmethod
    def generate_bill(bill_data):
        """Generate ESC/POS commands for a bill (legacy format)"""
        builder = ESCPOSBuilder()
        
        # Header
        builder.init()
        builder.align(1).font_size(3).bold(True)
        builder.text(bill_data.get('store_name', 'Restaurant Management')).newline()
        
        builder.font_size(0).bold(False)
        builder.text(bill_data.get('store_address', '123 Main Street')).newline()
        builder.text(f"Tel: {bill_data.get('phone', '555-0123')}").newline()
        builder.text('=' * 32).newline()
        
        # Invoice details
        builder.align(0).bold(True)
        builder.text(f"Invoice #: {bill_data['invoice_number']}").newline()
        builder.text(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}").newline()
        builder.text(f"Table: {bill_data.get('table_id', 'N/A')}").newline()
        builder.text(f"Cashier: {bill_data.get('cashier', 'System')}").newline()
        builder.bold(False)
        builder.text('=' * 32).newline()
        
        # Items
        for item in bill_data['items']:
            name = item['name'][:20] if len(item['name']) > 20 else item['name']
            line = f"{name:<20} {item['qty']}x{item['price']:.2f}"
            builder.text(line).newline()
            line2 = f"{'':20} {(item['qty'] * item['price']):.2f}"
            builder.text(line2).newline()
        
        # Totals
        builder.text('=' * 32).newline()
        builder.bold(True)
        builder.text(f"Subtotal: ${bill_data['subtotal']:.2f}".rjust(32)).newline()
        if bill_data.get('tax', 0) > 0:
            builder.text(f"Tax: ${bill_data['tax']:.2f}".rjust(32)).newline()
        builder.font_size(1)
        builder.text(f"TOTAL: ${bill_data['total']:.2f}".rjust(32)).newline()
        
        # Payment method
        builder.font_size(0).bold(False)
        builder.text('=' * 32).newline()
        builder.align(1)
        builder.text(f"Payment: {bill_data.get('payment_method', 'CASH').upper()}").newline()
        
        # Footer
        builder.text('=' * 32).newline()
        builder.text('Thank you for your business!').newline()
        builder.text('Please come again').newline()
        
        # QR Code (optional)
        if 'receipt_url' in bill_data:
            builder.qr_code(bill_data['receipt_url']).newline()
        
        builder.line_feed(3)
        builder.cut()
        
        return builder.build()

class PrinterConnection:
    @staticmethod
    def print_via_network(printer_ip, port, data, timeout=5):
        """Print via network (WiFi/Ethernet)"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            sock.connect((printer_ip, port))
            sock.send(data)
            response = sock.recv(1024)  # Get any response
            sock.close()
            return True
        except Exception as e:
            print(f"Network print error: {e}")
            return False
    
    @staticmethod
    def print_via_serial(port_path, data, baud_rate=9600, timeout=5):
        """Print via USB/Serial"""
        try:
            with serial.Serial(port_path, baud_rate, timeout=timeout) as ser:
                ser.write(data)
                return True
        except Exception as e:
            print(f"Serial print error: {e}")
            return False
    
    @staticmethod
    def print_via_system(printer_name, data):
        """Print via system printer (CUPS on Linux)"""
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.prn') as temp_file:
                temp_file.write(data)
                temp_file_path = temp_file.name
            
            # Use lpr command to print
            result = subprocess.run(['lpr', '-P', printer_name, temp_file_path], 
                                   capture_output=True, text=True)
            
            # Clean up temp file
            os.unlink(temp_file_path)
            
            return result.returncode == 0
        except Exception as e:
            print(f"System print error: {e}")
            return False

def print_bill(bill_data, printer_config=None, bill_format='restaurant'):
    """Main function to print a bill"""
    try:
        # Generate print data based on format
        if bill_format == 'restaurant':
            print_data = RestaurantBillGenerator.generate_bill(bill_data)
        else:
            print_data = BillGenerator.generate_bill(bill_data)
        
        # Default printer config
        if not printer_config:
            printer_config = {
                'type': 'network',
                'ip': '192.168.1.100',
                'port': 9100
            }
        
        printer_type = printer_config.get('type', 'network')
        success = False
        
        if printer_type == 'network':
            success = PrinterConnection.print_via_network(
                printer_config.get('ip', '192.168.1.100'),
                printer_config.get('port', 9100),
                print_data
            )
        elif printer_type == 'serial':
            success = PrinterConnection.print_via_serial(
                printer_config.get('port', '/dev/ttyUSB0'),
                print_data,
                printer_config.get('baud_rate', 9600)
            )
        elif printer_type == 'system':
            success = PrinterConnection.print_via_system(
                printer_config.get('name', 'default'),
                print_data
            )
        else:
            print(f"Unknown printer type: {printer_type}")
            return False
        
        if success:
            print(f"Bill printed successfully: {bill_data.get('invoice_number', 'Unknown')}")
        else:
            print("Failed to print bill")
        
        return success
        
    except Exception as e:
        print(f"Error printing bill: {e}")
        return False

# Test function
if __name__ == '__main__':
    # Sample restaurant bill data
    sample_restaurant_bill = {
        'restaurant_name': 'KHAN SAHAB RESTAURANT',
        'address': '4, BANSAL NAGAR FATEHABAD ROAD AGRA',
        'state': 'Uttar Pradesh',
        'state_code': '09',
        'phone': '9319209322',
        'gstin': '09AHDPA1039P2ZB',
        'fssai': '12722001001504',
        'place_of_supply': 'Uttar Pradesh',
        'invoice_number': '3',
        'date': '20/07/2025',
        'time': '09:41 pm',
        'items': [
            {'name': 'Banana Lassi', 'qty': 1, 'price': 150.00},
            {'name': 'Paneer Tikka', 'qty': 1, 'price': 449.00},
            {'name': 'Chicken Makhani Boneless', 'qty': 1, 'price': 699.00},
            {'name': 'Butter Naan', 'qty': 2, 'price': 70.00}
        ],
        'tax_rate': 0.05,  # 5% GST
        'receipt_url': 'https://khansahabrestaurant.com/receipt/3'
    }
    
    # Test print (will fail if no printer is connected)
    print_bill(sample_restaurant_bill, bill_format='restaurant') 