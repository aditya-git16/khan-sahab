import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainPage from './components/MainPage';
import POSPage from './components/POSPage';
import PaymentPage from './components/PaymentPage';
import OrdersPage from './components/OrdersPage';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/pos/:tableId" element={<POSPage />} />
          <Route path="/payment/:orderId" element={<PaymentPage />} />
          <Route path="/orders" element={<OrdersPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 