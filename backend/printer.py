import subprocess
import tempfile
import os
import webbrowser
from datetime import datetime
import pytz

class HTMLBillGenerator:
    @staticmethod
    def get_ist_time():
        """Get current time in IST"""
        ist = pytz.timezone('Asia/Kolkata')
        return datetime.now(ist)
    
    @staticmethod
    def format_ist_date(date_obj=None):
        """Format date in IST"""
        if date_obj is None:
            date_obj = HTMLBillGenerator.get_ist_time()
        return date_obj.strftime('%d/%m/%Y')
    
    @staticmethod
    def format_ist_time(date_obj=None):
        """Format time in IST"""
        if date_obj is None:
            date_obj = HTMLBillGenerator.get_ist_time()
        return date_obj.strftime('%I:%M %p').lower()

class RestaurantBillGenerator(HTMLBillGenerator):
    @staticmethod
    def generate_html_bill(bill_data):
        """Generate HTML bill for print preview and Windows printing"""
        # Use IST times
        current_time = HTMLBillGenerator.get_ist_time()
        current_date = HTMLBillGenerator.format_ist_date(current_time)
        current_time_str = HTMLBillGenerator.format_ist_time(current_time)
        
        # Calculate totals
        subtotal = 0
        for item in bill_data.get('items', []):
            qty = item.get('qty', 1)
            price = item.get('price', 0)
            amount = qty * price
            subtotal += amount
        
        tax_rate = bill_data.get('tax_rate', 0.05)  # Default 5% GST
        tax_amount = subtotal * tax_rate
        total = subtotal + tax_amount
        
        # Generate items HTML
        items_html = ""
        for item in bill_data.get('items', []):
            qty = item.get('qty', 1)
            price = item.get('price', 0)
            amount = qty * price
            items_html += f"""
            <tr>
                <td>{item['name']}</td>
                <td>x{qty}</td>
                <td>₹{price:.2f}</td>
                <td>₹{amount:.2f}</td>
            </tr>
            """
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Khan Sahab Restaurant - Invoice #{bill_data.get('invoice_number', '1')}</title>
            <style>
                @page {{
                    margin: 0.5in;
                    size: A4;
                }}
                
                body {{
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.4;
                    margin: 0;
                    padding: 20px;
                    max-width: 80mm;
                    margin: 0 auto;
                }}
                
                .header {{
                    text-align: center;
                    border-bottom: 2px solid #000;
                    padding-bottom: 10px;
                    margin-bottom: 15px;
                }}
                
                .logo {{
                    width: 60px;
                    height: 60px;
                    margin: 0 auto 10px auto;
                    background: #f0f0f0;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                }}
                
                .restaurant-name {{
                    font-size: 18px;
                    font-weight: bold;
                    margin: 10px 0;
                }}
                
                .address {{
                    font-size: 10px;
                    margin: 5px 0;
                }}
                
                .invoice-details {{
                    margin: 15px 0;
                    border-bottom: 1px solid #000;
                    padding-bottom: 10px;
                }}
                
                .invoice-details h3 {{
                    text-align: center;
                    margin: 10px 0;
                    font-size: 14px;
                }}
                
                .details-row {{
                    display: flex;
                    justify-content: space-between;
                    margin: 5px 0;
                }}
                
                .items-table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                }}
                
                .items-table th,
                .items-table td {{
                    text-align: left;
                    padding: 5px 2px;
                    border-bottom: 1px solid #000;
                }}
                
                .items-table th {{
                    font-weight: bold;
                    background: #f5f5f5;
                }}
                
                .totals {{
                    margin-top: 15px;
                    border-top: 2px solid #000;
                    padding-top: 10px;
                }}
                
                .total-row {{
                    display: flex;
                    justify-content: space-between;
                    margin: 5px 0;
                }}
                
                .total-row.final {{
                    font-weight: bold;
                    font-size: 14px;
                    border-top: 1px solid #000;
                    padding-top: 5px;
                }}
                
                .tax-breakdown {{
                    margin: 15px 0;
                    border-top: 1px solid #000;
                    padding-top: 10px;
                }}
                
                .footer {{
                    text-align: center;
                    margin-top: 20px;
                    border-top: 1px solid #000;
                    padding-top: 10px;
                }}
                
                @media print {{
                    body {{
                        max-width: none;
                        padding: 0;
                    }}
                    
                    .no-print {{
                        display: none;
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">🐐</div>
                <div style="font-size: 10px;">حلال</div>
                <div style="font-size: 10px;">UNIT OF TUAHA FOOD</div>
                <div class="restaurant-name">{bill_data.get('restaurant_name', 'KHAN SAHAB RESTAURANT')}</div>
                <div class="address">{bill_data.get('address', '4, BANSAL NAGAR FATEHABAD ROAD AGRA')}</div>
                <div class="address">State: {bill_data.get('state', 'Uttar Pradesh')} ({bill_data.get('state_code', '09')})</div>
                <div class="address">Phone: {bill_data.get('phone', '9319209322')}</div>
                <div class="address">GSTIN: {bill_data.get('gstin', '09AHDPA1039P2ZB')}</div>
                <div class="address">FSSAI: {bill_data.get('fssai', '12722001001504')}</div>
            </div>
            
            <div class="invoice-details">
                <h3>Tax Invoice</h3>
                <div class="details-row">
                    <span>Cash Sale</span>
                    <span>Date: {bill_data.get('date', current_date)}</span>
                </div>
                <div class="details-row">
                    <span>Place of Supply: {bill_data.get('place_of_supply', 'Uttar Pradesh')}</span>
                    <span>Time: {bill_data.get('time', current_time_str)}</span>
                </div>
                <div class="details-row">
                    <span></span>
                    <span>Invoice no: {bill_data.get('invoice_number', '1')}</span>
                </div>
            </div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Item Name</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                </tbody>
            </table>
            
            <div class="totals">
                <div class="total-row">
                    <span>Subtotal</span>
                    <span>₹{subtotal:.2f}</span>
                </div>
                {"<div class='total-row'><span>Taxes (GST @" + str(int(tax_rate*100)) + "%)</span><span>₹" + f"{tax_amount:.2f}" + "</span></div>" if tax_rate > 0 else ""}
                <div class="total-row final">
                    <span>Total</span>
                    <span>₹{total:.2f}</span>
                </div>
            </div>
            
            {"<div class='tax-breakdown'><h4>Tax Breakdown</h4><div class='total-row'><span>GST@" + str(int(tax_rate*100)) + "%</span><span>Taxable: ₹" + f"{subtotal:.2f}" + " | Tax: ₹" + f"{tax_amount:.2f}" + "</span></div></div>" if tax_rate > 0 else ""}
            
            <div class="footer">
                <p>Thank you for your visit!</p>
                <p>Please come again</p>
            </div>
            
            <div class="no-print" style="text-align: center; margin-top: 20px;">
                <button onclick="window.print()" style="padding: 10px 20px; font-size: 16px; background: #007cba; color: white; border: none; border-radius: 5px; cursor: pointer;">Print Bill</button>
                <button onclick="window.close()" style="padding: 10px 20px; font-size: 16px; background: #666; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
            </div>
        </body>
        </html>
        """
        
        return html_content

class WindowsPrintHandler:
    @staticmethod
    def create_print_preview(bill_data, bill_format='restaurant'):
        """Create HTML print preview and open in browser for Windows printing"""
        try:
            # Generate HTML content based on format
            if bill_format == 'restaurant':
                html_content = RestaurantBillGenerator.generate_html_bill(bill_data)
            else:
                html_content = RestaurantBillGenerator.generate_html_bill(bill_data)  # Use restaurant format as default
            
            # Create temporary HTML file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8') as temp_file:
                temp_file.write(html_content)
                temp_file_path = temp_file.name
            
            # Open in default browser for print preview
            webbrowser.open(f'file://{temp_file_path}')
            
            print(f"Print preview opened in browser: {bill_data.get('invoice_number', 'Unknown')}")
            return temp_file_path
            
        except Exception as e:
            print(f"Error creating print preview: {e}")
            return None

def print_bill(bill_data, printer_config=None, bill_format='restaurant'):
    """
    Main function to print a bill using Windows system print dialog
    
    This implementation creates an HTML preview and opens it in browser,
    allowing users to select any printer through Windows print dialog.
    The printer_config parameter is kept for API compatibility but not used
    since we rely on Windows system printer selection.
    """
    try:
        # Use Windows print handler for print preview and dialog
        temp_file_path = WindowsPrintHandler.create_print_preview(bill_data, bill_format)
        
        if temp_file_path:
            print(f"Print preview created successfully for invoice: {bill_data.get('invoice_number', 'Unknown')}")
            print("Click 'Print Bill' in the browser window to open Windows print dialog")
            return temp_file_path
        else:
            print("Failed to create print preview")
            return False
        
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
        'items': [
            {'name': 'Banana Lassi', 'qty': 1, 'price': 150.00},
            {'name': 'Paneer Tikka', 'qty': 1, 'price': 449.00},
            {'name': 'Chicken Makhani Boneless', 'qty': 1, 'price': 699.00},
            {'name': 'Butter Naan', 'qty': 2, 'price': 70.00}
        ],
        'tax_rate': 0.05,  # 5% GST
        'receipt_url': 'https://khansahabrestaurant.com/receipt/3'
    }
    
    # Test print preview (opens browser with print dialog)
    print("Opening print preview...")
    result = print_bill(sample_restaurant_bill, bill_format='restaurant')
    
    if result:
        print(f"Print preview file created: {result}")
        print("Use Ctrl+P in the browser or click 'Print Bill' to open Windows print dialog")
    else:
        print("Failed to create print preview") 