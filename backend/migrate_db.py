#!/usr/bin/env python3
"""
Database migration script to update database schema
"""
import sqlite3
import os

def migrate_database():
    """Update database schema"""
    db_path = 'restaurant.db'
    
    if not os.path.exists(db_path):
        print("Database file not found. Creating new database...")
        return
    
    print("Migrating existing database...")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # Check if columns already exist in order table
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
        
        # Check table table for capacity column
        cursor.execute("PRAGMA table_info('table')")
        table_columns = [column[1] for column in cursor.fetchall()]
        
        # Note: SQLite doesn't support dropping columns directly
        # We'll need to recreate the table if capacity column exists
        if 'capacity' in table_columns:
            print("Removing capacity column from table table...")
            # Create new table without capacity
            cursor.execute("""
                CREATE TABLE table_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    number INTEGER UNIQUE NOT NULL,
                    status VARCHAR(20) DEFAULT 'available',
                    current_order_id INTEGER
                )
            """)
            
            # Copy data from old table to new table
            cursor.execute("""
                INSERT INTO table_new (id, number, status, current_order_id)
                SELECT id, number, status, current_order_id FROM "table"
            """)
            
            # Drop old table and rename new table
            cursor.execute("DROP TABLE 'table'")
            cursor.execute("ALTER TABLE table_new RENAME TO 'table'")
        
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