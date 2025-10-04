from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone, timedelta
import os
from printer import print_bill
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, BaseDocTemplate
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from io import BytesIO

# Helper function to get current IST time
def get_ist_time():
    # Get current UTC time
    utc_now = datetime.now(timezone.utc)
    # IST is UTC+5:30
    ist_offset = timedelta(hours=5, minutes=30)
    ist_time = utc_now + ist_offset
    return ist_time

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///restaurant.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key-here'

db = SQLAlchemy(app)
CORS(app)

# Database Models
class MenuItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50))
    available = db.Column(db.Boolean, default=True)

class Table(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    number = db.Column(db.Integer, unique=True, nullable=False)
    status = db.Column(db.String(20), default='available')  # available, occupied, reserved
    current_order_id = db.Column(db.Integer, nullable=True)

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    table_id = db.Column(db.Integer, db.ForeignKey('table.id'), nullable=False)
    items = db.relationship('OrderItem', backref='order', lazy=True)
    total_amount = db.Column(db.Float, default=0.0)
    status = db.Column(db.String(20), default='pending')  # pending, preparing, ready, served, paid
    tax_rate = db.Column(db.Float, default=0.0)  # Tax rate as decimal (0.05 for 5%)
    tax_amount = db.Column(db.Float, default=0.0)  # Calculated tax amount
    final_total = db.Column(db.Float, default=0.0)  # Total including tax
    payment_method = db.Column(db.String(20), default='cash')  # cash, card, digital
    created_at = db.Column(db.DateTime, default=get_ist_time)
    updated_at = db.Column(db.DateTime, default=get_ist_time, onupdate=get_ist_time)

class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    menu_item_id = db.Column(db.Integer, db.ForeignKey('menu_item.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    price = db.Column(db.Float, nullable=False)
    menu_item = db.relationship('MenuItem')

class Bill(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    restaurant_name = db.Column(db.String(100), default='KHAN SAHAB RESTAURANT')
    address = db.Column(db.String(200), default='4, BANSAL NAGAR FATEHABAD ROAD AGRA')
    state = db.Column(db.String(50), default='Uttar Pradesh')
    state_code = db.Column(db.String(10), default='09')
    phone = db.Column(db.String(20), default='9319209322')
    gstin = db.Column(db.String(20), default='09AHDPA1039P2ZB')
    fssai = db.Column(db.String(20), default='12722001001504')
    place_of_supply = db.Column(db.String(50), default='Uttar Pradesh')
    subtotal = db.Column(db.Float, nullable=False)
    tax_rate = db.Column(db.Float, default=0.0)
    tax_amount = db.Column(db.Float, default=0.0)
    total = db.Column(db.Float, nullable=False)
    payment_method = db.Column(db.String(20), default='cash')
    bill_date = db.Column(db.DateTime, default=get_ist_time)
    created_at = db.Column(db.DateTime, default=get_ist_time)

# API Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Restaurant Management API is running'})

# Menu endpoints
@app.route('/api/menu', methods=['GET'])
def get_menu():
    category = request.args.get('category')
    if category:
        menu_items = MenuItem.query.filter_by(available=True, category=category).all()
    else:
        menu_items = MenuItem.query.filter_by(available=True).all()
    return jsonify([{
        'id': item.id,
        'name': item.name,
        'description': item.description,
        'price': item.price,
        'category': item.category
    } for item in menu_items])

@app.route('/api/menu/categories', methods=['GET'])
def get_menu_categories():
    categories = db.session.query(MenuItem.category).filter_by(available=True).distinct().all()
    return jsonify([category[0] for category in categories if category[0]])

@app.route('/api/menu', methods=['POST'])
def add_menu_item():
    data = request.get_json()
    new_item = MenuItem(
        name=data['name'],
        description=data.get('description', ''),
        price=data['price'],
        category=data.get('category', 'General')
    )
    db.session.add(new_item)
    db.session.commit()
    return jsonify({'message': 'Menu item added successfully', 'id': new_item.id}), 201

@app.route('/api/menu/<int:item_id>', methods=['DELETE'])
def delete_menu_item(item_id):
    item = MenuItem.query.get_or_404(item_id)
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Menu item deleted successfully'}), 200

# Table endpoints
@app.route('/api/tables', methods=['GET'])
def get_tables():
    tables = Table.query.all()
    return jsonify([{
        'id': table.id,
        'number': table.number,
        'status': table.status,
        'current_order_id': table.current_order_id
    } for table in tables])

@app.route('/api/tables', methods=['POST'])
def add_table():
    data = request.get_json()
    new_table = Table(
        number=data['number']
    )
    db.session.add(new_table)
    db.session.commit()
    return jsonify({'message': 'Table added successfully', 'id': new_table.id}), 201

# Order endpoints
@app.route('/api/orders', methods=['GET'])
def get_orders():
    orders = Order.query.all()
    return jsonify([{
        'id': order.id,
        'table_id': order.table_id,
        'total_amount': order.total_amount,
        'status': order.status,
        'created_at': order.created_at.isoformat(),
        'items': [{
            'id': item.id,
            'menu_item_id': item.menu_item_id,
            'menu_item_name': item.menu_item.name,
            'quantity': item.quantity,
            'price': item.price
        } for item in order.items]
    } for order in orders])

@app.route('/api/orders', methods=['POST'])
def create_order():
    data = request.get_json()
    
    # Create new order
    new_order = Order(table_id=data['table_id'])
    db.session.add(new_order)
    db.session.flush()  # Get the order ID
    
    total_amount = 0
    
    # Add order items
    for item_data in data['items']:
        menu_item = db.session.get(MenuItem, item_data['menu_item_id'])
        if menu_item:
            order_item = OrderItem(
                order_id=new_order.id,
                menu_item_id=item_data['menu_item_id'],
                quantity=item_data['quantity'],
                price=menu_item.price
            )
            db.session.add(order_item)
            total_amount += menu_item.price * item_data['quantity']
    
    new_order.total_amount = total_amount
    
    # Update table status
    table = db.session.get(Table, data['table_id'])
    if table:
        table.status = 'occupied'
        table.current_order_id = new_order.id
    
    db.session.commit()
    
    return jsonify({
        'message': 'Order created successfully',
        'order_id': new_order.id,
        'total_amount': total_amount
    }), 201

@app.route('/api/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    order = Order.query.get_or_404(order_id)
    return jsonify({
        'id': order.id,
        'table_id': order.table_id,
        'total_amount': order.total_amount,
        'status': order.status,
        'created_at': order.created_at.isoformat(),
        'items': [{
            'id': item.id,
            'menu_item_id': item.menu_item_id,
            'menu_item_name': item.menu_item.name,
            'quantity': item.quantity,
            'price': item.price
        } for item in order.items]
    })

@app.route('/api/orders/<int:order_id>', methods=['PUT'])
def update_order(order_id):
    data = request.get_json()
    print(f"Update order data received: {data}")
    order = Order.query.get_or_404(order_id)
    
    # Clear existing order items
    OrderItem.query.filter_by(order_id=order.id).delete()
    
    # Add new order items
    total_amount = 0
    for item_data in data['items']:
        if 'menu_item_id' in item_data and 'quantity' in item_data:
            menu_item = db.session.get(MenuItem, item_data['menu_item_id'])
            if menu_item:
                order_item = OrderItem(
                    order_id=order.id,
                    menu_item_id=item_data['menu_item_id'],
                    quantity=item_data['quantity'],
                    price=menu_item.price
                )
                db.session.add(order_item)
                total_amount += menu_item.price * item_data['quantity']
    
    order.total_amount = total_amount
    db.session.commit()
    
    return jsonify({'message': 'Order updated successfully'})

@app.route('/api/orders/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    data = request.get_json()
    order = Order.query.get_or_404(order_id)
    order.status = data['status']
    
    # Update additional fields if provided
    if 'tax_rate' in data:
        order.tax_rate = data['tax_rate']
    if 'tax_amount' in data:
        order.tax_amount = data['tax_amount']
    if 'final_total' in data:
        order.final_total = data['final_total']
    if 'payment_method' in data:
        order.payment_method = data['payment_method']
    
    # If order is paid, update table status
    if data['status'] == 'paid':
        table = db.session.get(Table, order.table_id)
        if table:
            table.status = 'available'
            table.current_order_id = None
    
    db.session.commit()
    return jsonify({'message': 'Order status updated successfully'})

@app.route('/api/bills', methods=['POST'])
def create_bill():
    data = request.get_json()
    
    try:
        # Check if bill already exists for this order
        existing_bill = Bill.query.filter_by(order_id=data.get('order_id')).first()
        if existing_bill:
            return jsonify({'message': 'Bill already exists for this order', 'bill_id': existing_bill.id})
        
        # Create bill record with IST time
        new_bill = Bill(
            order_id=data.get('order_id'),
            invoice_number=data.get('invoice_number'),
            restaurant_name=data.get('restaurant_name', 'KHAN SAHAB RESTAURANT'),
            address=data.get('address', '4, BANSAL NAGAR FATEHABAD ROAD AGRA'),
            state=data.get('state', 'Uttar Pradesh'),
            state_code=data.get('state_code', '09'),
            phone=data.get('phone', '9319209322'),
            gstin=data.get('gstin', '09AHDPA1039P2ZB'),
            fssai=data.get('fssai', '12722001001504'),
            place_of_supply=data.get('place_of_supply', 'Uttar Pradesh'),
            subtotal=data.get('subtotal', 0.0),
            tax_rate=data.get('tax_rate', 0.0),
            tax_amount=data.get('tax_amount', 0.0),
            total=data.get('total', 0.0),
            payment_method=data.get('payment_method', 'cash')
        )
        
        db.session.add(new_bill)
        db.session.commit()
        
        return jsonify({'message': 'Bill created successfully', 'bill_id': new_bill.id})
    except Exception as e:
        db.session.rollback()
        print(f"Error creating bill: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/bills', methods=['GET'])
def get_bills():
    bills = Bill.query.order_by(Bill.created_at.desc()).all()
    return jsonify([{
        'id': bill.id,
        'order_id': bill.order_id,
        'invoice_number': bill.invoice_number,
        'restaurant_name': bill.restaurant_name,
        'subtotal': bill.subtotal,
        'tax_rate': bill.tax_rate,
        'tax_amount': bill.tax_amount,
        'total': bill.total,
        'payment_method': bill.payment_method,
        'bill_date': bill.bill_date.isoformat(),
        'created_at': bill.created_at.isoformat()
    } for bill in bills])

@app.route('/api/print-bill', methods=['POST'])
def print_bill_endpoint():
    data = request.get_json()
    
    try:
        # Extract printer configuration
        printer_config = data.get('printer', {
            'type': 'network',
            'ip': '192.168.1.100',
            'port': 9100
        })
        
        # Remove printer config from bill data
        bill_data = {k: v for k, v in data.items() if k != 'printer'}
        
        # Use restaurant format for bills
        success = print_bill(bill_data, printer_config, bill_format='restaurant')
        
        if success:
            return jsonify({'success': True, 'message': 'Restaurant bill printed successfully'})
        else:
            return jsonify({'success': False, 'message': 'Failed to print bill'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/generate-pdf', methods=['POST'])
def generate_pdf():
    data = request.get_json()
    print(f"Received PDF data: {data}")
    
    try:
        # Create PDF in memory
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        story = []
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            name='CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1,  # Center alignment
            textColor=colors.darkblue
        )
        
        header_style = ParagraphStyle(
            name='Header',
            parent=styles['Heading2'],
            fontSize=14,
            spaceAfter=20,
            textColor=colors.darkblue
        )
        
        normal_style = styles['Normal']
        
        # Title
        story.append(Paragraph("KHAN SAHAB RESTAURANT", title_style))
        story.append(Paragraph("SALES STATISTICS REPORT", title_style))
        story.append(Spacer(1, 20))
        
        # Report details
        story.append(Paragraph(f"<b>Summary for {data.get('timePeriod', 'N/A')}</b>", normal_style))
        story.append(Spacer(1, 10))
        story.append(Paragraph(f"<b>Generated:</b> {get_ist_time().strftime('%d/%m/%Y, %H:%M:%S')}", normal_style))
        story.append(Spacer(1, 30))
        
        # Summary section
        story.append(Paragraph("SUMMARY", header_style))
        
        summary_data = data.get('summary', {})
        summary_text = f"""
        <b>Total Sales:</b> Rs. {float(summary_data.get('totalSales', 0)):.2f}<br/>
        <b>Total Orders:</b> {int(summary_data.get('totalOrders', 0))}<br/>
        <b>Total Bills:</b> {int(summary_data.get('totalBills', 0))}<br/>
        <b>Average Order Value:</b> Rs. {float(summary_data.get('averageOrderValue', 0)):.2f}<br/>
        <b>Total Tax Collected:</b> Rs. {float(summary_data.get('totalTax', 0)):.2f}
        """
        story.append(Paragraph(summary_text, normal_style))
        story.append(Spacer(1, 20))
        
        # Top items section
        story.append(Paragraph("TOP SELLING ITEMS", header_style))
        
        top_items = data.get('topItems', [])
        if top_items:
            items_text = ""
            for i, item in enumerate(top_items, 1):
                items_text += f"{i}. <b>{item.get('name', 'N/A')}</b>: {int(item.get('quantity', 0))} sold, Rs. {float(item.get('revenue', 0)):.2f} revenue<br/>"
            story.append(Paragraph(items_text, normal_style))
        else:
            story.append(Paragraph("No items data available", normal_style))
        
        story.append(Spacer(1, 20))
        
        # Category breakdown
        story.append(Paragraph("SALES BY CATEGORY", header_style))
        
        categories = data.get('categories', {})
        if categories:
            cat_text = ""
            for category, stats in categories.items():
                cat_text += f"<b>{category}:</b> Rs. {float(stats.get('revenue', 0)):.2f}<br/>"
            story.append(Paragraph(cat_text, normal_style))
        else:
            story.append(Paragraph("No category data available", normal_style))
        
        story.append(Spacer(1, 20))
        
        # Payment methods section
        story.append(Paragraph("PAYMENT METHODS", header_style))
        
        payment_methods = data.get('paymentMethods', {})
        if payment_methods:
            payment_text = ""
            for method, stats in payment_methods.items():
                payment_text += f"<b>{str(method).title()}:</b> {int(stats.get('count', 0))} bills, Rs. {float(stats.get('total', 0)):.2f}<br/>"
            story.append(Paragraph(payment_text, normal_style))
        else:
            story.append(Paragraph("No payment method data available", normal_style))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"khan-sahab-stat-{get_ist_time().strftime('%Y%m%d_%H%M%S')}.pdf",
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"Error generating PDF: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# Initialize database with sample data
def init_db():
    with app.app_context():
        # Drop all tables and recreate them with new schema
        db.drop_all()
        db.create_all()
        
        # Add menu items with categories
        menu_items = [
            # Beverages
            {'name': 'M. Water', 'description': 'Mineral Water', 'price': 40.00, 'category': 'Beverages'},
            {'name': 'Cold Drink', 'description': 'Soft Drinks', 'price': 60.00, 'category': 'Beverages'},
            {'name': 'Fresh Lime Soda', 'description': 'Fresh Lime Soda', 'price': 120.00, 'category': 'Beverages'},
            {'name': 'Juice (Paked)', 'description': 'Packaged Juice', 'price': 150.00, 'category': 'Beverages'},
            {'name': 'Milk Tea', 'description': 'Milk Tea', 'price': 60.00, 'category': 'Beverages'},
            {'name': 'Green Tea', 'description': 'Green Tea', 'price': 60.00, 'category': 'Beverages'},
            {'name': 'Black Tea', 'description': 'Black Tea', 'price': 60.00, 'category': 'Beverages'},
            {'name': 'Mint Mojito', 'description': 'Mint Mojito', 'price': 150.00, 'category': 'Beverages'},
            {'name': 'Strawberry Mojito', 'description': 'Strawberry Mojito', 'price': 150.00, 'category': 'Beverages'},
            {'name': 'Midnight Beauty', 'description': 'Midnight Beauty', 'price': 199.00, 'category': 'Beverages'},
            {'name': 'Cold Coffee/Ice Cream (S)', 'description': 'Small Cold Coffee with Ice Cream', 'price': 159.00, 'category': 'Beverages'},
            {'name': 'Cold Coffee/Ice Cream (L)', 'description': 'Large Cold Coffee with Ice Cream', 'price': 179.00, 'category': 'Beverages'},
            {'name': 'Soda With Ice Cream', 'description': 'Soda with Ice Cream', 'price': 199.00, 'category': 'Beverages'},
            {'name': 'Milk Shake', 'description': 'Milk Shake', 'price': 150.00, 'category': 'Beverages'},
            {'name': 'Lassi (Sweet/Salted)', 'description': 'Sweet or Salted Lassi', 'price': 100.00, 'category': 'Beverages'},
            {'name': 'Banana Lassi', 'description': 'Banana Lassi', 'price': 150.00, 'category': 'Beverages'},
            {'name': 'Mango Lassi', 'description': 'Mango Lassi', 'price': 150.00, 'category': 'Beverages'},
            
            # Veg Starters
            {'name': 'Paneer Tikka', 'description': 'Paneer Tikka', 'price': 449.00, 'category': 'Veg Starters'},
            {'name': 'Paneer Malai Tikka', 'description': 'Paneer Malai Tikka', 'price': 449.00, 'category': 'Veg Starters'},
            {'name': 'Paneer Achari Tikka', 'description': 'Paneer Achari Tikka', 'price': 449.00, 'category': 'Veg Starters'},
            {'name': 'Soya Chaap Tikka', 'description': 'Soya Chaap Tikka', 'price': 499.00, 'category': 'Veg Starters'},
            {'name': 'Soya Chaap Malai Tikka', 'description': 'Soya Chaap Malai Tikka', 'price': 499.00, 'category': 'Veg Starters'},
            {'name': 'Soya Amritsari Chaap Tikka', 'description': 'Soya Amritsari Chaap Tikka', 'price': 599.00, 'category': 'Veg Starters'},
            {'name': 'Mushroom Tikka', 'description': 'Mushroom Tikka', 'price': 499.00, 'category': 'Veg Starters'},
            
            # Non-Veg Starters
            {'name': 'Chicken Tandoori', 'description': 'Chicken Tandoori', 'price': 699.00, 'category': 'Non-Veg Starters'},
            {'name': 'Chicken Tikka (6 Pcs)', 'description': 'Chicken Tikka - 6 Pieces', 'price': 499.00, 'category': 'Non-Veg Starters'},
            {'name': 'Garlic Chicken Tikka (6 Pcs)', 'description': 'Garlic Chicken Tikka - 6 Pieces', 'price': 599.00, 'category': 'Non-Veg Starters'},
            {'name': 'Chicken Malai Tikka (6 Pcs)', 'description': 'Chicken Malai Tikka - 6 Pieces', 'price': 699.00, 'category': 'Non-Veg Starters'},
            {'name': 'Chicken Afghani', 'description': 'Chicken Afghani', 'price': 699.00, 'category': 'Non-Veg Starters'},
            {'name': 'Chicken Kabab', 'description': 'Chicken Kabab', 'price': 499.00, 'category': 'Non-Veg Starters'},
            {'name': 'Mutton Kabab', 'description': 'Mutton Kabab', 'price': 599.00, 'category': 'Non-Veg Starters'},
            {'name': 'Mutton Tikka', 'description': 'Mutton Tikka', 'price': 699.00, 'category': 'Non-Veg Starters'},
            {'name': 'Chicken Platter', 'description': 'Chicken Platter', 'price': 799.00, 'category': 'Non-Veg Starters'},
            {'name': 'Fish Tikka', 'description': 'Fish Tikka', 'price': 599.00, 'category': 'Non-Veg Starters'},
            {'name': 'Fish Amritsari', 'description': 'Fish Amritsari', 'price': 549.00, 'category': 'Non-Veg Starters'},
            
            # Khan Sahab Spl. Mutton
            {'name': 'Mutton Palak Goast', 'description': 'Mutton Palak Goast', 'price': 599.00, 'category': 'Khan Sahab Spl. Mutton'},
            {'name': 'Mutton Stew (Chef Spl.)', 'description': 'Mutton Stew - Chef Special', 'price': 599.00, 'category': 'Khan Sahab Spl. Mutton'},
            {'name': 'Mutton Rogan Josh', 'description': 'Mutton Rogan Josh', 'price': 599.00, 'category': 'Khan Sahab Spl. Mutton'},
            {'name': 'Bhuna Mutton (Chef Spl.)', 'description': 'Bhuna Mutton - Chef Special', 'price': 699.00, 'category': 'Khan Sahab Spl. Mutton'},
            {'name': 'Mutton Dhawa', 'description': 'Mutton Dhawa', 'price': 599.00, 'category': 'Khan Sahab Spl. Mutton'},
            {'name': 'Tawa Mutton', 'description': 'Tawa Mutton', 'price': 599.00, 'category': 'Khan Sahab Spl. Mutton'},
            {'name': 'Mutton Keema Mutter', 'description': 'Mutton Keema Mutter', 'price': 599.00, 'category': 'Khan Sahab Spl. Mutton'},
            {'name': 'Mutton Handi', 'description': 'Mutton Handi', 'price': 699.00, 'category': 'Khan Sahab Spl. Mutton'},
            {'name': 'Mutton 199 (Chef Spl.)', 'description': 'Mutton 199 - Chef Special', 'price': 599.00, 'category': 'Khan Sahab Spl. Mutton'},
            {'name': 'Rahara Mutton', 'description': 'Rahara Mutton', 'price': 699.00, 'category': 'Khan Sahab Spl. Mutton'},
            {'name': 'Fish Curry', 'description': 'Fish Curry', 'price': 699.00, 'category': 'Khan Sahab Spl. Mutton'},
            {'name': 'Egg Curry', 'description': 'Egg Curry', 'price': 250.00, 'category': 'Khan Sahab Spl. Mutton'},
            
            # Khan Sahab Spl. Chicken
            {'name': 'Chicken Makhani Boneless', 'description': 'Chicken Makhani Boneless', 'price': 699.00, 'category': 'Khan Sahab Spl. Chicken'},
            {'name': 'Chicken Kalimirch', 'description': 'Chicken Kalimirch', 'price': 749.00, 'category': 'Khan Sahab Spl. Chicken'},
            {'name': 'Chicken Malai Gravy Boneless', 'description': 'Chicken Malai Gravy Boneless', 'price': 699.00, 'category': 'Khan Sahab Spl. Chicken'},
            {'name': 'Chicken Korma', 'description': 'Chicken Korma', 'price': 699.00, 'category': 'Khan Sahab Spl. Chicken'},
            {'name': 'Chicken Do Pyaza', 'description': 'Chicken Do Pyaza', 'price': 699.00, 'category': 'Khan Sahab Spl. Chicken'},
            {'name': 'Khan Sahab Spl. Chicken Bhuna', 'description': 'Khan Sahab Special Chicken Bhuna', 'price': 799.00, 'category': 'Khan Sahab Spl. Chicken'},
            {'name': 'Kadhai Chicken', 'description': 'Kadhai Chicken', 'price': 699.00, 'category': 'Khan Sahab Spl. Chicken'},
            {'name': 'Chicken Shahi Korama', 'description': 'Chicken Shahi Korama', 'price': 699.00, 'category': 'Khan Sahab Spl. Chicken'},
            {'name': 'Chicken Tikka Masala', 'description': 'Chicken Tikka Masala', 'price': 699.00, 'category': 'Khan Sahab Spl. Chicken'},
            
            # Khan Sahab Spl. Chinese
            {'name': 'Veg. Noodle', 'description': 'Vegetable Noodle', 'price': 399.00, 'category': 'Khan Sahab Spl. Chinese'},
            {'name': 'Chicken Noodle', 'description': 'Chicken Noodle', 'price': 499.00, 'category': 'Khan Sahab Spl. Chinese'},
            {'name': 'Veg. Manchurian', 'description': 'Vegetable Manchurian', 'price': 399.00, 'category': 'Khan Sahab Spl. Chinese'},
            {'name': 'Chicken Manchurian', 'description': 'Chicken Manchurian', 'price': 499.00, 'category': 'Khan Sahab Spl. Chinese'},
            {'name': 'Chilly Paneer', 'description': 'Chilly Paneer', 'price': 399.00, 'category': 'Khan Sahab Spl. Chinese'},
            {'name': 'Chilly Chicken', 'description': 'Chilly Chicken', 'price': 499.00, 'category': 'Khan Sahab Spl. Chinese'},
            {'name': 'Honey Chilly Potato', 'description': 'Honey Chilly Potato', 'price': 349.00, 'category': 'Khan Sahab Spl. Chinese'},
            {'name': 'French Fry', 'description': 'French Fry', 'price': 199.00, 'category': 'Khan Sahab Spl. Chinese'},
            {'name': 'Chicken Lollipop (5 Pcs.)', 'description': 'Chicken Lollipop - 5 Pieces', 'price': 499.00, 'category': 'Khan Sahab Spl. Chinese'},
            {'name': 'Chicken Maggi', 'description': 'Chicken Maggi', 'price': 449.00, 'category': 'Khan Sahab Spl. Chinese'},
            {'name': 'Mutton Maggi', 'description': 'Mutton Maggi', 'price': 499.00, 'category': 'Khan Sahab Spl. Chinese'},
            
            # Soups
            {'name': 'Veg. Soup', 'description': 'Vegetable Soup', 'price': 150.00, 'category': 'Soups'},
            {'name': 'Veg Hot \'N\' Sour Soup', 'description': 'Vegetable Hot and Sour Soup', 'price': 180.00, 'category': 'Soups'},
            {'name': 'Chicken Soup', 'description': 'Chicken Soup', 'price': 199.00, 'category': 'Soups'},
            {'name': 'Chicken Hot \'N\' Sour Soup', 'description': 'Chicken Hot and Sour Soup', 'price': 250.00, 'category': 'Soups'},
            
            # Khan Sahab Veg Special
            {'name': 'Kadhai Paneer', 'description': 'Kadhai Paneer', 'price': 449.00, 'category': 'Khan Sahab Veg Special'},
            {'name': 'Paneer Butter Masala', 'description': 'Paneer Butter Masala', 'price': 499.00, 'category': 'Khan Sahab Veg Special'},
            {'name': 'Shahi Paneer', 'description': 'Shahi Paneer', 'price': 499.00, 'category': 'Khan Sahab Veg Special'},
            {'name': 'Mutter Paneer', 'description': 'Mutter Paneer', 'price': 449.00, 'category': 'Khan Sahab Veg Special'},
            {'name': 'Palak Paneer', 'description': 'Palak Paneer', 'price': 449.00, 'category': 'Khan Sahab Veg Special'},
            {'name': 'Mix Vegetable', 'description': 'Mix Vegetable', 'price': 399.00, 'category': 'Khan Sahab Veg Special'},
            {'name': 'Dal Tadka', 'description': 'Dal Tadka', 'price': 349.00, 'category': 'Khan Sahab Veg Special'},
            {'name': 'Dal Makhani', 'description': 'Dal Makhani', 'price': 399.00, 'category': 'Khan Sahab Veg Special'},
            {'name': 'Chaap Kadhai Masala', 'description': 'Chaap Kadhai Masala', 'price': 449.00, 'category': 'Khan Sahab Veg Special'},
            {'name': 'Chaap Rara', 'description': 'Chaap Rara', 'price': 499.00, 'category': 'Khan Sahab Veg Special'},
            {'name': 'Aloo Gobhi Kamanchi', 'description': 'Aloo Gobhi Kamanchi', 'price': 399.00, 'category': 'Khan Sahab Veg Special'},
            {'name': 'Mushroom Mutter Masala', 'description': 'Mushroom Mutter Masala', 'price': 499.00, 'category': 'Khan Sahab Veg Special'},
            {'name': 'Fruit Cocktail Curry', 'description': 'Fruit Cocktail Curry', 'price': 499.00, 'category': 'Khan Sahab Veg Special'},
            
            # Rice & Biryani
            {'name': 'Steam Rice', 'description': 'Steam Rice', 'price': 199.00, 'category': 'Rice & Biryani'},
            {'name': 'Egg Biryani', 'description': 'Egg Biryani', 'price': 299.00, 'category': 'Rice & Biryani'},
            {'name': 'Veg Biryani', 'description': 'Vegetable Biryani', 'price': 349.00, 'category': 'Rice & Biryani'},
            {'name': 'Mutton Biryani', 'description': 'Mutton Biryani', 'price': 449.00, 'category': 'Rice & Biryani'},
            {'name': 'Chicken Biryani', 'description': 'Chicken Biryani', 'price': 399.00, 'category': 'Rice & Biryani'},
            {'name': 'Jeera Rice', 'description': 'Jeera Rice', 'price': 249.00, 'category': 'Rice & Biryani'},
            {'name': 'Peas Pulao', 'description': 'Peas Pulao', 'price': 299.00, 'category': 'Rice & Biryani'},
            
            # Indian Breads
            {'name': 'Tawa Roti', 'description': 'Tawa Roti', 'price': 20.00, 'category': 'Indian Breads'},
            {'name': 'Rumali Roti', 'description': 'Rumali Roti', 'price': 30.00, 'category': 'Indian Breads'},
            {'name': 'Tandoori Roti', 'description': 'Tandoori Roti', 'price': 30.00, 'category': 'Indian Breads'},
            {'name': 'Butter Roti', 'description': 'Butter Roti', 'price': 35.00, 'category': 'Indian Breads'},
            {'name': 'Naan', 'description': 'Naan', 'price': 40.00, 'category': 'Indian Breads'},
            {'name': 'Butter Naan', 'description': 'Butter Naan', 'price': 50.00, 'category': 'Indian Breads'},
            {'name': 'Laccha Paratha', 'description': 'Laccha Paratha', 'price': 60.00, 'category': 'Indian Breads'},
            {'name': 'Garlic Naan', 'description': 'Garlic Naan', 'price': 60.00, 'category': 'Indian Breads'},
            {'name': 'Aloo Stuffed Naan/Paratha', 'description': 'Aloo Stuffed Naan/Paratha', 'price': 80.00, 'category': 'Indian Breads'},
            {'name': 'Paneer Stuffed Naan/Paratha', 'description': 'Paneer Stuffed Naan/Paratha', 'price': 100.00, 'category': 'Indian Breads'},
            {'name': 'Bombay Roti with Butter', 'description': 'Bombay Roti with Butter', 'price': 40.00, 'category': 'Indian Breads'},
            {'name': 'Keema Naan', 'description': 'Keema Naan', 'price': 120.00, 'category': 'Indian Breads'},
            
            # Dessert
            {'name': 'Gulab Jamun', 'description': 'Gulab Jamun', 'price': 99.00, 'category': 'Dessert'},
            {'name': 'Rasmalai', 'description': 'Rasmalai', 'price': 179.00, 'category': 'Dessert'},
            {'name': 'Vanilla Ice Cream', 'description': 'Vanilla Ice Cream', 'price': 120.00, 'category': 'Dessert'},
            {'name': 'Strawberry Ice Cream', 'description': 'Strawberry Ice Cream', 'price': 120.00, 'category': 'Dessert'},
            {'name': 'Fruit Cream', 'description': 'Fruit Cream', 'price': 179.00, 'category': 'Dessert'},
            
            # Salad / Papad
            {'name': 'Green Salad', 'description': 'Green Salad', 'price': 80.00, 'category': 'Salad / Papad'},
            {'name': 'Russian Salad', 'description': 'Russian Salad', 'price': 120.00, 'category': 'Salad / Papad'},
            {'name': 'Fruit Cream Salad', 'description': 'Fruit Cream Salad', 'price': 150.00, 'category': 'Salad / Papad'},
            {'name': 'Papad (Dry/Fry - 2pcs)', 'description': 'Papad - Dry or Fry - 2 pieces', 'price': 40.00, 'category': 'Salad / Papad'},
            {'name': 'Masala Papad', 'description': 'Masala Papad', 'price': 60.00, 'category': 'Salad / Papad'},
            {'name': 'Boondi Raita', 'description': 'Boondi Raita', 'price': 60.00, 'category': 'Salad / Papad'},
            {'name': 'Mix Veg. Raita', 'description': 'Mix Vegetable Raita', 'price': 80.00, 'category': 'Salad / Papad'},
        ]
        
        for item_data in menu_items:
            item = MenuItem(**item_data)
            db.session.add(item)
        
        # Add sample tables (without capacity field)
        for i in range(1, 11):  # 10 tables
            table = Table(number=i)
            db.session.add(table)
        
        db.session.commit()
        print("Database initialized with new schema and menu items!")

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5001) 