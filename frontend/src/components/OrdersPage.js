import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE = 'http://localhost:5001/api';

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/orders`);
      setOrders(response.data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const goToTable = (tableId) => {
    navigate(`/pos/${tableId}`);
  };

  const goBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="orders-header">
        <button className="button secondary" onClick={goBack}>
          ← Back to Tables
        </button>
        <h1>All Orders</h1>
      </div>

      <div className="orders-content">
        {orders.length === 0 ? (
          <div className="no-orders">
            <p>No orders found</p>
          </div>
        ) : (
          <div className="orders-grid">
            {orders.map(order => (
              <div key={order.id} className="order-card">
                <div className="order-header">
                  <h3>Order #{order.id}</h3>
                  <span className={`status ${order.status}`}>{order.status}</span>
                </div>
                <div className="order-details">
                  <p><strong>Table:</strong> {order.table_id}</p>
                  <p><strong>Total:</strong> ₹{order.total_amount.toFixed(2)}</p>
                  <p><strong>Items:</strong> {order.items.length}</p>
                  <p><strong>Created:</strong> {new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className="order-items">
                  {order.items.map((item, index) => (
                    <div key={index} className="order-item">
                      <span>{item.menu_item_name}</span>
                      <span>x{item.quantity}</span>
                      <span>₹{item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <div className="order-actions">
                  <button 
                    className="button"
                    onClick={() => goToTable(order.table_id)}
                  >
                    Go to Table {order.table_id}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OrdersPage; 