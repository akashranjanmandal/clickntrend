import React, { useState, useEffect, useRef } from 'react';
import { getImageUrl, matchesGender, comboMatchesGender, formatCurrency } from '../utils/helpers';
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
import { Product, Category, HeroContent, Stat, Combo, Gender } from '../types';
import { apiFetch } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import ComboCard from '../components/ComboCard';
import Popup from '../components/Popup';
import PremiumLoader from '../components/PremiumLoader';
import toast from 'react-hot-toast';
import { useSeo } from '../utils/seo';

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
// Gentle reveal; nested children cascade in after their parent
const fadeInUpVariants = {
  initial: { opacity: 0, y: 28 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.08 }
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
  initial: { opacity: 0, scale: 0.96 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const Home: React.FC = () => {
  useSeo({ path: '/' });
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
  // The page renders as soon as the hero list arrives so its video/image starts
  // downloading right away; the loader stays on top until that media is ready.
  const [heroesLoaded, setHeroesLoaded] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  // Scroll animations

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
      
      const heroesPromise = apiFetch('/api/hero').catch(() => []).then((data: HeroContent[]) => {
        setHeroes(data || []);
        if (!data || data.length === 0) setHeroReady(true);
        setHeroesLoaded(true);
        return data;
      });

      const [productsData, categoriesData, gendersData, , statsData, combosData] = await Promise.all([
        apiFetch('/api/products').catch(() => []),
        apiFetch('/api/categories').catch(() => []),
        apiFetch('/api/genders').catch(() => []),
        heroesPromise,
        apiFetch('/api/settings?key=stats').catch(() => ({ value: defaultStats })),
        apiFetch('/api/combos').catch(() => [])
      ]);

      setProducts(productsData || []);
      setCategories(categoriesData || []);
      setGenders(gendersData || []);
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
    filtered = filtered.filter(p => matchesGender(p.gender, selectedGender));
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
        if (!comboMatchesGender(combo, selectedGender)) return false;
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

  // Never keep visitors waiting on a slow hero video for more than a few seconds
  useEffect(() => {
    if (!heroesLoaded || heroReady) return;
    const timer = setTimeout(() => setHeroReady(true), 8000);
    return () => clearTimeout(timer);
  }, [heroesLoaded, heroReady]);

 if (!heroesLoaded) {
  return <PremiumLoader />;
}

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={staggerContainerVariants}
      className="-mt-[72px] md:-mt-[84px] min-h-screen bg-gradient-to-b from-white to-gray-50 overflow-hidden"
    >
      {/* Stays on top until data and the hero's first frame are ready */}
      {(loading || !heroReady) && <PremiumLoader />}

      {showPopup && !loading && heroReady && <Popup onClose={() => setShowPopup(false)} />}

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

      {/* Hero — the page wrapper is pulled up 72px / 84px so it sits under the transparent navbar */}
      <motion.div>
        {heroes.length > 0 ? (
          <HeroSection heroes={heroes} onReady={() => setHeroReady(true)} />
        ) : (
          // No active hero in admin: keep a plain dark band behind the navbar and search bar, no content
          <div className="h-[260px] bg-premium-charcoal md:h-[300px]" aria-hidden="true" />
        )}
      </motion.div>

      {/* Search Section — above page content, below the navbar (z-60) */}
      <motion.section
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.1 }}
        variants={fadeInUpVariants}
        className="relative -mt-16 sm:-mt-24 z-40 pb-12 sm:pb-20"
      >
        <div className="container mx-auto px-3 sm:px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="max-w-3xl mx-auto"
          >
            <div className="relative">
              <div className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] ring-1 ring-black/5 transition-shadow focus-within:ring-2 focus-within:ring-premium-gold/40 sm:p-2 sm:pl-6">
                <Search className="h-5 w-5 flex-shrink-0 text-gray-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search for a gift…"
                  aria-label="Search products"
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-premium-charcoal placeholder:text-gray-400 focus:outline-none sm:py-3 sm:text-base [&::-webkit-search-cancel-button]:hidden"
                />
                {searchTerm && (
                  <button
                    onClick={() => { setSearchTerm(''); setShowSearchResults(false); }}
                    aria-label="Clear search"
                    className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => handleSearch()}
                  disabled={searchLoading}
                  className="flex flex-shrink-0 items-center gap-2 rounded-full bg-premium-charcoal px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-60 sm:px-7 sm:py-3"
                >
                  {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Search<ArrowRight className="hidden h-4 w-4 sm:block" /></>}
                </button>
              </div>

              {/* Search results: products from the API + matching combos (already loaded on this page).
                  Rows animate on their own — the section's reveal has finished long before results arrive. */}
              <AnimatePresence>
                {showSearchResults && (() => {
                  const q = searchTerm.trim().toLowerCase();
                  const comboMatches = q
                    ? combos.filter(c =>
                        [c.name, c.description, ...(c.combo_products || []).map(cp => cp.product?.name)]
                          .some(t => (t || '').toLowerCase().includes(q))
                      ).slice(0, 4)
                    : [];
                  const row = 'flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 sm:gap-4';
                  const rowAnim = (i: number) => ({ initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.03, duration: 0.25 } });
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="absolute left-0 right-0 top-full z-[45] mt-3 max-h-[26rem] overflow-y-auto rounded-2xl bg-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/5"
                    >
                      {searchLoading ? (
                        <div className="p-8 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-premium-gold" />
                        </div>
                      ) : searchResults.length === 0 && comboMatches.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-500">
                          <Package className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                          <p>No gifts found for “{searchTerm}”.</p>
                          <p className="mt-1">Try another word, or browse all products.</p>
                        </div>
                      ) : (
                        <div className="py-2">
                          {searchResults.length > 0 && (
                            <>
                              <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">Products</p>
                              {searchResults.slice(0, 8).map((product, i) => (
                                <motion.button key={product.id} {...rowAnim(i)} onClick={() => handleProductClick(product)} className={row}>
                                  <img
                                    src={getImageUrl(
                                      (product.has_colors && product.colors && product.colors.length > 0
                                        ? product.colors.find(c => c.is_active)?.image_url
                                        : null) || product.image_url
                                    )}
                                    alt=""
                                    className="h-12 w-12 flex-shrink-0 rounded-lg object-cover sm:h-14 sm:w-14"
                                    onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-premium-charcoal sm:text-base">{product.name}</p>
                                    {product.category && <p className="truncate text-xs text-gray-500">{product.category}</p>}
                                  </div>
                                  <span className="flex-shrink-0 text-sm font-semibold text-premium-charcoal">{formatCurrency(product.price)}</span>
                                </motion.button>
                              ))}
                            </>
                          )}
                          {comboMatches.length > 0 && (
                            <>
                              <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">Combos</p>
                              {comboMatches.map((combo, i) => {
                                const mrp = (combo.combo_products || []).reduce((sum, cp) => sum + (cp.product?.price || 0) * (cp.quantity || 1), 0);
                                const price = combo.discount_price != null ? Number(combo.discount_price) : mrp;
                                return (
                                  <motion.button key={combo.id} {...rowAnim(searchResults.length + i)} onClick={() => handleComboClick(combo)} className={row}>
                                    <img
                                      src={getImageUrl(combo.image_url || '')}
                                      alt=""
                                      className="h-12 w-12 flex-shrink-0 rounded-lg object-cover sm:h-14 sm:w-14"
                                      onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                                    />
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium text-premium-charcoal sm:text-base">{combo.name}</p>
                                      <p className="truncate text-xs text-gray-500">{(combo.combo_products || []).length} items in this combo</p>
                                    </div>
                                    <span className="flex-shrink-0 text-sm font-semibold text-premium-charcoal">{formatCurrency(price)}</span>
                                  </motion.button>
                                );
                              })}
                            </>
                          )}
                          <button
                            onClick={() => navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`)}
                            className="mt-1 flex w-full items-center justify-center gap-2 border-t border-gray-100 px-4 py-3 text-sm font-medium text-premium-gold hover:text-premium-burgundy"
                          >
                            See all results <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Navigation — sticks just below the navbar (72px mobile / 84px desktop) */}
      {/* Breadcrumb only while browsing a category ('Shop by Category' covers the rest) */}
      {selectedCategory && (
      <motion.section
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.1 }}
        variants={fadeInUpVariants}
        className="py-4 sm:py-8 bg-white/80 backdrop-blur-md sticky top-[72px] md:top-[84px] z-30 border-b border-gray-200"
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
      )}

 {/* Categories Grid */}
{!selectedCategory && (
  <motion.section
    initial="initial"
    whileInView="animate"
    viewport={{ once: true, amount: 0.1 }}
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
              // Mounts after data loads, so it triggers its own reveal (the parent section has already animated)
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, amount: 0.2 }}
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
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.1 }}
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
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.1 }}
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
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, amount: 0.1 }}
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
                      // Mounts after data loads, so it triggers its own reveal (the parent section has already animated)
                      initial="initial"
                      whileInView="animate"
                      viewport={{ once: true, amount: 0.2 }}
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
                  // Mounts after data loads, so it triggers its own reveal (the parent section has already animated)
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true, amount: 0.2 }}
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
                      // Mounts after data loads, so it triggers its own reveal (the parent section has already animated)
                      initial="initial"
                      whileInView="animate"
                      viewport={{ once: true, amount: 0.2 }}
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
                  // Mounts after data loads, so it triggers its own reveal (the parent section has already animated)
                  initial="initial"
                  whileInView="animate"
                  viewport={{ once: true, amount: 0.2 }}
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
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.3 }}
        variants={fadeInUpVariants}
        className="relative overflow-hidden bg-premium-charcoal py-16 sm:py-24"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(212,175,55,0.22),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(212,175,55,0.12),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-premium-gold/50 to-transparent" />

        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <motion.p variants={fadeInUpVariants} className="text-xs font-semibold uppercase tracking-[0.25em] text-premium-gold">
              Build your own
            </motion.p>
            <motion.h2 variants={fadeInUpVariants} className="mt-4 font-serif text-3xl leading-tight text-white sm:text-5xl">
              Create the perfect gift combo
            </motion.h2>
            <motion.p variants={fadeInUpVariants} className="mx-auto mt-4 max-w-xl text-base text-white/70 sm:text-lg">
              Pick the pieces, add your photos and words, and we'll wrap it into one thoughtful gift.
            </motion.p>
            <motion.div variants={fadeInUpVariants} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={() => navigate('/custom-combo')}
                className="group inline-flex items-center gap-2 rounded-full bg-premium-gold px-7 py-3.5 text-sm font-semibold text-premium-charcoal shadow-[0_10px_30px_-10px_rgba(212,175,55,0.6)] transition-all hover:-translate-y-0.5 hover:bg-[#e0bf4f] sm:text-base"
              >
                <Sparkles className="h-4 w-4" />
                Design a custom combo
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => navigate('/combos')}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3.5 text-sm font-medium text-white/90 transition-colors hover:border-white/40 hover:text-white sm:text-base"
              >
                Browse ready-made combos
              </button>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Featured Products */}
      {!selectedCategory && (
        <>
          <motion.section
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, amount: 0.1 }}
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
                    // Mounts after data loads, so it triggers its own reveal (the parent section has already animated)
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true, amount: 0.2 }}
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
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, amount: 0.1 }}
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
                      // Mounts after data loads, so it triggers its own reveal (the parent section has already animated)
                      initial="initial"
                      whileInView="animate"
                      viewport={{ once: true, amount: 0.2 }}
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

{/* Stats Section — values are editable (site_settings "stats") */}
      <motion.section
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainerVariants}
        className="relative overflow-hidden bg-premium-charcoal py-16 text-white sm:py-20"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.12),transparent_65%)]" />
        <div className="container relative mx-auto px-4">
          <motion.div variants={fadeInUpVariants} className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-premium-gold">Trusted by gift-givers</p>
            <h2 className="mt-3 font-serif text-3xl sm:text-4xl">Gifting, done beautifully</h2>
          </motion.div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 md:grid-cols-4">
            {(stats.length ? stats : defaultStats).slice(0, 4).map((stat, i) => {
              const Icon = [Users, Gift, MapPin, Star][i] || Star;
              return (
                <motion.div
                  key={stat.label}
                  variants={fadeInUpVariants}
                  className="flex flex-col items-center bg-premium-charcoal px-4 py-8 text-center sm:py-10"
                >
                  <Icon className="mb-4 h-6 w-6 text-premium-gold" strokeWidth={1.5} />
                  <div className="font-serif text-3xl text-white sm:text-4xl">{stat.value}</div>
                  <div className="mt-2 text-xs uppercase tracking-[0.15em] text-white/60 sm:text-sm">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

    </motion.div>
  );
};

export default Home;