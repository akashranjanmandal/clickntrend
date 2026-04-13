import React, { useState, useEffect, useRef } from 'react';
import { getImageUrl } from '../utils/helpers';
import {
  Search, Sparkles, TrendingUp, Shield, Gift,
  ArrowRight, Loader2, X, ChevronRight, Users, Package,
  Heart, Clock, Award, Star, Gem, Rocket, Smile,
  MapPin, Coffee, Zap, Crown, Feather, Wind,
  Sun, Moon, Cloud, Flower2, Sparkle, Droplets,
  Diamond, PartyPopper, Cake, Wine, Briefcase,
  TreePine, Baby, ThumbsUp, Share2
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import CategoryCard from '../components/CategoryCard';
import HeroSection from '../components/HeroSection';
// ProductDetailsModal removed - product clicks now navigate to /product/:id
// ComboDetailsModal removed - combo clicks now navigate to /combo/:id
import { Product, Category, HeroContent, Stat, Combo, Gender } from '../types';
import { apiFetch } from '../utils/api';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import ComboCard from '../components/ComboCard';
import Popup from '../components/Popup';
import PremiumLoader from '../components/PremiumLoader';
import toast from 'react-hot-toast';

// Custom hook for handling back button with double press to exit
const useBackNavigation = (
  selectedCategory: Category | null,
  selectedGender: string,
  handleBackToCategories: () => void
) => {
  const [backPressCount, setBackPressCount] = useState(0);
  const [showExitToast, setShowExitToast] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleBackPress = () => {
      if (selectedCategory) {
        handleBackToCategories();
        return true;
      } else {
        if (backPressCount === 0) {
          setBackPressCount(1);
          setShowExitToast(true);
          
          if (timerRef.current) {
            clearTimeout(timerRef.current);
          }
          
          timerRef.current = setTimeout(() => {
            setBackPressCount(0);
            setShowExitToast(false);
          }, 2000);
          
          return true;
        } else {
          setShowExitToast(false);
          return false;
        }
      }
    };

    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();
      const shouldPrevent = handleBackPress();
      if (shouldPrevent) {
        window.history.pushState(null, '', window.location.pathname);
      }
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [selectedCategory, backPressCount, handleBackToCategories]);

  return { showExitToast };
};

