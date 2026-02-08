import React, { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Search, ShoppingBag, Menu, X, Gift } from 'lucide-react';
import { useCart } from '../context/CartContext';
import CartDrawer from './CartDrawer';

const Layout: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { itemCount } = useCart();

  const categories = [
    'Birthday',
    'Anniversary',
    'Valentine',
    'Christmas',
    'Wedding',
    'Corporate',
  ];

  return (
    <div className="min-h-screen bg-premium-cream">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-premium-gold/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
<Link to="/" className="flex items-center space-x-3">
  <img 
    src="/logo.png" 
    alt="Click n Trend" 
    className="h-14 w-auto" // Adjust size as needed
  />
  <div>
    <span className="text-2xl font-serif font-bold text-premium-charcoal">
      Click n Trend
    </span>
    <span className="block text-xs text-gray-600 font-medium -mt-1">
      Fashion & Gifts
    </span>
  </div>
</Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {categories.map(category => (
                <Link
                  key={category}
                  to={`/products?category=${category.toLowerCase()}`}
                  className="text-premium-charcoal hover:text-premium-gold transition-colors font-medium"
                >
                  {category}
                </Link>
              ))}
            </nav>

            {/* Search and Cart */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-premium-cream transition-colors"
              >
                <ShoppingBag className="h-5 w-5 text-premium-charcoal" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-premium-burgundy text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
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
              <div className="grid grid-cols-2 gap-2">
                {categories.map(category => (
                  <Link
                    key={category}
                    to={`/products?category=${category.toLowerCase()}`}
                    className="px-4 py-2 text-premium-charcoal hover:bg-premium-gold/10 rounded-lg transition-colors text-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {category}
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
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
  <img 
    src="/logo.png" 
    alt="Click n Trend" 
    className="h-14 w-auto"
  />
  <span className="text-xl font-serif font-bold">Click n Trend</span>
</div>
              <p className="text-premium-cream/70">
                Premium gifts for unforgettable moments. Crafted with care, delivered with love.
              </p>
            </div>
            
            <div>
              <h3 className="font-serif text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/products" className="text-premium-cream/70 hover:text-premium-gold">All Products</Link></li>
                <li><Link to="/custom-combo" className="text-premium-cream/70 hover:text-premium-gold">Create Combo</Link></li>
                <li><Link to="/admin" className="text-premium-cream/70 hover:text-premium-gold">Admin</Link></li>
              </ul>
            </div>
          
            <div>
              <h3 className="font-serif text-lg font-semibold mb-4">Contact</h3>
              <p className="text-premium-cream/70">
                support@clickntrend.com<br />
                +91 9876543210<br />
                24/7 Customer Support
              </p>
            </div>
          </div>
          
          <div className="border-t border-premium-gold/20 mt-8 pt-8 text-center text-premium-cream/50">
            <p>© {new Date().getFullYear()} Click n Trend. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </div>
  );
};

export default Layout;