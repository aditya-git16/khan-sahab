import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const API_BASE = 'http://localhost:5001/api';

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const [ordersRes, menuRes] = await Promise.all([
        axios.get(`${API_BASE}/orders`),
        axios.get(`${API_BASE}/menu`)
      ]);
      setOrders(ordersRes.data);
      setMenu(menuRes.data);
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
        {/* Search and Filter Controls */}
        <div className="order-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search orders by table number or order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="category-filter">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-select"
            >
              <option value="all">All Categories</option>
              <option value="Beverages">Beverages</option>
              <option value="Veg Starters">Veg Starters</option>
              <option value="Non-Veg Starters">Non-Veg Starters</option>
              <option value="Khan Sahab Spl. Mutton">Khan Sahab Spl. Mutton</option>
              <option value="Khan Sahab Spl. Chicken">Khan Sahab Spl. Chicken</option>
              <option value="Khan Sahab Spl. Chinese">Khan Sahab Spl. Chinese</option>
              <option value="Soups">Soups</option>
              <option value="Khan Sahab Veg Special">Khan Sahab Veg Special</option>
              <option value="Rice & Biryani">Rice & Biryani</option>
              <option value="Indian Breads">Indian Breads</option>
              <option value="Dessert">Dessert</option>
              <option value="Salad / Papad">Salad / Papad</option>
            </select>
          </div>
        </div>

        {orders
          .filter(order => {
            // Filter by search term
            const searchMatch = searchTerm === '' || 
              order.id.toString().includes(searchTerm) ||
              order.table_id.toString().includes(searchTerm);
            
            // Filter by category
            const categoryMatch = selectedCategory === 'all' || 
              order.items.some(item => {
                const menuItem = menu.find(m => m.id === item.menu_item_id);
                return menuItem && menuItem.category === selectedCategory;
              });
            
            return searchMatch && categoryMatch;
          })
          .length === 0 ? (
          <div className="no-orders">
            <p>No orders found</p>
          </div>
        ) : (
          <div className="orders-grid">
            {orders
              .filter(order => {
                // Filter by search term
                const searchMatch = searchTerm === '' || 
                  order.id.toString().includes(searchTerm) ||
                  order.table_id.toString().includes(searchTerm);
                
                // Filter by category
                const categoryMatch = selectedCategory === 'all' || 
                  order.items.some(item => {
                    const menuItem = menu.find(m => m.id === item.menu_item_id);
                    return menuItem && menuItem.category === selectedCategory;
                  });
                
                return searchMatch && categoryMatch;
              })
              .map(order => (
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
                  {order.items.map((item, index) => {
                    const menuItem = menu.find(m => m.id === item.menu_item_id);
                    return (
                      <div key={index} className="order-item">
                        <span>{item.menu_item_name}</span>
                        <span>x{item.quantity}</span>
                        <span>₹{item.price.toFixed(2)}</span>
                        {menuItem && <span className="item-category">({menuItem.category})</span>}
                      </div>
                    );
                  })}
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