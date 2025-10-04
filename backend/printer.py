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
        """Generate HTML bill optimized for 80mm thermal printer"""
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
                <td style="padding: 3px 1px 3px 2px; border-bottom: 1px solid #ddd; font-weight: 600; font-size: 10px;">{item['name']}</td>
                <td style="padding: 3px 1px 3px 2px; border-bottom: 1px solid #ddd; text-align: center; font-weight: 600; font-size: 10px;">{qty}</td>
                <td style="padding: 3px 1px 3px 2px; border-bottom: 1px solid #ddd; text-align: right; font-weight: 600; font-size: 10px;">₹{price:.2f}</td>
                <td style="padding: 3px 1px 3px 2px; border-bottom: 1px solid #ddd; text-align: right; font-weight: 600; font-size: 10px;">₹{amount:.2f}</td>
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
                    margin: 0;
                    size: 72mm auto;
                }}
                
                * {{
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }}
                
                body {{
                    font-family: 'Arial', sans-serif;
                    font-size: 14px;
                    font-weight: 600;
                    line-height: 1.4;
                    width: 67mm;
                    margin: 0;
                    margin-left: 5mm;
                    padding: 2mm 3mm 2mm 3mm;
                    background: white;
                    color: black;
                    -webkit-print-color-adjust: exact;
                }}
                
                .header {{
                    text-align: center;
                    border-bottom: 2px solid #000;
                    padding-bottom: 6px;
                    margin-bottom: 6px;
                }}
                
                .logo {{
                    font-size: 20px;
                    margin: 4px 0;
                    font-weight: 700;
                    letter-spacing: 2px;
                }}
                
                .restaurant-name {{
                    font-size: 16px;
                    font-weight: 700;
                    margin: 5px 0;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }}
                
                .address {{
                    font-size: 11px;
                    margin: 2px 0;
                    line-height: 1.3;
                    font-weight: 600;
                }}
                
                .halal {{
                    font-size: 10px;
                    margin: 2px 0;
                    font-weight: 600;
                }}
                
                .invoice-details {{
                    margin: 6px 0;
                    border-bottom: 2px solid #000;
                    padding-bottom: 6px;
                }}
                
                .invoice-title {{
                    text-align: center;
                    font-weight: 700;
                    font-size: 14px;
                    margin-bottom: 5px;
                    letter-spacing: 2px;
                }}
                
                .detail-row {{
                    display: flex;
                    justify-content: space-between;
                    margin: 3px 0;
                    font-size: 12px;
                    font-weight: 600;
                }}
                
                .items-table {{
                    width: 100%;
                    border-collapse: collapse;
                    margin: 6px 0;
                    font-size: 12px;
                    table-layout: fixed;
                }}
                
                .items-table th {{
                    text-align: left;
                    padding: 4px 1px 4px 2px;
                    border-bottom: 2px solid #000;
                    border-top: 2px solid #000;
                    font-weight: 700;
                    font-size: 10px;
                    background: transparent;
                    color: #000;
                }}
                
                .items-table td {{
                    padding: 3px 1px 3px 2px;
                    border-bottom: 1px solid #ddd;
                    font-size: 10px;
                    font-weight: 600;
                    word-wrap: break-word;
                }}
                
                .totals {{
                    margin-top: 6px;
                    border-top: 2px solid #000;
                    padding-top: 4px;
                }}
                
                .total-row {{
                    display: flex;
                    justify-content: space-between;
                    margin: 3px 0;
                    font-size: 12px;
                    font-weight: 600;
                }}
                
                .total-row.final {{
                    font-weight: 700;
                    font-size: 15px;
                    border-top: 3px double #000;
                    border-bottom: 3px double #000;
                    padding: 5px 0;
                    margin-top: 4px;
                    background: transparent;
                    color: #000;
                }}
                
                .footer {{
                    text-align: center;
                    margin-top: 8px;
                    border-top: 2px solid #000;
                    padding-top: 4px;
                    font-size: 11px;
                    font-weight: 600;
                }}
                
                .tax-breakdown {{
                    margin: 4px 0;
                    font-size: 11px;
                    font-weight: 600;
                    text-align: center;
                }}
                
                /* Print-specific styles for 231 DPI */
                @media print {{
                    body {{
                        width: 67mm;
                        margin: 0;
                        margin-left: 5mm;
                        padding: 2mm 3mm 2mm 3mm;
                        font-size: 14px;
                        font-weight: 600;
                    }}
                    
                    .no-print {{
                        display: none !important;
                    }}
                    
                    .header {{
                        page-break-inside: avoid;
                        border-bottom: 3px solid #000;
                    }}
                    
                    .items-table {{
                        page-break-inside: avoid;
                    }}
                    
                    .items-table th {{
                        background: transparent !important;
                        color: #000 !important;
                        font-weight: 700 !important;
                        border-top: 2px solid #000 !important;
                        border-bottom: 2px solid #000 !important;
                        padding: 4px 1px 4px 2px !important;
                        font-size: 10px !important;
                    }}
                    
                    .items-table td {{
                        padding: 3px 1px 3px 2px !important;
                        font-size: 10px !important;
                    }}
                    
                    .total-row.final {{
                        background: transparent !important;
                        color: #000 !important;
                        font-weight: 700 !important;
                        border-top: 3px double #000 !important;
                        border-bottom: 3px double #000 !important;
                    }}
                    
                    .logo, .restaurant-name, .invoice-title {{
                        font-weight: 700 !important;
                    }}
                }}
                
                /* Screen-only styles for preview */
                @media screen {{
                    body {{
                        border: 1px solid #ccc;
                        margin: 20px auto;
                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    }}
                }}
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo">KHAN SAHAB</div>
                <div class="halal">حلال - HALAL</div>
                <div class="halal">UNIT OF TUAHA FOOD</div>
                <div class="restaurant-name">{bill_data.get('restaurant_name', 'KHAN SAHAB RESTAURANT')}</div>
                <div class="address">{bill_data.get('address', '4, BANSAL NAGAR FATEHABAD ROAD AGRA')}</div>
                <div class="address">State: {bill_data.get('state', 'Uttar Pradesh')} ({bill_data.get('state_code', '09')})</div>
                <div class="address">Ph: {bill_data.get('phone', '9319209322')}</div>
                <div class="address">GSTIN: {bill_data.get('gstin', '09AHDPA1039P2ZB')}</div>
                <div class="address">FSSAI: {bill_data.get('fssai', '12722001001504')}</div>
            </div>
            
            <div class="invoice-details">
                <div class="invoice-title">TAX INVOICE</div>
                <div class="detail-row">
                    <span>Cash Sale</span>
                    <span>Date: {bill_data.get('date', current_date)}</span>
                </div>
                <div class="detail-row">
                    <span>Invoice: {bill_data.get('invoice_number', '1')}</span>
                    <span>Time: {bill_data.get('time', current_time_str)}</span>
                </div>
                <div class="detail-row">
                    <span>Place of Supply: {bill_data.get('place_of_supply', 'Uttar Pradesh')}</span>
                    <span></span>
                </div>
            </div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th style="width: 40%; padding-left: 2px;">ITEM</th>
                        <th style="width: 12%; text-align: center;">QTY</th>
                        <th style="width: 24%; text-align: right;">RATE</th>
                        <th style="width: 24%; text-align: right;">AMT</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                </tbody>
            </table>
            
            <div class="totals">
                <div class="total-row">
                    <span>SUBTOTAL</span>
                    <span>₹{subtotal:.2f}</span>
                </div>
                {"<div class='total-row'><span>GST @" + str(int(tax_rate*100)) + "%</span><span>₹" + f"{tax_amount:.2f}" + "</span></div>" if tax_rate > 0 else ""}
                <div class="total-row final">
                    <span>TOTAL</span>
                    <span>₹{total:.2f}</span>
                </div>
            </div>
            
            {"<div class='tax-breakdown'>GST@" + str(int(tax_rate*100)) + "% - Taxable: ₹" + f"{subtotal:.2f}" + " | Tax: ₹" + f"{tax_amount:.2f}" + "</div>" if tax_rate > 0 else ""}
            
            <div class="footer">
                <p>THANK YOU FOR YOUR VISIT!</p>
                <p>PLEASE COME AGAIN</p>
            </div>
            
            <div class="no-print" style="text-align: center; margin-top: 15px; background: #f5f5f5; padding: 10px; border-radius: 5px;">
                <button onclick="window.print()" style="padding: 8px 16px; font-size: 14px; background: #007cba; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 10px; font-weight: bold;">Print Bill</button>
                <button onclick="window.close()" style="padding: 8px 16px; font-size: 14px; background: #666; color: white; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">Close</button>
                <div style="margin-top: 8px; font-size: 11px; color: #666; font-weight: bold;">
                    Optimized for 72mm x 400mm thermal printer (231 DPI)
                </div>
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