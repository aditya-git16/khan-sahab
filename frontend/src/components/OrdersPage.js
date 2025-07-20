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
  const [timeFilter, setTimeFilter] = useState('1day');
  const [dishSearchTerm, setDishSearchTerm] = useState('');

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

  // Helper function to format date in Indian Standard Time
  const formatDateIST = (dateString) => {
    const date = new Date(dateString);
    // The date from backend is already in IST, just format it properly
    return date.toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Helper function to get time filter date
  const getTimeFilterDate = () => {
    const now = new Date();
    switch (timeFilter) {
      case '1hour':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '6hours':
        return new Date(now.getTime() - 6 * 60 * 60 * 1000);
      case '1day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '1week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
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
        {/* Advanced Search and Filter Controls */}
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
          <div className="search-box">
            <input
              type="text"
              placeholder="Search by dish name..."
              value={dishSearchTerm}
              onChange={(e) => setDishSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <div className="time-filter">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="time-select"
            >
              <option value="1hour">Last 1 Hour</option>
              <option value="6hours">Last 6 Hours</option>
              <option value="1day">Last 1 Day</option>
              <option value="1week">Last 1 Week</option>
            </select>
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
            // Filter by time
            const orderDate = new Date(order.created_at);
            const timeFilterDate = getTimeFilterDate();
            const timeMatch = orderDate >= timeFilterDate;
            
            // Filter by search term
            const searchMatch = searchTerm === '' || 
              order.id.toString().includes(searchTerm) ||
              order.table_id.toString().includes(searchTerm);
            
            // Filter by dish search term
            const dishMatch = dishSearchTerm === '' || 
              order.items.some(item => 
                item.menu_item_name.toLowerCase().includes(dishSearchTerm.toLowerCase())
              );
            
            // Filter by category
            const categoryMatch = selectedCategory === 'all' || 
              order.items.some(item => {
                const menuItem = menu.find(m => m.id === item.menu_item_id);
                return menuItem && menuItem.category === selectedCategory;
              });
            
            return timeMatch && searchMatch && dishMatch && categoryMatch;
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