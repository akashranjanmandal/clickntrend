import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { MotionConfig } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Home from './pages/Home';
import Products from './pages/Products';
import Combos from './pages/Combos';
import CustomCombo from './pages/CustomCombo';
import Checkout from './pages/Checkout';
import AdminLogin from './pages/AdminLogin';
import NotFound from './pages/NotFound';
import About from './pages/info/About';
import Contact from './pages/info/Contact';
import FAQ from './pages/info/FAQ';
import ShippingPolicy from './pages/info/ShippingPolicy';
import RefundPolicy from './pages/info/RefundPolicy';
import Terms from './pages/info/Terms';
import Privacy from './pages/info/Privacy';
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
        {/* Renders every toast() message in the shop and admin (was missing, so none ever showed) */}
        <Toaster
          position="bottom-center"
          toastOptions={{
            duration: 3000,
            style: { background: '#1A1A1A', color: '#fff', borderRadius: '9999px', padding: '10px 18px', fontSize: '14px' },
            success: { iconTheme: { primary: '#D4AF37', secondary: '#1A1A1A' } },
          }}
          containerStyle={{ zIndex: 9999 }}
        />
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
            {/* Help, policy and legal pages */}
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/shipping-policy" element={<ShippingPolicy />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy-policy" element={<Privacy />} />
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