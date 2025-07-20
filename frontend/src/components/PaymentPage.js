import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

function PaymentPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [taxRate, setTaxRate] = useState(0); // 0%, 5%, 10%
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showBill, setShowBill] = useState(false);
  const [printSuccess, setPrintSuccess] = useState(false);

  const API_BASE = 'http://localhost:5001/api';

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/orders/${orderId}`);
      setOrder(response.data);
    } catch (err) {
      console.error('Error fetching order:', err);
      alert('Failed to load order');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const calculateTotals = () => {
    if (!order) return { subtotal: 0, tax: 0, total: 0 };
    
    const subtotal = order.total_amount;
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  };

  const completePayment = async () => {
    try {
      const { subtotal, tax, total } = calculateTotals();
      
      // Update order status to paid
      await axios.put(`${API_BASE}/orders/${orderId}/status`, { 
        status: 'paid',
        tax_rate: taxRate,
        tax_amount: tax,
        final_total: total,
        payment_method: paymentMethod
      });

      // Generate restaurant bill data in Khan Sahab format
      const billData = {
        restaurant_name: 'KHAN SAHAB RESTAURANT',
        address: '4, BANSAL NAGAR FATEHABAD ROAD AGRA',
        state: 'Uttar Pradesh',
        state_code: '09',
        phone: '9319209322',
        gstin: '09AHDPA1039P2ZB',
        fssai: '12722001001504',
        place_of_supply: 'Uttar Pradesh',
        invoice_number: orderId.toString(),
        date: new Date().toLocaleDateString('en-GB'), // DD/MM/YYYY format
        time: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        }).toLowerCase(),
        items: order.items.map(item => ({
          name: item.menu_item_name,
          qty: item.quantity,
          price: item.price
        })),
        tax_rate: taxRate / 100, // Convert percentage to decimal
        payment_method: paymentMethod,
        receipt_url: `https://khansahabrestaurant.com/receipt/${orderId}`
      };

      // Save bill to database
      const billSaveData = {
        order_id: parseInt(orderId),
        invoice_number: orderId.toString(),
        restaurant_name: billData.restaurant_name,
        address: billData.address,
        state: billData.state,
        state_code: billData.state_code,
        phone: billData.phone,
        gstin: billData.gstin,
        fssai: billData.fssai,
        place_of_supply: billData.place_of_supply,
        subtotal: subtotal,
        tax_rate: taxRate / 100,
        tax_amount: tax,
        total: total,
        payment_method: paymentMethod
      };
      
      try {
        await axios.post(`${API_BASE}/bills`, billSaveData);
        console.log('Bill saved successfully');
      } catch (billError) {
        console.error('Failed to save bill:', billError);
        // Continue with payment completion even if bill saving fails
      }

      // Print bill (optional - will skip if printer not available)
      let printSuccess = false;
      try {
        await axios.post(`${API_BASE}/print-bill`, {
          ...billData,
          printer: {
            type: 'network',
            ip: '192.168.1.100',
            port: 9100
          }
        });
        console.log('Bill printed successfully');
        printSuccess = true;
      } catch (printError) {
        console.log('Printer not available, bill saved but not printed');
        // Continue with payment completion even if printing fails
      }

      setShowBill(true);
      setPrintSuccess(printSuccess);
      
      setTimeout(() => {
        navigate('/');
      }, 5000); // Redirect after 5 seconds
      
    } catch (err) {
      console.error('Error completing payment:', err);
      alert('Failed to complete payment. Please try again.');
    }
  };

  const goBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading payment details...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container">
        <div className="error">Order not found</div>
        <button className="button" onClick={goBack}>Go Back</button>
      </div>
    );
  }

  const { subtotal, tax, total } = calculateTotals();

  if (showBill) {
    return (
      <div className="container">
        <div className="bill-container restaurant-bill">
          <div className="bill-header">
            <div className="bill-logo">
              <img src="/khan_sahab_logo.jpg" alt="Khan Sahab Logo" className="logo-image" />
            </div>
            <h1>KHAN SAHAB RESTAURANT</h1>
            <p>4, BANSAL NAGAR FATEHABAD ROAD AGRA</p>
            <p>State: Uttar Pradesh (09)</p>
            <p>Phone: 9319209322</p>
            <p>GSTIN: 09AHDPA1039P2ZB</p>
            <p>FSSAI: 12722001001504</p>
            <div className="bill-divider">------------------------------------------------</div>
          </div>
          
          <div className="bill-details">
            <div className="bill-invoice-header">
              <h2>Tax Invoice</h2>
            </div>
            <div className="bill-info-grid">
              <div className="bill-info-left">
                <p>Cash Sale</p>
                <p>Place of Supply:</p>
                <p>Uttar Pradesh</p>
              </div>
              <div className="bill-info-right">
                <p>Date: {new Date().toLocaleDateString('en-GB')}</p>
                <p>Time: {new Date().toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: true 
                }).toLowerCase()}</p>
                <p>Invoice no: {orderId}</p>
              </div>
            </div>
            <div className="bill-divider">------------------------------------------------</div>
          </div>
          
          <div className="bill-items">
            <div className="bill-item-header">
              <span>Item Name</span>
              <span>Qty</span>
              <span>Price</span>
              <span>Amount</span>
            </div>
            <div className="bill-divider">------------------------------------------------</div>
            
            {order.items.map((item, index) => (
              <div key={index} className="bill-item">
                <div className="bill-item-line">
                  <span className="item-name">{item.menu_item_name}</span>
                  <span className="item-qty">x{item.quantity}</span>
                  <span className="item-price">₹{item.price.toFixed(2)}</span>
                  <span className="item-amount">₹{(item.quantity * item.price).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bill-divider">------------------------------------------------</div>
          
          <div className="bill-totals">
            <div className="bill-total-line">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            {taxRate > 0 && (
              <div className="bill-total-line">
                <span>Taxes</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
            )}
            <div className="bill-total-line grand-total">
              <span>Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
          
          {taxRate > 0 && (
            <>
              <div className="bill-divider">------------------------------------------------</div>
              <div className="bill-tax-breakdown">
                <div className="bill-tax-header">
                  <span>Tax Type</span>
                  <span>Taxable Amt</span>
                  <span>Tax Amt</span>
                </div>
                <div className="bill-divider">------------------------------------------------</div>
                <div className="bill-tax-line">
                  <span>GST@{taxRate}%</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                  <span>₹{tax.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
          
          <div className="bill-divider">------------------------------------------------</div>
          
          <div className="bill-footer">
            <p>Thank you for your visit!</p>
          </div>
          
          <div className="bill-success">
            <h2>✅ Payment Completed Successfully!</h2>
            <p>{printSuccess ? 'Restaurant bill has been printed' : 'Bill saved to database (printer not available)'}</p>
            <p>Redirecting to main page in 5 seconds...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="payment-container">
        <div className="payment-header">
          <button className="button secondary" onClick={goBack}>
            ← Back to Tables
          </button>
          <h1>Payment - Order #{orderId}</h1>
        </div>

        <div className="payment-content">
          <div className="payment-left">
            <h2>Order Summary</h2>
            <div className="order-items">
              {order.items.map((item, index) => (
                <div key={index} className="order-item">
                  <div className="order-item-info">
                    <h4>{item.menu_item_name}</h4>
                    <p>Quantity: {item.quantity}</p>
                  </div>
                  <div className="order-item-price">
                    ₹{(item.quantity * item.price).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="payment-totals">
              <div className="total-line">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="total-line">
                <span>Tax ({taxRate}%):</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="total-line grand-total">
                <span>Total:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="payment-right">
            <h2>Payment Options</h2>
            
            <div className="payment-section">
              <h3>Tax Rate</h3>
              <div className="tax-options">
                <label className="tax-option">
                  <input
                    type="radio"
                    name="tax"
                    value="0"
                    checked={taxRate === 0}
                    onChange={(e) => setTaxRate(parseInt(e.target.value))}
                  />
                  <span>No Tax (0%)</span>
                </label>
                <label className="tax-option">
                  <input
                    type="radio"
                    name="tax"
                    value="5"
                    checked={taxRate === 5}
                    onChange={(e) => setTaxRate(parseInt(e.target.value))}
                  />
                  <span>5% Tax</span>
                </label>
                <label className="tax-option">
                  <input
                    type="radio"
                    name="tax"
                    value="10"
                    checked={taxRate === 10}
                    onChange={(e) => setTaxRate(parseInt(e.target.value))}
                  />
                  <span>10% Tax</span>
                </label>
              </div>
            </div>

            <div className="payment-section">
              <h3>Payment Method</h3>
              <div className="payment-method-options">
                <label className="payment-method-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>Cash</span>
                </label>
                <label className="payment-method-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>Card</span>
                </label>
                <label className="payment-method-option">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="digital"
                    checked={paymentMethod === 'digital'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>Digital Payment</span>
                </label>
              </div>
            </div>

            <div className="payment-actions">
              <button 
                className="button success" 
                onClick={completePayment}
                style={{ width: '100%', fontSize: '1.2rem', padding: '15px' }}
              >
                Complete Payment & Print Bill
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaymentPage; 