#!/usr/bin/env python3
"""
Database migration script to add new tax columns to existing database
"""
import sqlite3
import os

def migrate_database():
    """Add missing columns to the existing database"""
    db_path = 'restaurant.db'
    
    if not os.path.exists(db_path):
        print("Database file not found. Creating new database...")
        return
    
    print("Migrating existing database...")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info('order')")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Add missing columns if they don't exist
        if 'tax_rate' not in columns:
            print("Adding tax_rate column...")
            cursor.execute("ALTER TABLE 'order' ADD COLUMN tax_rate REAL DEFAULT 0.0")
        
        if 'tax_amount' not in columns:
            print("Adding tax_amount column...")
            cursor.execute("ALTER TABLE 'order' ADD COLUMN tax_amount REAL DEFAULT 0.0")
        
        if 'final_total' not in columns:
            print("Adding final_total column...")
            cursor.execute("ALTER TABLE 'order' ADD COLUMN final_total REAL DEFAULT 0.0")
        
        if 'payment_method' not in columns:
            print("Adding payment_method column...")
            cursor.execute("ALTER TABLE 'order' ADD COLUMN payment_method TEXT DEFAULT 'cash'")
        
        # Check if bill table exists, if not create it
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='bill'")
        if not cursor.fetchone():
            print("Creating bill table...")
            cursor.execute("""
                CREATE TABLE bill (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id INTEGER NOT NULL,
                    invoice_number VARCHAR(50) UNIQUE NOT NULL,
                    restaurant_name VARCHAR(100) DEFAULT 'KHAN SAHAB RESTAURANT',
                    address VARCHAR(200) DEFAULT '4, BANSAL NAGAR FATEHABAD ROAD AGRA',
                    state VARCHAR(50) DEFAULT 'Uttar Pradesh',
                    state_code VARCHAR(10) DEFAULT '09',
                    phone VARCHAR(20) DEFAULT '9319209322',
                    gstin VARCHAR(20) DEFAULT '09AHDPA1039P2ZB',
                    fssai VARCHAR(20) DEFAULT '12722001001504',
                    place_of_supply VARCHAR(50) DEFAULT 'Uttar Pradesh',
                    subtotal REAL NOT NULL,
                    tax_rate REAL DEFAULT 0.0,
                    tax_amount REAL DEFAULT 0.0,
                    total REAL NOT NULL,
                    payment_method VARCHAR(20) DEFAULT 'cash',
                    bill_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (order_id) REFERENCES "order" (id)
                )
            """)
        
        conn.commit()
        print("Database migration completed successfully!")
        
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_database() 