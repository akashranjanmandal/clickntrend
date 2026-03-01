import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  Search, ShoppingBag, Menu, X, Gift, Package, Sparkles, 
  HelpCircle, Phone, Mail, MapPin, Clock, Truck, Shield,
  Facebook, Instagram, Youtube, ChevronRight
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import CartDrawer from './CartDrawer';
import FAQModal from './FAQModal';
import ShippingInfoModal from './ShippingInfoModal';
import ReturnPolicyModal from './ReturnPolicyModal';
import { apiFetch } from '../config';

// X (Twitter) icon component since it's not in lucide-react
const XIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const Layout: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showFAQ, setShowFAQ] = useState(false);
  const [showShipping, setShowShipping] = useState(false);
  const [showReturns, setShowReturns] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const { itemCount } = useCart();
  const location = useLocation();

  useEffect(() => {
    fetchActiveLogo();
  }, []);

  useEffect(() => {
    // Close mobile menu on route change
    setIsMenuOpen(false);
  }, [location]);

  const fetchActiveLogo = async () => {
    try {
      const data = await apiFetch('/api/logo/active').catch(() => null);
      if (data?.logo_url) {
        setLogo(data.logo_url);
        
        // Update favicon if available
        if (data.favicon_url) {
          const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (link) {
            link.href = data.favicon_url;
          } else {
            const newLink = document.createElement('link');
            newLink.rel = 'icon';
            newLink.href = data.favicon_url;
            document.head.appendChild(newLink);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching logo:', error);
    }
  };

  const navItems = [
    { name: 'Categories', path: '/products', icon: Gift },
    { name: 'Combos', path: '/combos', icon: Package },
    { name: 'Custom Combo', path: '/custom-combo', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-premium-cream">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-premium-gold/20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              {logo ? (
                <img 
                  src={logo} 
                  alt="GFTD" 
                  className="h-12 md:h-16 w-auto"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Gift className="h-8 w-8 text-premium-gold" />
                  <span className="text-2xl font-serif font-bold text-white">
                    GFTD
                  </span>
                </div>
              )}
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center space-x-1 text-premium-cream hover:text-premium-gold transition-colors font-medium"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              ))}
              <button
                onClick={() => setShowFAQ(true)}
                className="flex items-center space-x-1 text-premium-cream hover:text-premium-gold transition-colors font-medium"
              >
                <HelpCircle className="h-4 w-4" />
                <span>FAQ</span>
              </button>
            </nav>

            {/* Search and Cart */}
            <div className="flex items-center space-x-4">
              <Link
                to="/track-order"
                className="hidden md:flex items-center space-x-1 text-premium-cream hover:text-premium-gold transition-colors"
              >
                <Package className="h-5 w-5" />
                <span>Track Order</span>
              </Link>

              <button
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-premium-gold/20 transition-colors"
              >
                <ShoppingBag className="h-5 w-5 text-premium-cream" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-premium-burgundy text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-premium-gold/20 transition-colors"
              >
                {isMenuOpen ? (
                  <X className="h-5 w-5 text-premium-cream" />
                ) : (
                  <Menu className="h-5 w-5 text-premium-cream" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-premium-gold/20 pt-4">
              <div className="flex flex-col space-y-2">
                {navItems.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="flex items-center space-x-2 px-4 py-3 text-premium-cream hover:bg-premium-gold/10 rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                ))}
                <Link
                  to="/track-order"
                  className="flex items-center space-x-2 px-4 py-3 text-premium-cream hover:bg-premium-gold/10 rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Package className="h-5 w-5" />
                  <span>Track Order</span>
                </Link>
                <button
                  onClick={() => {
                    setShowFAQ(true);
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 px-4 py-3 text-premium-cream hover:bg-premium-gold/10 rounded-lg transition-colors w-full text-left"
                >
                  <HelpCircle className="h-5 w-5" />
                  <span>FAQ</span>
                </button>
              </div>

              {/* Mobile Contact Info */}
              <div className="mt-4 pt-4 border-t border-premium-gold/20">
                <div className="space-y-2 px-4">
                  <a href="tel:+919876543210" className="flex items-center gap-2 text-sm text-premium-cream/70 hover:text-premium-gold">
                    <Phone className="h-4 w-4" />
                    +91 98765 43210
                  </a>
                  <a href="mailto:support@gftd.in" className="flex items-center gap-2 text-sm text-premium-cream/70 hover:text-premium-gold">
                    <Mail className="h-4 w-4" />
                    support@gftd.in
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[60vh]">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-premium-charcoal text-white mt-20">
        {/* Main Footer */}
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand Column */}
            <div>
              <Link to="/" className="flex items-center space-x-3 mb-4">
                {logo ? (
                  <img src={logo} alt="GFTD" className="h-12 w-auto" />
                ) : (
                  <div className="flex items-center gap-2">
                    <Gift className="h-6 w-6 text-premium-gold" />
                    <span className="text-xl font-serif font-bold">GFTD</span>
                  </div>
                )}
              </Link>
              <p className="text-premium-cream/70 text-sm mb-4">
                The Art Of Gifting - Premium gifts for unforgettable moments. Curated with love, delivered with care.
              </p>
              <div className="flex gap-3">
                <a 
                  href="#" 
                  className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-premium-gold transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-premium-gold transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-premium-gold transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X (formerly Twitter)"
                >
                  <XIcon className="h-5 w-5" />
                </a>
                <a 
                  href="#" 
                  className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-premium-gold transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                >
                  <Youtube className="h-5 w-5" />
                </a>
              </div>
            </div>
            
            {/* Quick Links */}
            <div>
              <h3 className="font-serif text-lg font-semibold mb-4 flex items-center gap-2">
                <Gift className="h-5 w-5 text-premium-gold" />
                Quick Links
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/products" className="text-premium-cream/70 hover:text-premium-gold transition-colors flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Products
                  </Link>
                </li>
                <li>
                  <Link to="/combos" className="text-premium-cream/70 hover:text-premium-gold transition-colors flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Combos
                  </Link>
                </li>
                <li>
                  <Link to="/custom-combo" className="text-premium-cream/70 hover:text-premium-gold transition-colors flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Custom Combo
                  </Link>
                </li>
                <li>
                  <Link to="/track-order" className="text-premium-cream/70 hover:text-premium-gold transition-colors flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Track Order
                  </Link>
                </li>
              </ul>
            </div>
            
            {/* Support */}
            <div>
              <h3 className="font-serif text-lg font-semibold mb-4 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-premium-gold" />
                Support
              </h3>
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={() => setShowFAQ(true)}
                    className="text-premium-cream/70 hover:text-premium-gold transition-colors flex items-center gap-2 w-full text-left"
                  >
                    <ChevronRight className="h-4 w-4" />
                    FAQ
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setShowShipping(true)}
                    className="text-premium-cream/70 hover:text-premium-gold transition-colors flex items-center gap-2 w-full text-left"
                  >
                    <ChevronRight className="h-4 w-4" />
                    Shipping Info
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setShowReturns(true)}
                    className="text-premium-cream/70 hover:text-premium-gold transition-colors flex items-center gap-2 w-full text-left"
                  >
                    <ChevronRight className="h-4 w-4" />
                    Returns Policy
                  </button>
                </li>
              </ul>
            </div>
            
            {/* Contact */}
            <div>
              <h3 className="font-serif text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-premium-gold" />
                Contact
              </h3>
              <ul className="space-y-3 text-premium-cream/70">
                <li className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>123 Business Park, MG Road, Bangalore - 560001</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 flex-shrink-0" />
                  <a href="tel:+919876543210" className="hover:text-premium-gold transition-colors">
                    +91 98765 43210
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="h-5 w-5 flex-shrink-0" />
                  <a href="mailto:support@gftd.in" className="hover:text-premium-gold transition-colors">
                    support@gftd.in
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="border-t border-premium-gold/20 mt-8 pt-8 text-center">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-premium-cream/50">
                © {new Date().getFullYear()} GFTD. All rights reserved. The Art Of Gifting.
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <FAQModal isOpen={showFAQ} onClose={() => setShowFAQ(false)} />
      <ShippingInfoModal isOpen={showShipping} onClose={() => setShowShipping(false)} />
      <ReturnPolicyModal isOpen={showReturns} onClose={() => setShowReturns(false)} />

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

export default Layout;