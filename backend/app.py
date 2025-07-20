from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
from printer import print_bill

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
    capacity = db.Column(db.Integer, default=4)
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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
    bill_date = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# API Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Restaurant Management API is running'})

# Menu endpoints
@app.route('/api/menu', methods=['GET'])
def get_menu():
    menu_items = MenuItem.query.filter_by(available=True).all()
    return jsonify([{
        'id': item.id,
        'name': item.name,
        'description': item.description,
        'price': item.price,
        'category': item.category
    } for item in menu_items])

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

# Table endpoints
@app.route('/api/tables', methods=['GET'])
def get_tables():
    tables = Table.query.all()
    return jsonify([{
        'id': table.id,
        'number': table.number,
        'capacity': table.capacity,
        'status': table.status,
        'current_order_id': table.current_order_id
    } for table in tables])

@app.route('/api/tables', methods=['POST'])
def add_table():
    data = request.get_json()
    new_table = Table(
        number=data['number'],
        capacity=data.get('capacity', 4)
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
        menu_item = MenuItem.query.get(item_data['menu_item_id'])
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
    table = Table.query.get(data['table_id'])
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
            menu_item = MenuItem.query.get(item_data['menu_item_id'])
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
        table = Table.query.get(order.table_id)
        if table:
            table.status = 'available'
            table.current_order_id = None
    
    db.session.commit()
    return jsonify({'message': 'Order status updated successfully'})

@app.route('/api/bills', methods=['POST'])
def create_bill():
    data = request.get_json()
    
    try:
        # Create bill record
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

# Initialize database with sample data
def init_db():
    with app.app_context():
        # Drop all tables and recreate them with new schema
        db.drop_all()
        db.create_all()
        
        # Add sample menu items
        sample_items = [
            {'name': 'Margherita Pizza', 'description': 'Classic tomato and mozzarella', 'price': 299.00, 'category': 'Pizza'},
            {'name': 'Pepperoni Pizza', 'description': 'Spicy pepperoni with cheese', 'price': 399.00, 'category': 'Pizza'},
            {'name': 'Caesar Salad', 'description': 'Fresh romaine with caesar dressing', 'price': 199.00, 'category': 'Salad'},
            {'name': 'Chicken Wings', 'description': 'Crispy wings with choice of sauce', 'price': 299.00, 'category': 'Appetizer'},
            {'name': 'Pasta Carbonara', 'description': 'Creamy pasta with bacon', 'price': 349.00, 'category': 'Pasta'},
            {'name': 'Chocolate Cake', 'description': 'Rich chocolate layer cake', 'price': 149.00, 'category': 'Dessert'},
            {'name': 'Iced Tea', 'description': 'Refreshing iced tea', 'price': 49.00, 'category': 'Beverage'},
            {'name': 'Coffee', 'description': 'Fresh brewed coffee', 'price': 39.00, 'category': 'Beverage'}
        ]
        
        for item_data in sample_items:
            item = MenuItem(**item_data)
            db.session.add(item)
        
        # Add sample tables
        for i in range(1, 11):  # 10 tables
            table = Table(number=i, capacity=4)
            db.session.add(table)
        
        db.session.commit()
        print("Database initialized with new schema and sample data!")

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5001) 