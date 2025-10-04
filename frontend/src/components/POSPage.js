import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

function POSPage() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const [menu, setMenu] = useState([]);
  const [table, setTable] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [existingOrder, setExistingOrder] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [menuCategories, setMenuCategories] = useState([]);

  const API_BASE = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5001/api';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [menuRes, tablesRes, ordersRes, categoriesRes] = await Promise.all([
        axios.get(`${API_BASE}/menu`),
        axios.get(`${API_BASE}/tables`),
        axios.get(`${API_BASE}/orders`),
        axios.get(`${API_BASE}/menu/categories`)
      ]);
      
      setMenu(menuRes.data);
      setMenuCategories(categoriesRes.data);
      const currentTable = tablesRes.data.find(t => t.id === parseInt(tableId));
      setTable(currentTable);
      
      // Check for existing order
      const existingOrder = ordersRes.data.find(order => 
        order.table_id === parseInt(tableId) && order.status !== 'paid'
      );
      
      if (existingOrder) {
        console.log('Found existing order:', existingOrder);
        setExistingOrder(existingOrder);
        // Convert order items to cart format
        const cartItems = existingOrder.items.map(item => ({
          id: item.menu_item_id,
          name: item.menu_item_name,
          price: item.price,
          quantity: item.quantity
        })).filter(item => item.id && item.name && item.price); // Filter out invalid items
        console.log('Cart items from existing order:', cartItems);
        setCart(cartItems);
        setIsUpdating(true);
      } else {
        // Clear cart and existing order if no order found
        setCart([]);
        setExistingOrder(null);
        setIsUpdating(false);
      }
      
    } catch (err) {
      console.error('Error fetching data:', err);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    if (existingItem) {
      setCart(cart.map(cartItem => 
        cartItem.id === item.id 
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.id !== itemId));
    } else {
      setCart(cart.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      return;
    }

    try {
      // Filter out invalid items before sending
      const validItems = cart.filter(item => item.id && item.quantity > 0);
      
      if (validItems.length === 0) {
        return;
      }

      const orderData = {
        table_id: parseInt(tableId),
        items: validItems.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity
        }))
      };
      
      if (isUpdating && existingOrder) {
        // Update existing order
        await axios.put(`${API_BASE}/orders/${existingOrder.id}`, orderData);
        // Refresh the data to show updated order
        fetchData();
      } else {
        // Create new order
        const response = await axios.post(`${API_BASE}/orders`, orderData);
        // Refresh the data to show the new order in cart
        fetchData();
      }
      
    } catch (err) {
      console.error('Error placing order:', err);
    }
  };

  const goToPayment = () => {
    if (existingOrder) {
      navigate(`/payment/${existingOrder.id}`);
    }
  };

  const goBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading POS system...</div>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="container">
        <div className="error">Table not found</div>
        <button className="button" onClick={goBack}>Go Back</button>
      </div>
    );
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="pos-container">
      <div className="pos-header">
        <button className="button secondary" onClick={goBack}>
          ← Back to Tables
        </button>
        <div className="pos-header-center">
          <img src="/khan_sahab_logo.jpg" alt="Khan Sahab Logo" className="pos-logo" />
          <h1>Table {table.number} - Point of Sale</h1>
        </div>
        <div className="table-info">
          <span className="status available">Available</span>
        </div>
      </div>

      <div className="pos-content">
        {/* Left Side - Cart */}
        <div className="pos-cart">
          <h2>Current Order</h2>
          
          {cart.length === 0 ? (
            <div className="empty-cart">
              <p>No items in cart</p>
              <p>Select items from the menu to start</p>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {cart.map(item => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-info">
                      <h4>{item.name}</h4>
                      <p>₹{item.price.toFixed(2)} each</p>
                    </div>
                    <div className="quantity-controls">
                      <button 
                        className="quantity-btn"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        -
                      </button>
                      <span className="quantity">{item.quantity}</span>
                      <button 
                        className="quantity-btn"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <div className="cart-item-total">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="cart-total">
                <div className="total-line">
                  <span>Subtotal:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
                <div className="total-line grand-total">
                  <span>Total:</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="cart-actions">
                {isUpdating ? (
                  <>
                    <button 
                      className="button success" 
                      onClick={placeOrder}
                      style={{ width: '100%', marginBottom: '10px' }}
                    >
                      Update Order
                    </button>
                    <button 
                      className="button" 
                      onClick={goToPayment}
                      style={{ width: '100%' }}
                    >
                      Complete Order & Payment
                    </button>
                  </>
                ) : (
                  <button 
                    className="button success" 
                    onClick={placeOrder}
                    style={{ width: '100%' }}
                  >
                    Place Order
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Side - Menu */}
        <div className="pos-menu">
          <h2>Menu Items</h2>
          
          {/* Search and Category Filter */}
          <div className="menu-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search menu items..."
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

          <div className="menu-grid">
            {menu
              .filter(item => {
                // Filter by search term
                const searchMatch = searchTerm === '' || 
                  item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  item.description.toLowerCase().includes(searchTerm.toLowerCase());
                
                // Filter by category
                const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory;
                
                return searchMatch && categoryMatch;
              })
              .map(item => (
                <div 
                  key={item.id} 
                  className="menu-item" 
                  onClick={() => addToCart(item)}
                >
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="menu-item-category">{item.category}</div>
                  <div className="menu-item-price">₹{item.price.toFixed(2)}</div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default POSPage; 