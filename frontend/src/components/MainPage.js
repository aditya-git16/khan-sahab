import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function MainPage() {
  const [activeTab, setActiveTab] = useState('tables');
  const [menu, setMenu] = useState([]);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddTable, setShowAddTable] = useState(false);
  const [newTable, setNewTable] = useState({ number: '', capacity: 4 });

  const navigate = useNavigate();
  const API_BASE = 'http://localhost:5001/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [menuRes, tablesRes, ordersRes] = await Promise.all([
        axios.get(`${API_BASE}/menu`),
        axios.get(`${API_BASE}/tables`),
        axios.get(`${API_BASE}/orders`)
      ]);
      
      setMenu(menuRes.data);
      setTables(tablesRes.data);
      setOrders(ordersRes.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch data. Please check if the backend server is running.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addTable = async () => {
    try {
      await axios.post(`${API_BASE}/tables`, newTable);
      setNewTable({ number: '', capacity: 4 });
      setShowAddTable(false);
      fetchData();
    } catch (err) {
      alert('Failed to add table. Please try again.');
      console.error('Error adding table:', err);
    }
  };

  const handleTableClick = (table) => {
    navigate(`/pos/${table.id}`);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API_BASE}/orders/${orderId}/status`, { status: newStatus });
      fetchData();
    } catch (err) {
      alert('Failed to update order status');
      console.error('Error updating order status:', err);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading restaurant management system...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error">{error}</div>
        <button className="button" onClick={fetchData}>Retry</button>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div className="header-logo">
          <img src="/khan_sahab_logo.jpg" alt="Khan Sahab Logo" className="main-logo" />
        </div>
        <h1>🍽️ Restaurant Management System</h1>
        <div className="nav">
          <button 
            className={`nav-button ${activeTab === 'tables' ? 'active' : ''}`}
            onClick={() => setActiveTab('tables')}
          >
            Tables
          </button>
          <button 
            className={`nav-button ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => setActiveTab('menu')}
          >
            Menu
          </button>
          <button 
            className={`nav-button ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            Orders
          </button>
        </div>
      </div>

      {/* Tables Section - Main Page */}
      {activeTab === 'tables' && (
        <div className="section">
          <div className="section-header">
            <h2>Table Management</h2>
            <button className="button success" onClick={() => setShowAddTable(true)}>
              + Add Table
            </button>
          </div>

          {/* Add Table Modal */}
          {showAddTable && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>Add New Table</h3>
                <div className="form-group">
                  <label>Table Number:</label>
                  <input
                    type="number"
                    value={newTable.number}
                    onChange={(e) => setNewTable({...newTable, number: e.target.value})}
                    placeholder="Enter table number"
                  />
                </div>
                <div className="form-group">
                  <label>Capacity:</label>
                  <select
                    value={newTable.capacity}
                    onChange={(e) => setNewTable({...newTable, capacity: parseInt(e.target.value)})}
                  >
                    <option value={2}>2 seats</option>
                    <option value={4}>4 seats</option>
                    <option value={6}>6 seats</option>
                    <option value={8}>8 seats</option>
                  </select>
                </div>
                <div className="modal-buttons">
                  <button className="button" onClick={() => setShowAddTable(false)}>
                    Cancel
                  </button>
                  <button className="button success" onClick={addTable}>
                    Add Table
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="table-grid-large">
            {tables.map(table => {
              const tableOrder = orders.find(order => order.table_id === table.id && order.status !== 'paid');
              return (
                <div 
                  key={table.id} 
                  className={`table-card-large ${table.status}`}
                  onClick={() => handleTableClick(table)}
                >
                  <div className="table-number-large">Table {table.number}</div>
                  <div className="table-capacity">Capacity: {table.capacity}</div>
                  <div className={`table-status ${table.status}`}>
                    {table.status}
                  </div>
                  {tableOrder && (
                    <div className="table-order-info">
                      <div className="order-id">Order #{tableOrder.id}</div>
                      <div className="order-total">${tableOrder.total_amount.toFixed(2)}</div>
                      <div className="order-status">{tableOrder.status}</div>
                    </div>
                  )}
                  <div className="table-actions">
                    <button 
                      className="button small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTableClick(table);
                      }}
                    >
                      {tableOrder ? 'Edit Order' : 'New Order'}
                    </button>
                    {tableOrder && (
                      <button 
                        className="button small success"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/payment/${tableOrder.id}`);
                        }}
                      >
                        Payment
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Menu Section */}
      {activeTab === 'menu' && (
        <div className="section">
          <h2>Menu Items</h2>
          <div className="grid">
            {menu.map(item => (
              <div key={item.id} className="card">
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <p><strong>Category:</strong> {item.category}</p>
                <div className="price">${item.price.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders Section */}
      {activeTab === 'orders' && (
        <div className="section">
          <h2>Order Management</h2>
          <div className="grid">
            {orders.map(order => (
              <div key={order.id} className="card">
                <h3>Order #{order.id}</h3>
                <p><strong>Table:</strong> {order.table_id}</p>
                <p><strong>Status:</strong> {order.status}</p>
                <p><strong>Total:</strong> ${order.total_amount.toFixed(2)}</p>
                <p><strong>Created:</strong> {new Date(order.created_at).toLocaleString()}</p>
                
                <div>
                  <strong>Items:</strong>
                  {order.items.map(item => (
                    <div key={item.id} className="order-item">
                      <span>{item.menu_item_name}</span>
                      <span>Qty: {item.quantity}</span>
                      <span>${item.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '15px' }}>
                  <select 
                    value={order.status} 
                    onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                    style={{ marginRight: '10px' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="served">Served</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MainPage; 