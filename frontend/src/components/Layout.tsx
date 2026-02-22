import React, { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Search, ShoppingBag, Menu, X, Gift, Package, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import CartDrawer from './CartDrawer';

const Layout: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { itemCount } = useCart();

  const navItems = [
    { name: 'Products', path: '/products', icon: Gift },
    { name: 'Combos', path: '/combos', icon: Package },
    { name: 'Custom Combo', path: '/custom-combo', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-premium-cream">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-sm border-b border-premium-gold/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
      <Link to="/" className="flex items-center space-x-3">
        <img 
          src="/logo.png" 
          alt="GFTD" 
          className="h-16 w-auto"
        />
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
            </nav>

            {/* Search and Cart */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-premium-gold transition-colors"
              >
                <ShoppingBag className="h-5 w-5 text-premium-cream" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-premium-burgundy text-gold text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden flex items-center justify-center w-10 h-10 rounded-full hover:bg-premium-cream transition-colors"
              >
                {isMenuOpen ? (
                  <X className="h-5 w-5 text-premium-charcoal" />
                ) : (
                  <Menu className="h-5 w-5 text-premium-charcoal" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden mt-4 pb-4">
              <div className="flex flex-col space-y-2">
                {navItems.map(item => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className="flex items-center space-x-2 px-4 py-3 text-premium-charcoal hover:bg-premium-gold/10 rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-premium-charcoal text-white mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
                    <Link to="/" className="flex items-center space-x-3">
        <img 
          src="/logo.png" 
          alt="GFTD" 
          className="h-16 w-auto"
        />
      </Link>
              <p className="text-premium-cream/70">
                The Art Of Gifting - Premium gifts for unforgettable moments.
              </p>
            </div>
            
            <div>
              <h3 className="font-serif text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/products" className="text-premium-cream/70 hover:text-premium-gold">Products</Link></li>
                <li><Link to="/combos" className="text-premium-cream/70 hover:text-premium-gold">Combos</Link></li>
                <li><Link to="/custom-combo" className="text-premium-cream/70 hover:text-premium-gold">Custom Combo</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-serif text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li><Link to="/contact" className="text-premium-cream/70 hover:text-premium-gold">Contact Us</Link></li>
                <li><Link to="/faq" className="text-premium-cream/70 hover:text-premium-gold">FAQ</Link></li>
                <li><Link to="/shipping" className="text-premium-cream/70 hover:text-premium-gold">Shipping Info</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-serif text-lg font-semibold mb-4">Contact</h3>
              <p className="text-premium-cream/70">
                support@gftd.in<br />
                +91 9876543210<br />
                24/7 Customer Support
              </p>
            </div>
          </div>
          
          <div className="border-t border-premium-gold/20 mt-8 pt-8 text-center text-premium-cream/50">
            <p>© {new Date().getFullYear()} GFTD. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

export default Layout;