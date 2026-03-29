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

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

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
  }, [orderId, API_BASE]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const roundBillTotal = (amount) => Math.round(Math.round(Number((amount + Number.EPSILON).toFixed(2))) / 10) * 10;

  const formatAmount = (amount) => amount.toFixed(2);

  const formatRoundedAmount = (amount) => roundBillTotal(amount).toString();

  const calculateTotals = () => {
    if (!order) return { subtotal: 0, tax: 0, total: 0 };

    const subtotal = order.total_amount;
    const tax = subtotal * (taxRate / 100);
    const total = roundBillTotal(subtotal + tax);

    return { subtotal, tax, total };
  };

  const generateBillHTML = (billData, subtotal, taxAmount, total) => {
    const taxRateDecimal = billData.tax_rate;
    const taxPercent = Math.round(taxRateDecimal * 100);
    const roundedTotal = roundBillTotal(total);
    const tableNumber = billData.table_number ?? billData.table_id ?? 'N/A';

    let itemsHTML = '';
    for (const item of billData.items) {
      const amount = item.qty * item.price;
      itemsHTML += `
        <tr>
          <td style="padding: 3px 1px 3px 2px; border-bottom: 1px solid #ddd; font-weight: 600; font-size: 10px;">${item.name}</td>
          <td style="padding: 3px 1px 3px 2px; border-bottom: 1px solid #ddd; text-align: center; font-weight: 600; font-size: 10px;">${item.qty}</td>
          <td style="padding: 3px 1px 3px 2px; border-bottom: 1px solid #ddd; text-align: right; font-weight: 600; font-size: 10px;">\u20B9${formatAmount(item.price)}</td>
          <td style="padding: 3px 1px 3px 2px; border-bottom: 1px solid #ddd; text-align: right; font-weight: 600; font-size: 10px;">\u20B9${formatAmount(amount)}</td>
        </tr>`;
    }

    const taxLine = taxRateDecimal > 0
      ? `<div class="total-row"><span>Tax @${taxPercent}%</span><span>\u20B9${formatAmount(taxAmount)}</span></div>`
      : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Khan Sahab - Invoice #${billData.invoice_number}</title>
  <style>
    @page { margin: 0; size: 72mm auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Arial', sans-serif;
      font-size: 14px; font-weight: 600; line-height: 1.4;
      width: 72mm; margin: 0 auto;
      padding: 2mm 5mm 2mm 3mm;
      background: white; color: black;
      -webkit-print-color-adjust: exact;
    }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px; }
    .logo { font-size: 20px; margin: 4px 0; font-weight: 700; letter-spacing: 2px; }
    .restaurant-name { font-size: 16px; font-weight: 700; margin: 5px 0; text-transform: uppercase; letter-spacing: 1px; }
    .address { font-size: 11px; margin: 2px 0; line-height: 1.3; font-weight: 600; }
    .halal { font-size: 10px; margin: 2px 0; font-weight: 600; }
    .invoice-details { margin: 6px 0; border-bottom: 2px solid #000; padding-bottom: 6px; }
    .invoice-title { text-align: center; font-weight: 700; font-size: 14px; margin-bottom: 5px; letter-spacing: 2px; }
    .detail-row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 12px; font-weight: 600; }
    .items-table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 12px; table-layout: fixed; }
    .items-table th {
      text-align: left; padding: 4px 1px 4px 2px;
      border-bottom: 2px solid #000; border-top: 2px solid #000;
      font-weight: 700; font-size: 10px; background: transparent; color: #000;
    }
    .items-table td { padding: 3px 1px 3px 2px; border-bottom: 1px solid #ddd; font-size: 10px; font-weight: 600; word-wrap: break-word; }
    .totals { margin-top: 6px; border-top: 2px solid #000; padding-top: 4px; }
    .total-row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 12px; font-weight: 600; }
    .total-row.final {
      font-weight: 700; font-size: 15px;
      border-top: 3px double #000; border-bottom: 3px double #000;
      padding: 5px 0; margin-top: 4px;
    }
    .footer { text-align: center; margin-top: 8px; border-top: 2px solid #000; padding-top: 4px; font-size: 11px; font-weight: 600; }
    .no-print { text-align: center; margin-top: 15px; background: #f5f5f5; padding: 10px; border-radius: 5px; }
    @media print {
      body { width: 72mm; margin: 0; padding: 2mm 5mm 2mm 3mm; }
      .no-print { display: none !important; }
      .header { page-break-inside: avoid; border-bottom: 3px solid #000; }
      .items-table { page-break-inside: avoid; }
      .items-table th { background: transparent !important; color: #000 !important; font-weight: 700 !important; }
      .total-row.final { background: transparent !important; color: #000 !important; font-weight: 700 !important; }
    }
    @media screen {
      body { border: 1px solid #ccc; margin: 20px auto; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">KHAN SAHAB</div>
    <div class="halal">\u062D\u0644\u0627\u0644 - HALAL</div>
    <div class="halal">UNIT OF TUAHA FOOD</div>
    <div class="restaurant-name">${billData.restaurant_name}</div>
    <div class="address">${billData.address}</div>
    <div class="address">Ph: ${billData.phone}</div>
    <div class="address">GSTIN: ${billData.gstin}</div>
    <div class="address">FSSAI: ${billData.fssai}</div>
  </div>

  <div class="invoice-details">
    <div class="invoice-title">TAX INVOICE</div>
    <div class="detail-row">
      <span>Cash Sale</span>
      <span>Date: ${billData.date}</span>
    </div>
    <div class="detail-row">
      <span>Invoice: ${billData.invoice_number}</span>
      <span>Time: ${billData.time}</span>
    </div>
    <div class="detail-row">
      <span>Table No: ${tableNumber}</span>
      <span></span>
    </div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 40%; padding-left: 2px;">ITEM</th>
        <th style="width: 12%; text-align: center;">QTY</th>
        <th style="width: 24%; text-align: right;">RATE</th>
        <th style="width: 24%; text-align: right;">AMT</th>
      </tr>
    </thead>
    <tbody>${itemsHTML}</tbody>
  </table>

  <div class="totals">
    <div class="total-row">
      <span>SUBTOTAL</span>
      <span>\u20B9${formatAmount(subtotal)}</span>
    </div>
    ${taxLine}
    <div class="total-row final">
      <span>TOTAL</span>
      <span>\u20B9${roundedTotal}</span>
    </div>
  </div>

  <div class="footer">
    <p>THANK YOU FOR YOUR VISIT!</p>
    <p>PLEASE COME AGAIN</p>
  </div>

  <div class="no-print" style="text-align: center; margin-top: 15px; background: #f5f5f5; padding: 10px; border-radius: 5px;">
    <button onclick="window.print()" style="padding: 8px 16px; font-size: 14px; background: #007cba; color: white; border: none; border-radius: 3px; cursor: pointer; margin-right: 10px; font-weight: bold;">Print Bill</button>
    <button onclick="window.close()" style="padding: 8px 16px; font-size: 14px; background: #666; color: white; border: none; border-radius: 3px; cursor: pointer; font-weight: bold;">Close</button>
    <div style="margin-top: 8px; font-size: 11px; color: #666; font-weight: bold;">
      Optimized for 72mm thermal printer
    </div>
  </div>
</body>
</html>`;
  };

  const openPrintWindow = (billData, subtotal, taxAmount, total) => {
    const html = generateBillHTML(billData, subtotal, taxAmount, total);
    const printWindow = window.open('', '_blank', 'width=320,height=700,scrollbars=yes');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
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

      const currentDate = new Date();

      const billData = {
        restaurant_name: 'KHAN SAHAB RESTAURANT',
        address: '4, BANSAL NAGAR FATEHABAD ROAD AGRA',
        phone: '9319209322',
        gstin: '09AHDPA1039P2ZB',
        fssai: '12722001001504',
        invoice_number: orderId.toString(),
        table_id: order.table_id,
        table_number: order.table_number ?? order.table_id,
        date: currentDate.toLocaleDateString('en-IN'),
        time: currentDate.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }),
        items: order.items.map(item => ({
          name: item.menu_item_name,
          qty: item.quantity,
          price: item.price
        })),
        tax_rate: taxRate / 100,
        payment_method: paymentMethod,
      };

      // Save bill to database
      const billSaveData = {
        order_id: parseInt(orderId),
        invoice_number: orderId.toString(),
        restaurant_name: billData.restaurant_name,
        address: billData.address,
        phone: billData.phone,
        gstin: billData.gstin,
        fssai: billData.fssai,
        subtotal: subtotal,
        tax_rate: taxRate / 100,
        tax_amount: tax,
        total: total,
        payment_method: paymentMethod
      };

      try {
        await axios.post(`${API_BASE}/bills`, billSaveData);
      } catch (billError) {
        console.error('Failed to save bill:', billError);
      }

      // Open bill in a new popup window for printing
      openPrintWindow(billData, subtotal, tax, total);

      setShowBill(true);

    } catch (err) {
      console.error('Error completing payment:', err);
      alert('Failed to complete payment. Please try again.');
    }
  };

  const handlePrintAgain = () => {
    const { subtotal, tax, total } = calculateTotals();
    const currentDate = new Date();
    const billData = {
      restaurant_name: 'KHAN SAHAB RESTAURANT',
      address: '4, BANSAL NAGAR FATEHABAD ROAD AGRA',
      phone: '9319209322',
      gstin: '09AHDPA1039P2ZB',
      fssai: '12722001001504',
      place_of_supply: 'Uttar Pradesh',
      invoice_number: orderId.toString(),
      table_id: order.table_id,
      table_number: order.table_number ?? order.table_id,
      date: currentDate.toLocaleDateString('en-IN'),
      time: currentDate.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
      }),
      items: order.items.map(item => ({
        name: item.menu_item_name,
        qty: item.quantity,
        price: item.price
      })),
      tax_rate: taxRate / 100,
    };
    openPrintWindow(billData, subtotal, tax, total);
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
                <p>Table No: {order.table_number ?? order.table_id}</p>
              </div>
              <div className="bill-info-right">
                <p>Date: {new Date().toLocaleDateString('en-IN')}</p>
                <p>Time: {new Date().toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                })}</p>
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
              <span>₹{formatAmount(subtotal)}</span>
            </div>
            {taxRate > 0 && (
              <div className="bill-total-line">
                <span>Tax @{taxRate}%</span>
                <span>₹{formatAmount(tax)}</span>
              </div>
            )}
            <div className="bill-total-line grand-total">
              <span>Total</span>
              <span>₹{formatRoundedAmount(total)}</span>
            </div>
          </div>

          <div className="bill-divider">------------------------------------------------</div>

          <div className="bill-footer">
            <p>Thank you for your visit!</p>
          </div>

          <div className="bill-success">
            <h2>Payment Completed Successfully!</h2>
            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                className="button success"
                onClick={handlePrintAgain}
                style={{ padding: '12px 24px', fontSize: '1rem' }}
              >
                Print Bill Again
              </button>
              <button
                className="button"
                onClick={goBack}
                style={{ padding: '12px 24px', fontSize: '1rem' }}
              >
                Back to Tables
              </button>
            </div>
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
                <span>₹{formatAmount(subtotal)}</span>
              </div>
              <div className="total-line">
                <span>Tax ({taxRate}%):</span>
                <span>₹{formatAmount(tax)}</span>
              </div>
              <div className="total-line grand-total">
                <span>Total:</span>
                <span>₹{formatRoundedAmount(total)}</span>
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
