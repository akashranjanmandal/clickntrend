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
import { publicFetch } from '../utils/api';
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

  // Start each new page at the top (SPA navigation keeps the old scroll position otherwise)
  useEffect(() => {
    if (!location.hash) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);
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
      const data = await publicFetch('/api/logo/active').catch(() => null);
      if (data?.logo_url) {
        console.log('🖼️ Logo URL from API:', data.logo_url);
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
      if (!data) console.warn('⚠️ /api/logo/active returned null — no active logo in DB');
      else if (!data.logo_url) console.warn('⚠️ Logo record found but logo_url is empty:', data);
    } catch (error) {
      console.error('Error fetching logo:', error);
    }
  };

  const navItems = [
    { name: 'Shop', path: '/products' },
    { name: 'Combos', path: '/combos' },
    { name: 'Build a Combo', path: '/custom-combo' },
  ];

  // Over the home hero the header starts transparent and turns solid on scroll
  const isHome = location.pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const headerSolid = !isHome || scrolled || isMenuOpen;

  return (
    <div className="min-h-screen bg-white">
      {/* Header — transparent over the home hero, solid once scrolled (fixed height: 72px / 84px) */}
      <header
        className={`sticky top-0 z-[60] transition-[background-color,box-shadow,border-color] duration-500 ${
          headerSolid
            ? 'bg-premium-charcoal/90 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)]'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="container mx-auto flex h-[72px] items-center justify-between gap-6 px-4 md:h-[84px] md:px-6">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center" onClick={() => window.scrollTo(0, 0)} aria-label="GFTD home">
            {logo ? (
              <img src={logo} alt="GFTD" className="h-14 w-auto md:h-[70px]" onError={() => setLogo(null)} />
            ) : (
              <span className="font-serif text-3xl font-light tracking-tight text-white md:text-4xl">
                GFTD<span className="text-gold">.</span>
              </span>
            )}
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-9 md:flex" aria-label="Main">
            {navItems.map(item => {
              const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group relative py-2 text-[13px] font-medium uppercase tracking-[0.14em] transition-colors ${
                    active ? 'text-white' : 'text-white/70 hover:text-white'
                  }`}
                >
                  {item.name}
                  <span className={`absolute inset-x-0 -bottom-0.5 h-px origin-left bg-gold transition-transform duration-300 ${
                    active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  }`} />
                </Link>
              );
            })}
            <button
              onClick={() => setShowFAQ(true)}
              className="group relative py-2 text-[13px] font-medium uppercase tracking-[0.14em] text-white/70 transition-colors hover:text-white"
            >
              FAQ
              <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-gold transition-transform duration-300 group-hover:scale-x-100" />
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/track-order"
              className="hidden items-center gap-2 rounded-full px-3 py-2 text-[13px] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white md:flex"
            >
              <Package className="h-[18px] w-[18px]" />
              Track order
            </Link>
            <button
              onClick={() => setIsCartOpen(true)}
              aria-label={`Open cart${itemCount ? ` (${itemCount} items)` : ''}`}
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
            >
              <ShoppingBag className="h-5 w-5" />
              {itemCount > 0 && (
                <motion.span
                  key={itemCount}
                  initial={{ scale: 0.5 }} animate={{ scale: 1 }}
                  className="absolute right-0.5 top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-premium-charcoal"
                >
                  {itemCount}
                </motion.span>
              )}
            </button>
            <button
              onClick={() => setIsMenuOpen(true)}
              aria-label="Open menu"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu — full-height panel */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-[71] flex w-[86%] max-w-sm flex-col bg-premium-charcoal text-white md:hidden"
              aria-label="Menu"
            >
              <div className="flex h-[72px] items-center justify-between border-b border-white/10 px-6">
                <span className="text-[11px] uppercase tracking-[0.3em] text-gold">Menu</span>
                <button onClick={() => setIsMenuOpen(false)} aria-label="Close menu" className="-mr-2 rounded-full p-2 hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-6 py-8">
                {[...navItems, { name: 'Track order', path: '/track-order' }].map((item, i) => (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.05 }}
                  >
                    <Link
                      to={item.path}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-between border-b border-white/10 py-4 font-serif text-2xl font-light"
                    >
                      {item.name}
                      <ChevronRight className="h-5 w-5 text-white/40" />
                    </Link>
                  </motion.div>
                ))}
                <motion.button
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                  onClick={() => { setShowFAQ(true); setIsMenuOpen(false); }}
                  className="flex w-full items-center justify-between border-b border-white/10 py-4 text-left font-serif text-2xl font-light"
                >
                  FAQ
                  <ChevronRight className="h-5 w-5 text-white/40" />
                </motion.button>
              </nav>
              <div className="space-y-3 border-t border-white/10 px-6 py-6 text-sm text-white/70">
                <a href="tel:+918240398515" className="flex items-center gap-3 hover:text-white">
                  <Phone className="h-4 w-4 text-gold" /> +91 82 403 98515
                </a>
                <a href="mailto:care@gftd.in" className="flex items-center gap-3 hover:text-white">
                  <Mail className="h-4 w-4 text-gold" /> care@gftd.in
                </a>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

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
                  <img src={logo} alt="GFTD" className="h-12 w-auto" onError={() => setLogo(null)} />
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