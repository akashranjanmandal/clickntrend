import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, ShoppingBag, Menu, X, Gift, Package, Sparkles, 
  HelpCircle, Phone, Mail, MapPin, ChevronRight, ArrowUp,Instagram
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import CartDrawer from './CartDrawer';
import FAQModal from './FAQModal';
import ShippingInfoModal from './ShippingInfoModal';
import ReturnPolicyModal from './ReturnPolicyModal';
import FloatingCartButton from './FloatingCartButton';
import { apiFetch, uploadFetch } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';

// X (Twitter) icon component
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
  const [showBackToTop, setShowBackToTop] = useState(false);
  const { itemCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  // Check if current page is checkout
  const isCheckoutPage = location.pathname === '/checkout';

  // Handle scroll to show/hide back to top button
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    fetchActiveLogo();
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const fetchActiveLogo = async () => {
    try {
      const data = await apiFetch('/api/logo/active').catch(() => null);
      if (data?.logo_url) {
        setLogo(data.logo_url);
        
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-gold/20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo - Clickable to home */}
            <Link 
              to="/" 
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer group"
              onClick={() => window.scrollTo(0, 0)}
            >
              {logo ? (
                <img 
                  src={logo} 
                  alt="GFTD" 
                  className="h-12 md:h-14 w-auto"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Gift className="h-8 w-8 text-gold group-hover:scale-110 transition-transform" />
                  <span className="text-2xl font-serif font-bold gold-text">
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
                  className="flex items-center space-x-1 text-white hover:text-gold transition-colors font-medium"
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              ))}
              <button
                onClick={() => setShowFAQ(true)}
                className="flex items-center space-x-1 text-white hover:text-gold transition-colors font-medium"
              >
                <HelpCircle className="h-4 w-4" />
                <span>FAQ</span>
              </button>
            </nav>

            {/* Cart */}
            <div className="flex items-center space-x-2">
              <Link
                to="/track-order"
                className="hidden md:flex items-center space-x-1 text-white hover:text-gold transition-colors mr-2"
              >
                <Package className="h-5 w-5" />
                <span>Track Order</span>
              </Link>
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-gold/10 transition-colors"
              >
                <ShoppingBag className="h-5 w-5 text-white" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-gradient-to-r from-gold to-gold-dark text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-gold/10 transition-colors"
              >
                {isMenuOpen ? (
                  <X className="h-5 w-5 text-white" />
                ) : (
                  <Menu className="h-5 w-5 text-white" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden mt-4 overflow-hidden"
              >
                <div className="border-t border-gold/20 pt-4">
                  <div className="flex flex-col space-y-2">
                    {navItems.map(item => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className="flex items-center space-x-2 px-4 py-3 text-white hover:bg-gold/5 rounded-lg transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </Link>
                    ))}
                    <Link
                      to="/track-order"
                      className="flex items-center space-x-2 px-4 py-3 text-white hover:bg-gold/5 rounded-lg transition-colors"
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
                      className="flex items-center space-x-2 px-4 py-3 text-white hover:bg-gold/5 rounded-lg transition-colors w-full text-left"
                    >
                      <HelpCircle className="h-5 w-5" />
                      <span>FAQ</span>
                    </button>
                  </div>

                  {/* Mobile Contact Info */}
                  <div className="mt-4 pt-4 border-t border-gold/20">
                    <div className="space-y-2 px-4">
                      <a href="tel:+918240398515" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gold transition-colors">
                        <Phone className="h-4 w-4" />
                        +91 82 403 98515
                      </a>
                      <a href="mailto:care@gftd.in" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gold transition-colors">
                        <Mail className="h-4 w-4" />
                        care@gftd.in
                      </a>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[60vh]">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand Column */}
            <div>
              <Link to="/" className="flex items-center space-x-3 mb-4 group" onClick={() => window.scrollTo(0, 0)}>
                {logo ? (
                  <img src={logo} alt="GFTD" className="h-12 w-auto" />
                ) : (
                  <div className="flex items-center gap-2">
                    <Gift className="h-6 w-6 text-gold group-hover:scale-110 transition-transform" />
                    <span className="text-xl font-serif font-bold text-white">GFTD</span>
                  </div>
                )}
              </Link>
              <p className="text-gray-400 text-sm mb-4">
                The Art Of Gifting - Premium gifts for unforgettable moments. Curated with love, delivered with care.
              </p>
              <div className="flex gap-3">
                <a 
                  href="https://www.facebook.com/profile.php?id=61588448025395" 
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-gold transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                  </svg>
                </a>
                <a 
                  href="https://www.instagram.com/gftd_gifts/" 
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-gold transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a 
                  href="https://x.com/gftd_gifting" 
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-gold transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="X"
                >
                  <XIcon className="h-5 w-5" />
                </a>
                <a 
                  href="https://www.youtube.com/@gftd_gifting" 
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-gold transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              </div>
            </div>
            
            {/* Quick Links */}
            <div>
              <h3 className="font-serif text-lg font-semibold mb-4 flex items-center gap-2">
                <Gift className="h-5 w-5 text-gold" />
                Quick Links
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link to="/products" className="text-gray-400 hover:text-gold transition-colors flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Products
                  </Link>
                </li>
                <li>
                  <Link to="/combos" className="text-gray-400 hover:text-gold transition-colors flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Combos
                  </Link>
                </li>
                <li>
                  <Link to="/custom-combo" className="text-gray-400 hover:text-gold transition-colors flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Custom Combo
                  </Link>
                </li>
                <li>
                  <Link to="/track-order" className="text-gray-400 hover:text-gold transition-colors flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" />
                    Track Order
                  </Link>
                </li>
              </ul>
            </div>
            
            {/* Support */}
            <div>
              <h3 className="font-serif text-lg font-semibold mb-4 flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-gold" />
                Support
              </h3>
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={() => setShowFAQ(true)}
                    className="text-gray-400 hover:text-gold transition-colors flex items-center gap-2 w-full text-left"
                  >
                    <ChevronRight className="h-4 w-4" />
                    FAQ
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setShowShipping(true)}
                    className="text-gray-400 hover:text-gold transition-colors flex items-center gap-2 w-full text-left"
                  >
                    <ChevronRight className="h-4 w-4" />
                    Shipping Info
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setShowReturns(true)}
                    className="text-gray-400 hover:text-gold transition-colors flex items-center gap-2 w-full text-left"
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
                <MapPin className="h-5 w-5 text-gold" />
                Contact
              </h3>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 flex-shrink-0" />
                  <a href="tel:+918240398515" className="hover:text-gold transition-colors">
                    +91 82 403 98515
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="h-5 w-5 flex-shrink-0" />
                  <a href="mailto:care@gftd.in" className="hover:text-gold transition-colors">
                    care@gftd.in
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="border-t border-white/10 mt-8 pt-8 text-center">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} GFTD. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <FAQModal isOpen={showFAQ} onClose={() => setShowFAQ(false)} />
      <ShippingInfoModal isOpen={showShipping} onClose={() => setShowShipping(false)} />
      <ReturnPolicyModal isOpen={showReturns} onClose={() => setShowReturns(false)} />

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Floating Cart Button */}
      <FloatingCartButton onClick={() => setIsCartOpen(true)} hide={isCheckoutPage} />
{/* Back to Top Button */}
<AnimatePresence>
  {showBackToTop && (
    <motion.button
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={scrollToTop}
      className="fixed bottom-24 right-6 z-50 bg-gradient-to-r from-[#D4AF37] to-[#B8942E] text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all group"
      aria-label="Back to top"
    >
      <ArrowUp className="h-5 w-5 group-hover:-translate-y-1 transition-transform" />
    </motion.button>
  )}
</AnimatePresence>
    </div>
  );
};

export default Layout;