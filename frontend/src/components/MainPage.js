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
  const [timeFilter, setTimeFilter] = useState('1day');
  const [dishSearchTerm, setDishSearchTerm] = useState('');
  const [bills, setBills] = useState([]);

  const navigate = useNavigate();
  const API_BASE = 'http://localhost:5001/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [menuRes, tablesRes, ordersRes, categoriesRes, billsRes] = await Promise.all([
        axios.get(`${API_BASE}/menu`),
        axios.get(`${API_BASE}/tables`),
        axios.get(`${API_BASE}/orders`),
        axios.get(`${API_BASE}/menu/categories`),
        axios.get(`${API_BASE}/bills`)
      ]);
      
      setMenu(menuRes.data);
      setTables(tablesRes.data);
      setOrders(ordersRes.data);
      setMenuCategories(categoriesRes.data);
      setBills(billsRes.data);
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
      setTimeFilter('1day');
      setDishSearchTerm('');
    } else if (tab === 'bills') {
      setTimeFilter('1day');
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
      case '1month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '3months':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case '6months':
        return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      case '1year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  };

  // Helper functions for bills
  const getFilteredBills = () => {
    const timeFilterDate = getTimeFilterDate();
    return bills.filter(bill => new Date(bill.bill_date) >= timeFilterDate);
  };

  const getTotalSales = () => {
    return getFilteredBills().reduce((total, bill) => total + bill.total, 0);
  };

  const getAverageBill = () => {
    const filteredBills = getFilteredBills();
    return filteredBills.length > 0 ? getTotalSales() / filteredBills.length : 0;
  };

  const exportBillsCSV = () => {
    const filteredBills = getFilteredBills();
    const ordersWithItems = orders.filter(order => 
      filteredBills.some(bill => bill.order_id === order.id)
    );

    // Create CSV content
    let csvContent = 'Invoice Number,Order ID,Date,Time,Subtotal,Tax Rate,Tax Amount,Total,Payment Method,Items\n';
    
    filteredBills.forEach(bill => {
      const order = orders.find(o => o.id === bill.order_id);
      const items = order ? order.items.map(item => 
        `${item.menu_item_name} (${item.quantity}x₹${item.price})`
      ).join('; ') : '';
      
      // The date from backend is already in IST
      const billDate = new Date(bill.bill_date);
      const date = billDate.toLocaleDateString('en-IN');
      const time = billDate.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit',
        hour12: false 
      });
      
      csvContent += `${bill.invoice_number},${bill.order_id},${date},${time},${bill.subtotal},${bill.tax_rate * 100}%,${bill.tax_amount},${bill.total},${bill.payment_method},"${items}"\n`;
    });

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bills_${timeFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateStatisticsPDF = async () => {
    const filteredBills = getFilteredBills();
    const ordersWithItems = orders.filter(order => 
      filteredBills.some(bill => bill.order_id === order.id)
    );

    // Calculate statistics
    const totalSales = getTotalSales();
    const totalBills = filteredBills.length;
    const averageBill = getAverageBill();
    const totalOrders = ordersWithItems.length;
    const totalTax = filteredBills.reduce((sum, bill) => sum + bill.tax_amount, 0);
    
    // Item statistics
    const itemStats = {};
    ordersWithItems.forEach(order => {
      order.items.forEach(item => {
        const itemName = item.menu_item_name;
        if (!itemStats[itemName]) {
          itemStats[itemName] = { quantity: 0, revenue: 0 };
        }
        itemStats[itemName].quantity += item.quantity;
        itemStats[itemName].revenue += item.quantity * item.price;
      });
    });

    // Sort items by revenue for top items
    const topItems = Object.entries(itemStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Category statistics
    const categoryStats = {};
    ordersWithItems.forEach(order => {
      order.items.forEach(item => {
        // Find the menu item to get its category
        const menuItem = menu.find(mi => mi.id === item.menu_item_id);
        const category = menuItem?.category || 'Unknown';
        if (!categoryStats[category]) {
          categoryStats[category] = { orders: 0, revenue: 0 };
        }
        categoryStats[category].revenue += item.price * item.quantity;
      });
    });

    // Payment method statistics
    const paymentStats = {};
    filteredBills.forEach(bill => {
      const method = bill.payment_method;
      if (!paymentStats[method]) {
        paymentStats[method] = { count: 0, total: 0 };
      }
      paymentStats[method].count++;
      paymentStats[method].total += bill.total;
    });

    // Format time period properly
    const formatTimePeriod = (filter) => {
      switch(filter) {
        case '1hour': return '1 hour';
        case '6hours': return '6 hours';
        case '1day': return '1 day';
        case '1week': return '1 week';
        case '1month': return '1 month';
        case '3months': return '3 months';
        case '6months': return '6 months';
        case '1year': return '1 year';
        default: return filter.replace(/([A-Z])/g, ' $1').toLowerCase();
      }
    };

    // Prepare data for PDF generation
    const pdfData = {
      timePeriod: formatTimePeriod(timeFilter),
      summary: {
        totalSales,
        totalOrders,
        totalBills,
        averageOrderValue: averageBill,
        totalTax
      },
      topItems,
      categories: categoryStats,
      paymentMethods: paymentStats
    };

    console.log('Sending PDF data:', pdfData);

    try {
      // Call backend to generate PDF
      const response = await axios.post(`${API_BASE}/generate-pdf`, pdfData, {
        responseType: 'blob'
      });

      // Create and download PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `khan_sahab_statistics_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
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
          <button 
            className={`nav-button ${activeTab === 'bills' ? 'active' : ''}`}
            onClick={() => handleTabChange('bills')}
          >
            Bills
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

          <div className="grid">
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
              .map(order => (
                <div key={order.id} className="card">
                  <h3>Order #{order.id}</h3>
                  <p><strong>Table:</strong> {order.table_id}</p>
                  <p><strong>Status:</strong> {order.status}</p>
                  <p><strong>Total:</strong> ₹{order.total_amount.toFixed(2)}</p>
                  <p><strong>Created:</strong> {formatDateIST(order.created_at)}</p>
                  
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

      {/* Bills Section */}
      {activeTab === 'bills' && (
        <div className="section">
          <h2>Bills & Reports</h2>
          
          {/* Time Filter Controls */}
          <div className="bills-controls">
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
                <option value="1month">Last 1 Month</option>
                <option value="3months">Last 3 Months</option>
                <option value="6months">Last 6 Months</option>
                <option value="1year">Last 1 Year</option>
              </select>
            </div>
            <div className="bills-actions">
              <button 
                className="button success"
                onClick={() => exportBillsCSV()}
              >
                📊 Export Bills CSV
              </button>
              <button 
                className="button"
                onClick={() => generateStatisticsPDF()}
              >
                📈 Generate Statistics PDF
              </button>
            </div>
          </div>

          <div className="bills-summary">
            <h3>Summary for {timeFilter.replace(/([A-Z])/g, ' $1').toLowerCase()}</h3>
            <div className="summary-stats">
              <div className="stat-card">
                <h4>Total Bills</h4>
                <p>{getFilteredBills().length}</p>
              </div>
              <div className="stat-card">
                <h4>Total Sales</h4>
                <p>₹{getTotalSales().toFixed(2)}</p>
              </div>
              <div className="stat-card">
                <h4>Average Bill</h4>
                <p>₹{getAverageBill().toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bills-grid">
            {getFilteredBills().map(bill => (
              <div key={bill.id} className="bill-card">
                <h3>Bill #{bill.invoice_number}</h3>
                <p><strong>Order ID:</strong> {bill.order_id}</p>
                <p><strong>Total:</strong> ₹{bill.total.toFixed(2)}</p>
                <p><strong>Payment Method:</strong> {bill.payment_method}</p>
                <p><strong>Date:</strong> {formatDateIST(bill.bill_date)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MainPage; 