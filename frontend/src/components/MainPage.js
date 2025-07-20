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
  const [newTable, setNewTable] = useState({ number: '' });
  const [showAddMenuItem, setShowAddMenuItem] = useState(false);
  const [newMenuItem, setNewMenuItem] = useState({ name: '', description: '', price: '', category: '' });
  const [menuCategories, setMenuCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [menuSearchTerm, setMenuSearchTerm] = useState('');
  const [menuSelectedCategory, setMenuSelectedCategory] = useState('all');

  const navigate = useNavigate();
  const API_BASE = 'http://localhost:5001/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [menuRes, tablesRes, ordersRes, categoriesRes] = await Promise.all([
        axios.get(`${API_BASE}/menu`),
        axios.get(`${API_BASE}/tables`),
        axios.get(`${API_BASE}/orders`),
        axios.get(`${API_BASE}/menu/categories`)
      ]);
      
      setMenu(menuRes.data);
      setTables(tablesRes.data);
      setOrders(ordersRes.data);
      setMenuCategories(categoriesRes.data);
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
      setNewTable({ number: '' });
      setShowAddTable(false);
      fetchData();
    } catch (err) {
      alert('Failed to add table. Please try again.');
      console.error('Error adding table:', err);
    }
  };

  const addMenuItem = async () => {
    try {
      await axios.post(`${API_BASE}/menu`, newMenuItem);
      setNewMenuItem({ name: '', description: '', price: '', category: '' });
      setShowAddMenuItem(false);
      fetchData();
    } catch (err) {
      alert('Failed to add menu item. Please try again.');
      console.error('Error adding menu item:', err);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Reset filters when switching tabs
    if (tab === 'menu') {
      setMenuSelectedCategory('all');
      setMenuSearchTerm('');
    } else if (tab === 'orders') {
      setSelectedCategory('all');
      setSearchTerm('');
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
        <div className="loading">Loading ...</div>
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
        <h1>🍽️ Khan Sahab</h1>
        <div className="nav">
          <button 
            className={`nav-button ${activeTab === 'tables' ? 'active' : ''}`}
            onClick={() => handleTabChange('tables')}
          >
            Tables
          </button>
          <button 
            className={`nav-button ${activeTab === 'menu' ? 'active' : ''}`}
            onClick={() => handleTabChange('menu')}
          >
            Menu
          </button>
          <button 
            className={`nav-button ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => handleTabChange('orders')}
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
                  <div className={`table-status ${table.status}`}>
                    {table.status}
                  </div>
                  {tableOrder && (
                    <div className="table-order-info">
                      <div className="order-id">Order #{tableOrder.id}</div>
                      <div className="order-total">₹{tableOrder.total_amount.toFixed(2)}</div>
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
          <div className="section-header">
            <h2>Menu Management</h2>
            <button className="button success" onClick={() => setShowAddMenuItem(true)}>
              + Add Menu Item
            </button>
          </div>

          {/* Add Menu Item Modal */}
          {showAddMenuItem && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>Add New Menu Item</h3>
                <div className="form-group">
                  <label>Name:</label>
                  <input
                    type="text"
                    value={newMenuItem.name}
                    onChange={(e) => setNewMenuItem({...newMenuItem, name: e.target.value})}
                    placeholder="Enter item name"
                  />
                </div>
                <div className="form-group">
                  <label>Description:</label>
                  <textarea
                    value={newMenuItem.description}
                    onChange={(e) => setNewMenuItem({...newMenuItem, description: e.target.value})}
                    placeholder="Enter item description"
                  />
                </div>
                <div className="form-group">
                  <label>Price (₹):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMenuItem.price}
                    onChange={(e) => setNewMenuItem({...newMenuItem, price: parseFloat(e.target.value)})}
                    placeholder="Enter price"
                  />
                </div>
                <div className="form-group">
                  <label>Category:</label>
                  <select
                    value={newMenuItem.category}
                    onChange={(e) => setNewMenuItem({...newMenuItem, category: e.target.value})}
                  >
                    <option value="">Select Category</option>
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
                <div className="modal-buttons">
                  <button className="button" onClick={() => setShowAddMenuItem(false)}>
                    Cancel
                  </button>
                  <button className="button success" onClick={addMenuItem}>
                    Add Item
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="menu-categories">
            <button 
              className={`category-btn ${menuSelectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setMenuSelectedCategory('all')}
            >
              All Categories
            </button>
            {menuCategories.map(category => (
              <button 
                key={category}
                className={`category-btn ${menuSelectedCategory === category ? 'active' : ''}`}
                onClick={() => setMenuSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Menu Search */}
          <div className="menu-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search menu items..."
                value={menuSearchTerm}
                onChange={(e) => setMenuSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

                    <div className="grid">
            {menu
              .filter(item => {
                // Filter by search term
                const searchMatch = menuSearchTerm === '' || 
                  item.name.toLowerCase().includes(menuSearchTerm.toLowerCase()) ||
                  item.description.toLowerCase().includes(menuSearchTerm.toLowerCase());
                
                // Filter by category
                const categoryMatch = menuSelectedCategory === 'all' || item.category === menuSelectedCategory;
                
                return searchMatch && categoryMatch;
              })
              .map(item => (
                <div key={item.id} className="card">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <p><strong>Category:</strong> {item.category}</p>
                  <div className="price">₹{item.price.toFixed(2)}</div>
                </div>
              ))}
          </div>
          
          {menu
            .filter(item => {
              const searchMatch = menuSearchTerm === '' || 
                item.name.toLowerCase().includes(menuSearchTerm.toLowerCase()) ||
                item.description.toLowerCase().includes(menuSearchTerm.toLowerCase());
              const categoryMatch = menuSelectedCategory === 'all' || item.category === menuSelectedCategory;
              return searchMatch && categoryMatch;
            })
            .length === 0 && (
            <div className="no-orders">
              <p>No menu items found matching your search criteria.</p>
            </div>
          )}
        </div>
      )}

      {/* Orders Section */}
      {activeTab === 'orders' && (
        <div className="section">
          <h2>Order Management</h2>
          
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

          <div className="grid">
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
                <div key={order.id} className="card">
                  <h3>Order #{order.id}</h3>
                  <p><strong>Table:</strong> {order.table_id}</p>
                  <p><strong>Status:</strong> {order.status}</p>
                  <p><strong>Total:</strong> ₹{order.total_amount.toFixed(2)}</p>
                  <p><strong>Created:</strong> {new Date(order.created_at).toLocaleString()}</p>
                  
                  <div>
                    <strong>Items:</strong>
                    {order.items.map(item => {
                      const menuItem = menu.find(m => m.id === item.menu_item_id);
                      return (
                        <div key={item.id} className="order-item">
                          <span>{item.menu_item_name}</span>
                          <span>Qty: {item.quantity}</span>
                          <span>₹{item.price.toFixed(2)}</span>
                          {menuItem && <span className="item-category">({menuItem.category})</span>}
                        </div>
                      );
                    })}
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