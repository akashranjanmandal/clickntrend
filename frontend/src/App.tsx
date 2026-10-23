import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { MotionConfig } from 'framer-motion';
import Layout from './components/Layout';
import Home from './pages/Home';
import Products from './pages/Products';
import Combos from './pages/Combos';
import CustomCombo from './pages/CustomCombo';
import Checkout from './pages/Checkout';
import AdminLogin from './pages/AdminLogin';
import NotFound from './pages/NotFound';
import './styles/globals.css';
import OrderTracking from './pages/OrderTracking';
import OrderConfirmation from './pages/OrderConfirmation';
import ProductPage from './pages/ProductPage';
import ComboPage from './pages/ComboPage';

function App() {
  return (
    // reducedMotion="user": skip transform animations for visitors who ask for less motion
    <MotionConfig reducedMotion="user">
    <Router>
      <CartProvider>
        <Routes>
          {/* Routes with Layout */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/combos" element={<Combos />} />
            <Route path="/custom-combo" element={<CustomCombo />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/track-order" element={<OrderTracking />} />
            <Route path="/order-confirmation" element={<OrderConfirmation />} />
            <Route path="/product/:id" element={<ProductPage />} />
            <Route path="/combo/:id" element={<ComboPage />} />
            {/* 404 inside the shop layout so visitors keep the navbar */}
            <Route path="*" element={<NotFound />} />
          </Route>
          
          {/* Admin route without Layout */}
          <Route path="/admin" element={<AdminLogin />} />
        </Routes>
      </CartProvider>
    </Router>
    </MotionConfig>
  );
}

export default App;