import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Products from './pages/Products';
import CustomCombo from './pages/CustomCombo';
import Checkout from './pages/Checkout';
import AdminLogin from './pages/AdminLogin';
import NotFound from './pages/NotFound';
import './styles/globals.css';

function App() {
  return (
    <Router>
      <CartProvider>
        <Routes>
          {/* Routes with Layout */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/custom-combo" element={<CustomCombo />} />
            <Route path="/checkout" element={<Checkout />} />
          </Route>
          
          {/* Admin route without Layout */}
          <Route path="/admin" element={<AdminLogin />} />
          
          {/* 404 route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </CartProvider>
    </Router>
  );
}

export default App;