// Animation variants
const fadeInUpVariants = {
  initial: { opacity: 0, y: 60 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

const staggerContainerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const scaleInVariants = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [heroes, setHeroes] = useState<HeroContent[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'products' | 'combos'>('products');
  
  // selectedProduct removed - product clicks now navigate to /product/:id
  // selectedCombo removed - combo clicks now navigate to /combo/:id
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);

  // Scroll animations
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  // Custom icons for stats
  const statIcons = [
    { icon: <Smile className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" />, color: "from-yellow-400 to-orange-500" },
    { icon: <Gift className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" />, color: "from-purple-400 to-pink-500" },
    { icon: <MapPin className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" />, color: "from-blue-400 to-cyan-500" },
    { icon: <Star className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 fill-current" />, color: "from-amber-400 to-yellow-500" },
    { icon: <Heart className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" />, color: "from-red-400 to-pink-500" },
    { icon: <Zap className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" />, color: "from-yellow-400 to-amber-500" },
    { icon: <Crown className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" />, color: "from-amber-400 to-yellow-500" },
    { icon: <Gem className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" />, color: "from-emerald-400 to-teal-500" },
  ];

  const defaultStats = [
    { label: 'Happy Customers', value: '10K+', icon: '😊' },
    { label: 'Premium Gifts', value: '500+', icon: '🎁' },
    { label: 'Cities Served', value: '50+', icon: '📍' },
    { label: '5 Star Ratings', value: '4.9/5', icon: '⭐' }
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  // Auto-select category from ?category= URL param once categories are loaded
  useEffect(() => {
    if (categories.length === 0) return;
    const categoryParam = searchParams.get('category');
    if (!categoryParam) return;
    const matched = categories.find(
      c => c.name.toLowerCase().trim() === decodeURIComponent(categoryParam).toLowerCase().trim()
    );
    if (matched) {
      setSelectedCategory(matched);
      setViewMode('products');
    }
  }, [categories, searchParams]);

  useEffect(() => {
    const checkPopup = async () => {
      try {
        const popup = await apiFetch('/api/popups/active').catch(() => null);
        if (popup) {
          const hasSeen = sessionStorage.getItem('popup_seen');
          if (!hasSeen) {
            setShowPopup(true);
            sessionStorage.setItem('popup_seen', 'true');
          }
        }
      } catch (error) {
        console.error('Error checking popup:', error);
      }
    };
    checkPopup();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const [productsData, categoriesData, gendersData, heroesData, statsData, combosData] = await Promise.all([
        apiFetch('/api/products').catch(() => []),
        apiFetch('/api/categories').catch(() => []),
        apiFetch('/api/genders').catch(() => []),
        apiFetch('/api/hero').catch(() => []),
        apiFetch('/api/settings?key=stats').catch(() => ({ value: defaultStats })),
        apiFetch('/api/combos').catch(() => [])
      ]);

      setProducts(productsData || []);
      setCategories(categoriesData || []);
      setGenders(gendersData || []);
      setHeroes(heroesData || []);
      setStats(statsData?.value || defaultStats);
      setCombos(combosData || []);
      // Auto-redirect combo from shared URL /combos?id= or /?combo=
      const comboId = new URLSearchParams(window.location.search).get('id') ||
                      new URLSearchParams(window.location.search).get('combo');
      if (comboId) {
        navigate(`/combo/${comboId}`, { replace: true });
        return;
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setStats(defaultStats);
    } finally {
      setLoading(false);
    }
  };

const getFilteredProducts = () => {
  let filtered = [...products];
  
  if (selectedCategory) {
    filtered = filtered.filter(p => {
      // Check multiple possible matches
      const matchesByName = p.category?.toLowerCase().trim() === selectedCategory.name.toLowerCase().trim();
      
      // Check if product has categories array and matches by ID
      const matchesByCategoryId = p.categories?.some(cat => cat.id === selectedCategory.id);
      
      // Check if product has categories array and matches by name
      const matchesByCategoryName = p.categories?.some(
        cat => cat.name.toLowerCase().trim() === selectedCategory.name.toLowerCase().trim()
      );
      
      return matchesByName || matchesByCategoryId || matchesByCategoryName;
    });
  }
  
  if (selectedGender !== 'all') {
    filtered = filtered.filter(p => 
      p.gender?.toLowerCase().trim() === selectedGender.toLowerCase().trim()
    );
  }
  
  return filtered;
};

  const getFilteredCombos = () => {
    if (!selectedCategory && selectedGender === 'all') return combos;

    return combos.filter(combo => {
      // 1. Check combo-level categories array (combo_categories junction)
      if (selectedCategory) {
        const comboCategories: string[] = (combo.categories || []).map((c: any) => c.name?.toLowerCase().trim());
        const matchesComboCategory = comboCategories.includes(selectedCategory.name.toLowerCase().trim());

        // 2. Also check if any product inside the combo matches the category
        const comboProducts = combo.combo_products || [];
        const matchesProductCategory = comboProducts.some(item => {
          const product = item.product;
          if (!product) return false;
          // Check product categories array
          if (product.categories && product.categories.length > 0) {
            return product.categories.some((c: any) =>
              c.name?.toLowerCase().trim() === selectedCategory.name.toLowerCase().trim()
            );
          }
          // Fallback to product.category string
          return product.category?.toLowerCase().trim() === selectedCategory.name.toLowerCase().trim();
        });

        if (!matchesComboCategory && !matchesProductCategory) return false;
      }

      // Gender filter via combo products
      if (selectedGender !== 'all') {
        const comboProducts = combo.combo_products || [];
        const hasMatchingGender = comboProducts.some(item =>
          item.product?.gender === selectedGender
        );
        if (!hasMatchingGender) return false;
      }

      return true;
    });
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setSelectedGender('all');
    setViewMode('products');
  };

  const handleCategoryShare = async (e: React.MouseEvent, category: Category) => {
    e.stopPropagation(); // prevent card click
    const url = `${window.location.origin}/?category=${encodeURIComponent(category.name)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${category.name} — GFTD`,
          text: `Shop the ${category.name} collection on GFTD — premium gifts for every occasion.`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Category link copied!');
      }
    } catch { /* user cancelled */ }
  };

  const handleGenderSelect = (gender: string) => {
    setSelectedGender(gender);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedGender('all');
  };

  const handleProductClick = (product: Product) => {
    navigate(`/product/${product.id}`);
  };

  const handleComboClick = (combo: Combo) => {
    navigate(`/combo/${combo.id}`);
  };

  const handleSearch = async (searchText?: string) => {
    const query = searchText || searchTerm;
    
    if (!query.trim()) {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    setShowSearchResults(true);
    
    try {
      const data = await apiFetch(`/api/products/search?q=${encodeURIComponent(query)}`);
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching products:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const filteredProducts = getFilteredProducts();
  const filteredCombos = getFilteredCombos();

  const { showExitToast } = useBackNavigation(
    selectedCategory,
    selectedGender,
    handleBackToCategories
  );

 if (loading) {
  return <PremiumLoader />;
}

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={staggerContainerVariants}
      className="min-h-screen bg-gradient-to-b from-white to-gray-50 overflow-hidden"
    >
      {showPopup && <Popup onClose={() => setShowPopup(false)} />}

      {/* Exit Toast */}
      <AnimatePresence>
        {showExitToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50"
          >
            <motion.div 
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="bg-gray-900 text-white px-4 py-3 rounded-full shadow-lg text-sm sm:text-base flex items-center gap-2"
            >
              <motion.span 
                animate={{ x: [-5, 0, -5] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-premium-gold"
              >
                ←
              </motion.span>
              Press back again to exit
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section with Parallax */}
      <motion.div
        style={{ 
          opacity: heroOpacity,
          scale: heroScale
        }}
      >
        {heroes.length > 0 ? (
          <HeroSection heroes={heroes} />
        ) : (
          <div className="relative h-[500px] sm:h-[600px] bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center text-white overflow-hidden">
            {/* Animated background elements */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 90, 0],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{ duration: 10, repeat: Infinity }}
              className="absolute top-0 left-0 w-48 sm:w-96 h-48 sm:h-96 bg-premium-gold rounded-full filter blur-3xl"
            />
            <motion.div
              animate={{ 
                scale: [1, 1.3, 1],
                rotate: [0, -90, 0],
                opacity: [0.1, 0.2, 0.1]
              }}
              transition={{ duration: 12, repeat: Infinity }}
              className="absolute bottom-0 right-0 w-48 sm:w-96 h-48 sm:h-96 bg-purple-600 rounded-full filter blur-3xl"
            />
            
            {/* Floating particles */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * window.innerWidth,
                  y: Math.random() * window.innerHeight,
                  scale: 0
                }}
                animate={{ 
                  y: [null, -30, 30, -30],
                  scale: [0, 1, 0.5, 1, 0],
                  opacity: [0, 0.5, 0.2, 0.5, 0]
                }}
                transition={{ 
                  duration: 5 + Math.random() * 5,
                  repeat: Infinity,
                  delay: Math.random() * 5
                }}
                className="absolute w-1 h-1 bg-white rounded-full"
              />
            ))}

            <motion.div
              variants={scaleInVariants}
              className="text-center relative z-10 px-4"
            >
              <motion.div
                animate={{ 
                  rotate: [0, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                className="inline-block mb-4 sm:mb-6"
              >
                <Gift className="h-16 w-16 sm:h-20 sm:w-20 text-premium-gold" />
              </motion.div>
              
              <motion.h1 
                variants={fadeInUpVariants}
                className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold mb-4 sm:mb-6"
              >
                GFTD
              </motion.h1>
              
              <motion.p 
                variants={fadeInUpVariants}
                className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-6 sm:mb-8"
              >
                The Art Of Gifting
              </motion.p>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/products')}
                className="px-6 sm:px-8 py-3 sm:py-4 bg-premium-gold text-white rounded-full font-medium inline-flex items-center gap-2 hover:bg-opacity-90 transition-all shadow-lg text-sm sm:text-base relative overflow-hidden group"
              >
                <motion.span
                  animate={{ x: [-2, 2, -2] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                />
                Explore Collection
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </motion.div>
              </motion.button>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* Search Section - High z-index */}
      <motion.section
        variants={fadeInUpVariants}
        className="relative -mt-16 sm:-mt-24 z-50 pb-12 sm:pb-20"
      >
        <div className="container mx-auto px-3 sm:px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-3xl mx-auto"
          >
            <div className="relative">
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl p-1 sm:p-2 flex flex-col sm:flex-row items-stretch sm:items-center border border-white/20"
              >
                <div className="flex-1 flex items-center px-3 sm:px-4">
                  <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search products..."
                    className="w-full px-3 sm:px-4 py-3 sm:py-4 focus:outline-none bg-transparent text-sm sm:text-base"
                  />
                  {searchTerm && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setSearchTerm('');
                        setShowSearchResults(false);
                      }}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                    </motion.button>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSearch()}
                  disabled={searchLoading}
                  className="mx-1 sm:mx-2 mb-1 sm:mb-0 px-4 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-premium-gold to-yellow-500 text-white rounded-xl sm:rounded-2xl hover:from-premium-burgundy hover:to-premium-gold transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base relative overflow-hidden group"
                >
                  <motion.span
                    animate={{ x: [-100, 100] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  />
                  {searchLoading ? (
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  ) : (
                    <>
                      <span className="hidden sm:inline">Search</span>
                      <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                    </>
                  )}
                </motion.button>
              </motion.div>

              {/* Search Results Dropdown - Very high z-index */}
              <AnimatePresence>
                {showSearchResults && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white/80 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-xl border border-white/20 max-h-80 sm:max-h-96 overflow-y-auto z-[45]"
                  >
                    {searchLoading ? (
                      <div className="p-6 sm:p-8 text-center">
                        <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-premium-gold mx-auto" />
                      </div>
                    ) : searchResults.length > 0 ? (
                      <motion.div variants={staggerContainerVariants} className="divide-y divide-gray-100">
                        {searchResults.map((product, index) => (
                          <motion.div
                            key={product.id}
                            variants={fadeInUpVariants}
                            custom={index}
                            whileHover={{ backgroundColor: '#f9fafb', x: 5 }}
                            onClick={() => handleProductClick(product)}
                            className="p-3 sm:p-4 cursor-pointer flex items-center gap-3 sm:gap-4 transition-all"
                          >
                            <motion.img
                              whileHover={{ scale: 1.1 }}
                              src={getImageUrl(
                                (product.has_colors && product.colors && product.colors.length > 0
                                  ? product.colors.find(c => c.is_active)?.image_url
                                  : null) || product.image_url
                              )}
                              alt={product.name}
                              className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg sm:rounded-xl"
                              onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm sm:text-base truncate">{product.name}</h4>
                              <p className="text-xs sm:text-sm text-gray-600 truncate">{product.category}</p>
                              <p className="text-xs text-gray-500 capitalize truncate">{product.gender}</p>
                              <p className="text-premium-gold font-semibold text-sm sm:text-base mt-0.5 sm:mt-1">
                                ₹{product.price.toLocaleString()}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div 
                        variants={scaleInVariants}
                        className="p-6 sm:p-8 text-center text-sm sm:text-base text-gray-500"
                      >
                        <motion.div
                          animate={{ 
                            rotate: [0, 10, -10, 0],
                            scale: [1, 1.1, 1]
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="inline-block mb-3"
                        >
                          <Package className="h-12 w-12 text-gray-300" />
                        </motion.div>
                        <p>We are currently out of stock for this category,</p>
                        <p className="mt-2">We will bring surprises for you soon.🩷 "{searchTerm}"</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Navigation - Medium z-index */}
      <motion.section
        variants={fadeInUpVariants}
        className="py-4 sm:py-8 bg-white/50 backdrop-blur-sm sticky top-0 z-30 border-b border-gray-200"
      >
        <div className="container mx-auto px-3 sm:px-4">
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-wrap">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBackToCategories}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all duration-300 text-xs sm:text-sm ${
                !selectedCategory
                  ? 'bg-gradient-to-r from-premium-gold to-yellow-500 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Categories
            </motion.button>
            {selectedCategory && (
              <>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-premium-gold to-yellow-500 text-white rounded-full shadow-md text-xs sm:text-sm"
                >
                  {selectedCategory.name}
                </motion.span>
              </>
            )}
            {selectedGender !== 'all' && (
              <>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-premium-gold to-yellow-500 text-white rounded-full shadow-md capitalize text-xs sm:text-sm"
                >
                  {selectedGender}
                </motion.span>
              </>
            )}
          </div>
        </div>
      </motion.section>

 {/* Categories Grid */}
{!selectedCategory && (
  <motion.section
    variants={fadeInUpVariants}
    className="py-10 sm:py-16 lg:py-20"
  >
    <div className="container mx-auto px-3 sm:px-4">
      <motion.div
        variants={fadeInUpVariants}
        className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 px-4"
      >
        <motion.h2 
          variants={fadeInUpVariants}
          className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold mb-2 sm:mb-4"
        >
          Shop by <motion.span
            animate={{ 
              backgroundPosition: ['0%', '100%', '0%'],
            }}
            transition={{ duration: 5, repeat: Infinity }}
            className="bg-gradient-to-r from-premium-gold via-yellow-500 to-premium-gold bg-[length:200%] bg-clip-text text-transparent"
          >
            Category
          </motion.span>
        </motion.h2>
        <motion.p 
          variants={fadeInUpVariants}
          className="text-base sm:text-lg md:text-xl text-gray-600"
        >
          Explore our curated collection of premium gifts
        </motion.p>
      </motion.div>
      
      <motion.div 
        variants={staggerContainerVariants}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-6"
      >
        {categories.map((category, index) => {
          // Calculate product count for this category (works with both new array and old string)
          const productCount = products.filter(product => {
            const nameMatch = product.category?.toLowerCase().trim() === category.name.toLowerCase().trim();
            const arrayMatch = product.categories && Array.isArray(product.categories) && product.categories.length > 0
              ? product.categories.some((cat: any) => 
                  cat.id === category.id || 
                  cat.name?.toLowerCase().trim() === category.name.toLowerCase().trim()
                )
              : false;
            return nameMatch || arrayMatch;
          }).length;

          console.log(`Category "${category.name}" has ${productCount} products`); // Debug log

          return (
            <motion.div
              key={category.id}
              variants={scaleInVariants}
              custom={index}
              whileHover={{ y: -5 }}
            >
              <CategoryCard
                name={category.name}
                icon={category.icon || '🎁'}
                icon_type={category.icon_type || 'lucide'}
                image_url={category.image_url}
                color={category.color || 'from-premium-gold/20 to-premium-cream'}
                hover_effect={category.hover_effect}
                count={productCount}
                onClick={() => handleCategorySelect(category)}
                onShare={(e) => handleCategoryShare(e, category)}
              />
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  </motion.section>
)}

      {/* Gender Filter */}
      {selectedCategory && (
        <motion.section
          variants={fadeInUpVariants}
          className="py-4 sm:py-8 bg-white/50 backdrop-blur-sm border-b border-gray-200"
        >
          <div className="container mx-auto px-3 sm:px-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h3 className="text-sm sm:text-base md:text-lg font-medium mb-3 sm:mb-4 flex items-center gap-1 sm:gap-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-premium-gold" />
                Filter by Gender
              </h3>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleGenderSelect('all')}
                  className={`px-3 sm:px-5 md:px-6 py-1.5 sm:py-2 md:py-3 rounded-full text-xs sm:text-sm capitalize transition-all duration-300 ${
                    selectedGender === 'all'
                      ? 'bg-gradient-to-r from-premium-gold to-yellow-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </motion.button>
                {genders.map((gender) => (
                  <motion.button
                    key={gender.name}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleGenderSelect(gender.name)}
                    className={`px-3 sm:px-5 md:px-6 py-1.5 sm:py-2 md:py-3 rounded-full text-xs sm:text-sm capitalize transition-all duration-300 flex items-center gap-1 ${
                      selectedGender === gender.name
                        ? 'bg-gradient-to-r from-premium-gold to-yellow-500 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="text-sm sm:text-base">{gender.icon}</span>
                    <span className="text-xs sm:text-sm">{gender.display_name}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.section>
      )}

      {/* View Toggle */}
      {selectedCategory && (
        <motion.section
          variants={fadeInUpVariants}
          className="py-4 sm:py-6"
        >
          <div className="container mx-auto px-3 sm:px-4">
            <div className="flex justify-center gap-2 sm:gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('products')}
                className={`px-4 sm:px-6 md:px-8 py-1.5 sm:py-2 md:py-3 rounded-full text-xs sm:text-sm md:text-base font-medium transition-all duration-300 ${
                  viewMode === 'products'
                    ? 'bg-gradient-to-r from-premium-gold to-yellow-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Products ({filteredProducts.length})
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode('combos')}
                className={`px-4 sm:px-6 md:px-8 py-1.5 sm:py-2 md:py-3 rounded-full text-xs sm:text-sm md:text-base font-medium transition-all duration-300 ${
                  viewMode === 'combos'
                    ? 'bg-gradient-to-r from-premium-gold to-yellow-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Combos ({filteredCombos.length})
              </motion.button>
            </div>
          </div>
        </motion.section>
      )}
      
      {/* Products/Combos Grid */}
      {selectedCategory && (
        <motion.section
          variants={fadeInUpVariants}
          className="py-6 sm:py-8 md:py-12"
        >
          <div className="container mx-auto px-3 sm:px-4">
            <motion.h2 
              variants={fadeInUpVariants}
              className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-serif font-bold mb-4 sm:mb-6 md:mb-8"
            >
              {selectedCategory.name}
              {selectedGender !== 'all' && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-premium-gold"
                > for {selectedGender}</motion.span>
              )}
            </motion.h2>

            {viewMode === 'products' && (
              filteredProducts.length > 0 ? (
                <motion.div 
                  variants={staggerContainerVariants}
                  className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4"
                >
                  {filteredProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      variants={scaleInVariants}
                      custom={index}
                      whileHover={{ y: -5 }}
                      onClick={() => {
                        console.log('Product clicked:', product);
                        handleProductClick(product);
                      }}
                      className="cursor-pointer"
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  variants={scaleInVariants}
                  className="text-center py-10 sm:py-12 md:py-16"
                >
                  <motion.div
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="inline-block p-4 sm:p-6 md:p-8 bg-gray-100 rounded-full mb-3 sm:mb-4"
                  >
                    <Package className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-gray-400" />
                  </motion.div>
                  <p className="text-base sm:text-lg md:text-xl text-gray-500">We are currently out of stock for this category,</p>
                  <p className="text-sm sm:text-base text-gray-400 mt-2">We will bring surprises for you soon.🩷</p>
                </motion.div>
              )
            )}

            {viewMode === 'combos' && (
              filteredCombos.length > 0 ? (
                <motion.div 
                  variants={staggerContainerVariants}
                  className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4"
                >
                  {filteredCombos.map((combo, index) => (
                    <motion.div
                      key={combo.id}
                      variants={scaleInVariants}
                      custom={index}
                      whileHover={{ y: -5 }}
                    >
                      <ComboCard 
                        combo={combo} 
                        onShowMore={handleComboClick}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div 
                  variants={scaleInVariants}
                  className="text-center py-10 sm:py-12 md:py-16"
                >
                  <motion.div
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="inline-block p-4 sm:p-6 md:p-8 bg-gray-100 rounded-full mb-3 sm:mb-4"
                  >
                    <Gift className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-gray-400" />
                  </motion.div>
                  <p className="text-base sm:text-lg md:text-xl text-gray-500">No combos found</p>
                </motion.div>
              )
            )}
          </div>
        </motion.section>
      )}

      {/* CTA Section */}
      <motion.section
        variants={fadeInUpVariants}
        className="py-12 sm:py-16 md:py-20 bg-gradient-to-r from-premium-gold via-yellow-500 to-orange-500 relative overflow-hidden"
      >
        {/* Animated background elements */}
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 45, 0],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-0 left-0 w-48 sm:w-96 h-48 sm:h-96 bg-white rounded-full filter blur-3xl"
        />
        <motion.div
          animate={{ 
            scale: [1, 1.3, 1],
            rotate: [0, -45, 0],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 10, repeat: Infinity }}
          className="absolute bottom-0 right-0 w-48 sm:w-96 h-48 sm:h-96 bg-white rounded-full filter blur-3xl"
        />
        
        <div className="container mx-auto px-3 sm:px-4 text-center relative z-10">
          <motion.div
            variants={scaleInVariants}
            className="max-w-3xl mx-auto"
          >
            <motion.div
              animate={{ 
                rotate: [0, 15, -15, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 3, repeat: Infinity }}
              className="inline-block mb-4 sm:mb-6"
            >
              <Gift className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 text-white" />
            </motion.div>
            
            <motion.h2 
              variants={fadeInUpVariants}
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold text-white mb-3 sm:mb-4 md:mb-6 px-4"
            >
              Create Your Perfect Gift Combo
            </motion.h2>
            
            <motion.p 
              variants={fadeInUpVariants}
              className="text-sm sm:text-base md:text-lg lg:text-xl text-white/90 mb-4 sm:mb-6 md:mb-8 px-4"
            >
              Mix and match premium gifts to create a personalized experience
            </motion.p>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/custom-combo')}
              className="inline-flex items-center px-4 sm:px-6 md:px-8 py-2 sm:py-3 md:py-4 bg-white text-premium-gold rounded-full hover:shadow-2xl transition-all duration-300 text-sm sm:text-base md:text-lg font-medium group relative overflow-hidden"
            >
              <motion.span
                animate={{ x: [-100, 100] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-premium-gold/20 to-transparent"
              />
              <Sparkles className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
              <span className="sm:inline">Design Custom Combo</span>
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
              </motion.div>
            </motion.button>
          </motion.div>
        </div>
      </motion.section>

      {/* Featured Products */}
      {!selectedCategory && (
        <>
          <motion.section
            variants={fadeInUpVariants}
            className="py-10 sm:py-16 md:py-20 bg-gradient-to-b from-white to-gray-50"
          >
            <div className="container mx-auto px-3 sm:px-4">
              <motion.div 
                variants={fadeInUpVariants}
                className="flex flex-col sm:flex-row items-center justify-between mb-6 sm:mb-8 md:mb-12"
              >
                <div className="text-center sm:text-left mb-4 sm:mb-0">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold mb-1 sm:mb-2">
                    Featured <motion.span
                      animate={{ 
                        backgroundPosition: ['0%', '100%', '0%'],
                      }}
                      transition={{ duration: 5, repeat: Infinity }}
                      className="bg-gradient-to-r from-premium-gold via-yellow-500 to-premium-gold bg-[length:200%] bg-clip-text text-transparent"
                    >
                      Gifts
                    </motion.span>
                  </h2>
                  <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600">Handpicked premium collection</p>
                </div>
                <motion.button
                  whileHover={{ x: 5 }}
                  onClick={() => navigate('/products')}
                  className="inline-flex items-center px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-premium-gold to-yellow-500 text-white rounded-full hover:shadow-lg transition-all group text-sm sm:text-base"
                >
                  <span>View All</span>
                  <ArrowRight className="ml-1.5 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </motion.div>

              <motion.div 
                variants={staggerContainerVariants}
                className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4"
              >
                {products.slice(0, 8).map((product, index) => (
                  <motion.div
                    key={product.id}
                    variants={scaleInVariants}
                    custom={index}
                    whileHover={{ y: -5 }}
                    onClick={() => handleProductClick(product)}
                    className="cursor-pointer"
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.section>

          {/* Featured Combos */}
          {combos.length > 0 && (
            <motion.section
              variants={fadeInUpVariants}
              className="py-10 sm:py-16 md:py-20 bg-white"
            >
              <div className="container mx-auto px-3 sm:px-4">
                <motion.div 
                  variants={fadeInUpVariants}
                  className="flex flex-col sm:flex-row items-center justify-between mb-6 sm:mb-8 md:mb-12"
                >
                  <div className="text-center sm:text-left mb-4 sm:mb-0">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif font-bold mb-1 sm:mb-2">
                      Curated <motion.span
                        animate={{ 
                          backgroundPosition: ['0%', '100%', '0%'],
                        }}
                        transition={{ duration: 5, repeat: Infinity }}
                        className="bg-gradient-to-r from-premium-gold via-yellow-500 to-premium-gold bg-[length:200%] bg-clip-text text-transparent"
                      >
                        Gift Combos
                      </motion.span>
                    </h2>
                    <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600">Expertly crafted gift sets</p>
                  </div>
                  <motion.button
                    whileHover={{ x: 5 }}
                    onClick={() => navigate('/combos')}
                    className="inline-flex items-center px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 bg-gradient-to-r from-premium-gold to-yellow-500 text-white rounded-full hover:shadow-lg transition-all group text-sm sm:text-base"
                  >
                    <span>View All</span>
                    <ArrowRight className="ml-1.5 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 group-hover:translate-x-1 transition-transform" />
                  </motion.button>
                </motion.div>

                <motion.div 
                  variants={staggerContainerVariants}
                  className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4"
                >
                  {combos.slice(0, 4).map((combo, index) => (
                    <motion.div
                      key={combo.id}
                      variants={scaleInVariants}
                      custom={index}
                      whileHover={{ y: -5 }}
                    >
                      <ComboCard 
                        combo={combo} 
                        onShowMore={handleComboClick}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </motion.section>
          )}
        </>
      )}

{/* Stats Section - Premium Golden Finish */}
<motion.section
  variants={fadeInUpVariants}
  className="py-20 bg-gradient-to-br from-gray-900 to-gray-800 text-white relative overflow-hidden"
>
  {/* Gold Glow Effect */}
  <div className="absolute inset-0 opacity-30">
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(212,175,55,0.15)_0%,_transparent_70%)]" />
  </div>
  
  {/* Animated Gold Particles */}
  {[...Array(20)].map((_, i) => (
    <motion.div
      key={`particle-${i}`}
      initial={{
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        scale: 0
      }}
      animate={{
        y: [null, -50, 50, -50],
        x: [null, 30, -30, 30],
        scale: [0, 0.8, 0.4, 0.8, 0],
        opacity: [0, 0.5, 0.3, 0.5, 0]
      }}
      transition={{
        duration: 6 + Math.random() * 4,
        repeat: Infinity,
        delay: Math.random() * 5,
        ease: "easeInOut"
      }}
      className="absolute w-1 h-1 bg-gold rounded-full"
    />
  ))}

  <div className="container mx-auto px-4 relative z-10">
    <motion.div variants={fadeInUpVariants} className="text-center mb-12">
      <motion.h2 variants={fadeInUpVariants} className="text-4xl md:text-5xl font-serif font-bold mb-2">
        Our <span className="gold-text">Numbers</span>
      </motion.h2>
      <motion.p variants={fadeInUpVariants} className="text-lg text-gray-400">
        We take pride in our achievements
      </motion.p>
      
      {/* Gold Divider */}
      <div className="w-20 h-0.5 bg-gold mx-auto mt-4" />
    </motion.div>

    <motion.div variants={staggerContainerVariants} className="grid grid-cols-2 md:grid-cols-4 gap-8">
      {/* Stat 1 - Happy Customers */}
      <motion.div
        variants={scaleInVariants}
        whileHover={{ y: -8, scale: 1.02 }}
        className="text-center group"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, delay: 0, repeat: Infinity }}
          className="relative inline-flex items-center justify-center w-24 h-24 mb-4"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gold/20 to-gold/5 rounded-full blur-xl group-hover:blur-2xl transition-all" />
          <div className="relative bg-gradient-to-br from-gold/20 to-gold/5 rounded-full p-5 border border-gold/30 group-hover:border-gold/60 transition-all">
            <Users className="w-12 h-12 text-gold" strokeWidth={1.5} />
          </div>
        </motion.div>
        
        <motion.div 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, delay: 0.1, repeat: Infinity }}
          className="text-3xl md:text-4xl font-bold gold-text mb-1"
        >
          10K+
        </motion.div>
        <div className="text-gray-400 font-medium">Happy Customers</div>
      </motion.div>

      {/* Stat 2 - Premium Gifts */}
      <motion.div
        variants={scaleInVariants}
        whileHover={{ y: -8, scale: 1.02 }}
        className="text-center group"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, delay: 0.2, repeat: Infinity }}
          className="relative inline-flex items-center justify-center w-24 h-24 mb-4"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gold/20 to-gold/5 rounded-full blur-xl group-hover:blur-2xl transition-all" />
          <div className="relative bg-gradient-to-br from-gold/20 to-gold/5 rounded-full p-5 border border-gold/30 group-hover:border-gold/60 transition-all">
            <Gift className="w-12 h-12 text-gold" strokeWidth={1.5} />
          </div>
        </motion.div>
        
        <motion.div 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, delay: 0.3, repeat: Infinity }}
          className="text-3xl md:text-4xl font-bold gold-text mb-1"
        >
          500+
        </motion.div>
        <div className="text-gray-400 font-medium">Premium Gifts</div>
      </motion.div>

      {/* Stat 3 - Cities Served */}
      <motion.div
        variants={scaleInVariants}
        whileHover={{ y: -8, scale: 1.02 }}
        className="text-center group"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, delay: 0.4, repeat: Infinity }}
          className="relative inline-flex items-center justify-center w-24 h-24 mb-4"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gold/20 to-gold/5 rounded-full blur-xl group-hover:blur-2xl transition-all" />
          <div className="relative bg-gradient-to-br from-gold/20 to-gold/5 rounded-full p-5 border border-gold/30 group-hover:border-gold/60 transition-all">
            <MapPin className="w-12 h-12 text-gold" strokeWidth={1.5} />
          </div>
        </motion.div>
        
        <motion.div 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, delay: 0.5, repeat: Infinity }}
          className="text-3xl md:text-4xl font-bold gold-text mb-1"
        >
          50+
        </motion.div>
        <div className="text-gray-400 font-medium">Cities Served</div>
      </motion.div>

      {/* Stat 4 - Star Ratings */}
      <motion.div
        variants={scaleInVariants}
        whileHover={{ y: -8, scale: 1.02 }}
        className="text-center group"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, delay: 0.6, repeat: Infinity }}
          className="relative inline-flex items-center justify-center w-24 h-24 mb-4"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gold/20 to-gold/5 rounded-full blur-xl group-hover:blur-2xl transition-all" />
          <div className="relative bg-gradient-to-br from-gold/20 to-gold/5 rounded-full p-5 border border-gold/30 group-hover:border-gold/60 transition-all">
            <Star className="w-12 h-12 text-gold fill-gold/20" strokeWidth={1.5} />
          </div>
        </motion.div>
        
        <motion.div 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, delay: 0.7, repeat: Infinity }}
          className="text-3xl md:text-4xl font-bold gold-text mb-1"
        >
          4.9/5
        </motion.div>
        <div className="text-gray-400 font-medium">Star Ratings</div>
      </motion.div>
    </motion.div>
  </div>
</motion.section>

    </motion.div>
  );
};

export default Home;