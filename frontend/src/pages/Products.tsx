import React, { useState, useEffect } from 'react';
import { Filter, X, SlidersHorizontal, Search, Share2 } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { Product, Gender, Category } from '../types';
import { apiFetch } from '../utils/api';
import { getImageUrl } from '../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

/* ─── Dynamic OG / Twitter meta helper ─── */
const setMetaTags = (title: string, description: string, imageUrl: string, url: string) => {
  const upsert = (selector: string, attrName: string, attrVal: string, contentVal: string) => {
    let el = document.querySelector(selector) as HTMLMetaElement | null;
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute('content', contentVal);
  };
  document.title = `${title} — GFTD`;
  upsert('meta[name="description"]', 'name', 'description', description);
  upsert('meta[property="og:title"]', 'property', 'og:title', title);
  upsert('meta[property="og:description"]', 'property', 'og:description', description);
  upsert('meta[property="og:image"]', 'property', 'og:image', imageUrl);
  upsert('meta[property="og:url"]', 'property', 'og:url', url);
  upsert('meta[property="og:type"]', 'property', 'og:type', 'website');
  upsert('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  upsert('meta[name="twitter:title"]', 'name', 'twitter:title', title);
  upsert('meta[name="twitter:description"]', 'name', 'twitter:description', description);
  upsert('meta[name="twitter:image"]', 'name', 'twitter:image', imageUrl);
};

const Products: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialCategory = searchParams.get('category');
  const searchQuery = searchParams.get('search') || '';
  const initialProductId = searchParams.get('id');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState([0, 50000]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCategory ? [initialCategory] : []
  );
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'popular' | 'price-low' | 'price-high' | 'newest'>('popular');

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, priceRange, selectedCategories, selectedGender, sortBy, searchQuery]);

  /* Update meta tags whenever category selection changes */
  useEffect(() => {
    if (selectedCategories.length === 1) {
      const catName = selectedCategories[0];
      const catObj = categories.find(c => c.name === catName);
      const imageUrl = catObj?.image_url
        ? getImageUrl(catObj.image_url)
        : `${window.location.origin}/logo.png`;
      const desc = catObj?.description
        || `Shop our ${catName} collection — premium gifts for every occasion.`;
      setMetaTags(
        `${catName} — GFTD Collection`,
        desc,
        imageUrl,
        window.location.href,
      );
    } else if (selectedCategories.length === 0 && !searchQuery) {
      setMetaTags(
        'Our Collection — GFTD',
        'Discover premium gifts for every occasion. Shop our curated collection today.',
        `${window.location.origin}/logo.png`,
        window.location.href,
      );
    }
  }, [selectedCategories, categories]);

  const fetchData = async () => {
    try {
      const [productsData, gendersData, categoriesData] = await Promise.all([
        apiFetch('/api/products').catch(() => []),
        apiFetch('/api/genders').catch(() => []),
        apiFetch('/api/categories').catch(() => []),
      ]);
      setProducts(productsData || []);
      setFilteredProducts(productsData || []);
      setGenders(gendersData || []);
      setCategories(categoriesData || []);
      if (initialProductId) {
        navigate(`/product/${initialProductId}`, { replace: true });
        return;
      }
      const maxPrice = productsData?.length > 0
        ? Math.max(...(productsData as Product[]).map((p) => p.price), 50000)
        : 50000;
      setPriceRange([0, maxPrice]);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProductCategoryNames = (product: Product): string[] => {
    if (product.categories && product.categories.length > 0) {
      return product.categories.map((c: any) => c.name);
    }
    return product.category ? [product.category] : [];
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(q) ||
        getProductCategoryNames(product).some(c => c.toLowerCase().includes(q)) ||
        (product.description || '').toLowerCase().includes(q) ||
        (product.gender || '').toLowerCase().includes(q)
      );
    }
    filtered = filtered.filter(
      product => product.price >= priceRange[0] && product.price <= priceRange[1]
    );
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(product =>
        getProductCategoryNames(product).some(c => selectedCategories.includes(c))
      );
    }
    if (selectedGender !== 'all') {
      filtered = filtered.filter(product => product.gender === selectedGender);
    }
    switch (sortBy) {
      case 'price-low': filtered.sort((a, b) => a.price - b.price); break;
      case 'price-high': filtered.sort((a, b) => b.price - a.price); break;
      case 'newest':
        filtered.sort((a, b) =>
          new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
        );
        break;
      default: break;
    }
    setFilteredProducts(filtered);
  };

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedGender('all');
    setPriceRange([0, Math.max(...products.map(p => p.price), 50000)]);
  };

  const handleShareCategory = async () => {
    const url = window.location.href;
    const title = selectedCategories.length === 1
      ? `${selectedCategories[0]} — GFTD`
      : 'Our Collection — GFTD';
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied!');
      }
    } catch { /* user cancelled */ }
  };

  const activeCategories = categories.filter(cat =>
    products.some(p => getProductCategoryNames(p).includes(cat.name))
  );

  const getCategoryCount = (catName: string) =>
    products.filter(p => getProductCategoryNames(p).includes(catName)).length;

  const FilterContent = () => (
    <div className="space-y-5">
      <div>
        <h4 className="font-medium text-sm mb-2">Price Range</h4>
        <input
          type="range" min="0"
          max={Math.max(...products.map(p => p.price), 50000)}
          step="100" value={priceRange[1]}
          onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
          className="w-full accent-premium-gold"
        />
        <div className="flex justify-between text-xs mt-1">
          <span>₹{priceRange[0].toLocaleString()}</span>
          <span>₹{priceRange[1].toLocaleString()}</span>
        </div>
      </div>

      {activeCategories.length > 0 && (
        <div>
          <h4 className="font-medium text-sm mb-2">Categories</h4>
          <div className="space-y-1.5">
            {activeCategories.map(cat => (
              <label key={cat.id} className="flex items-center justify-between cursor-pointer text-sm">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.name)}
                    onChange={() => toggleCategory(cat.name)}
                    className="rounded border-premium-gold text-premium-gold focus:ring-premium-gold h-4 w-4"
                  />
                  <span className="flex items-center gap-1.5">
                    {cat.icon_type === 'image' && cat.image_url
                      ? <img src={cat.image_url} className="w-4 h-4 object-contain rounded" alt="" />
                      : cat.icon_type === 'emoji' && cat.icon
                        ? <span className="text-sm leading-none">{cat.icon}</span>
                        : null
                    }
                    {cat.name}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{getCategoryCount(cat.name)}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="font-medium text-sm mb-2">For</h4>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedGender('all')}
            className={`px-3 py-1.5 rounded-full text-xs capitalize transition-colors ${
              selectedGender === 'all' ? 'bg-premium-gold text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >All</button>
          {genders.map((gender) => (
            <button
              key={gender.name}
              onClick={() => setSelectedGender(gender.name)}
              className={`px-3 py-1.5 rounded-full text-xs capitalize transition-colors flex items-center gap-1 ${
                selectedGender === gender.name ? 'bg-premium-gold text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {(gender as any).icon && <span>{(gender as any).icon}</span>}
              <span>{gender.display_name}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={clearFilters}
        className="w-full px-4 py-2 text-sm border border-premium-gold text-premium-gold rounded-lg hover:bg-premium-gold hover:text-white transition-colors font-medium"
      >Clear All Filters</button>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">

          <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-serif font-bold">
                {selectedCategories.length === 1
                  ? <><span className="text-premium-gold">{selectedCategories[0]}</span></>
                  : <>Our <span className="text-premium-gold">Collection</span></>
                }
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-0.5 sm:mt-1">
                {selectedCategories.length === 1
                  ? `${getCategoryCount(selectedCategories[0])} products in this category`
                  : 'Discover the perfect gift'
                }
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Share current category / collection */}
              <button
                onClick={handleShareCategory}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="Share this collection"
              >
                <Share2 className="h-4 w-4 text-gray-500" />
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden flex items-center gap-1.5 px-3 py-2 bg-premium-gold text-white rounded-lg text-sm"
              >
                <Filter className="h-4 w-4" />
                <span>Filters</span>
              </button>
            </div>
          </div>

          {(selectedCategories.length > 0 || selectedGender !== 'all' || searchQuery) && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
              {searchQuery && (
                <span className="px-2 sm:px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs flex items-center gap-1">
                  <Search className="h-3 w-3" />&ldquo;{searchQuery}&rdquo;
                </span>
              )}
              {selectedCategories.map(cat => (
                <span key={cat} className="px-2 sm:px-3 py-1 bg-premium-gold/10 text-premium-gold rounded-full text-xs flex items-center gap-1">
                  {cat}
                  <button onClick={() => toggleCategory(cat)} className="hover:bg-premium-gold/20 rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {selectedGender !== 'all' && (
                <span className="px-2 sm:px-3 py-1 bg-premium-gold/10 text-premium-gold rounded-full text-xs flex items-center gap-1 capitalize">
                  {selectedGender}
                  <button onClick={() => setSelectedGender('all')} className="hover:bg-premium-gold/20 rounded-full p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          <div className="flex justify-end mb-3 sm:mb-4">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-premium-gold bg-white"
            >
              <option value="popular">Popular</option>
              <option value="newest">Newest</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>

          <div className="flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6">

            <AnimatePresence>
              {showFilters && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setShowFilters(false)}
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                  />
                  <motion.div
                    initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                    transition={{ type: 'tween' }}
                    className="fixed left-0 top-0 bottom-0 w-[280px] sm:w-[320px] bg-white z-50 md:hidden overflow-y-auto"
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-serif text-lg font-semibold flex items-center gap-2">
                          <SlidersHorizontal className="h-4 w-4" />Filters
                        </h3>
                        <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-gray-100 rounded-full">
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <FilterContent />
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            <div className="hidden md:block w-56 lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sticky top-4">
                <h3 className="font-serif text-lg font-semibold mb-4 flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />Filters
                </h3>
                <FilterContent />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-white rounded-lg p-2 animate-pulse">
                      <div className="aspect-square bg-gray-200 rounded-lg mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded mb-1.5"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3 mb-1.5"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="mb-2 text-xs sm:text-sm text-gray-600">
                    Showing {filteredProducts.length} of {products.length} products
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                    {filteredProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                  {filteredProducts.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      className="text-center py-8 sm:py-12"
                    >
                      <div className="text-4xl mb-3">😕</div>
                      <h3 className="text-lg font-serif font-bold mb-2">No Products Found</h3>
                      <p className="text-sm text-gray-600 mb-4">No products match your selected filters.</p>
                      <button
                        onClick={clearFilters}
                        className="px-4 py-2 text-sm bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors"
                      >Clear Filters</button>
                    </motion.div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Products;
