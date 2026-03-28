import argparse
import os
import sqlite3
from datetime import datetime

from sqlalchemy import text

from app import app, db, Bill, MenuItem, Order, OrderItem, Table


def parse_datetime(value):
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        return value

    value = str(value).strip()
    for candidate in (value, value.replace(" ", "T", 1)):
        try:
            return datetime.fromisoformat(candidate)
        except ValueError:
            continue
    raise ValueError(f"Unsupported datetime format: {value}")


def fetch_rows(connection, table_name):
    cursor = connection.execute(f'SELECT * FROM "{table_name}" ORDER BY id')
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def target_has_data():
    return any(
        db.session.query(model.id).first() is not None
        for model in (MenuItem, Table, Order, OrderItem, Bill)
    )


def reset_postgres_sequences():
    if db.engine.url.get_backend_name() != "postgresql":
        return

    table_names = ["menu_item", '"table"', '"order"', "order_item", "bill"]
    for table_name in table_names:
        db.session.execute(
            text(
                f"""
                SELECT setval(
                    pg_get_serial_sequence('{table_name}', 'id'),
                    COALESCE((SELECT MAX(id) FROM {table_name}), 1),
                    true
                )
                """
            )
        )


def migrate(source_path):
    if not os.path.exists(source_path):
        raise FileNotFoundError(f"SQLite database not found: {source_path}")

    target_uri = app.config["SQLALCHEMY_DATABASE_URI"]
    if target_uri.startswith("sqlite:"):
        raise RuntimeError(
            "DATABASE_URL is not set to a non-SQLite database. "
            "Point the app at Railway Postgres before running this migration."
        )

    sqlite_connection = sqlite3.connect(source_path)
    sqlite_connection.row_factory = sqlite3.Row

    with app.app_context():
        db.create_all()

        if target_has_data():
            raise RuntimeError(
                "Target database already contains data. "
                "Use an empty Postgres database for this migration."
            )

        for row in fetch_rows(sqlite_connection, "menu_item"):
            db.session.add(
                MenuItem(
                    id=row["id"],
                    name=row["name"],
                    description=row.get("description"),
                    price=row.get("price", 0.0),
                    category=row.get("category"),
                    available=bool(row.get("available", 1)),
                )
            )

        for row in fetch_rows(sqlite_connection, "table"):
            db.session.add(
                Table(
                    id=row["id"],
                    number=row["number"],
                    status=row.get("status", "available"),
                    current_order_id=row.get("current_order_id"),
                )
            )

        for row in fetch_rows(sqlite_connection, "order"):
            db.session.add(
                Order(
                    id=row["id"],
                    table_id=row["table_id"],
                    total_amount=row.get("total_amount", 0.0),
                    status=row.get("status", "pending"),
                    tax_rate=row.get("tax_rate", 0.0),
                    tax_amount=row.get("tax_amount", 0.0),
                    final_total=row.get("final_total", 0.0),
                    payment_method=row.get("payment_method", "cash"),
                    created_at=parse_datetime(row.get("created_at")),
                    updated_at=parse_datetime(row.get("updated_at")),
                )
            )

        for row in fetch_rows(sqlite_connection, "order_item"):
            db.session.add(
                OrderItem(
                    id=row["id"],
                    order_id=row["order_id"],
                    menu_item_id=row["menu_item_id"],
                    quantity=row.get("quantity", 1),
                    price=row.get("price", 0.0),
                )
            )

        for row in fetch_rows(sqlite_connection, "bill"):
            db.session.add(
                Bill(
                    id=row["id"],
                    order_id=row["order_id"],
                    invoice_number=row["invoice_number"],
                    restaurant_name=row.get("restaurant_name"),
                    address=row.get("address"),
                    state=row.get("state"),
                    state_code=row.get("state_code"),
                    phone=row.get("phone"),
                    gstin=row.get("gstin"),
                    fssai=row.get("fssai"),
                    place_of_supply=row.get("place_of_supply"),
                    subtotal=row.get("subtotal", 0.0),
                    tax_rate=row.get("tax_rate", 0.0),
                    tax_amount=row.get("tax_amount", 0.0),
                    total=row.get("total", 0.0),
                    payment_method=row.get("payment_method", "cash"),
                    bill_date=parse_datetime(row.get("bill_date")),
                    created_at=parse_datetime(row.get("created_at")),
                )
            )

        db.session.commit()
        reset_postgres_sequences()
        db.session.commit()

    sqlite_connection.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Migrate data from the local SQLite database into the configured DATABASE_URL target."
    )
    parser.add_argument(
        "--source",
        default=None,
        help="Path to the SQLite database file. Defaults to backend/instance/restaurant.db.",
    )
    args = parser.parse_args()

    default_source = os.path.join(app.instance_path, "restaurant.db")
    migrate(args.source or default_source)
    print("SQLite data migrated successfully.")
