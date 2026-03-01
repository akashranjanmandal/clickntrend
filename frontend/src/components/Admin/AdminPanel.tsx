import React, { useState, useEffect } from 'react';
import { 
  LogOut, Package, DollarSign, TrendingUp, Eye, 
  RefreshCw, Plus, Edit, Trash2, Download, Search,
  ShoppingBag, MapPin, Phone, Mail, Calendar,
  BarChart3, Shield, Printer, XCircle, Tag, Copy,
  Image as ImageIcon, Star, Video, Gift, ChevronDown,
  ChevronUp, ChevronsLeft, ChevronsRight, ArrowUpDown,
  Loader
} from 'lucide-react';
import { Order, Product, Combo, ComboProduct } from '../../types';
import CategoryManager from './CategoryManager';
import { formatCurrency, getImageUrl } from '../../utils/helpers';
import ProductUpload from './ProductUpload';
import ComboManager from './ComboManager';
import EditProduct from './EditProduct';
import InvoicePDF from './InvoicePDF';
import CouponManager from './CouponManager';
import { useApi } from '../../hooks/useApi';
import ReviewManager from './ReviewManager';
import HeroManager from './HeroManager';
import PopupManager from './PopupManager';
import LogoManager from './LogoManager';

const AdminPanel: React.FC = () => {
  const { fetchWithAuth } = useApi();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'products' | 'combos' | 'coupons' | 'categories' | 'hero' |'reviews' |'popups' | 'logo'>('dashboard');
  const [showProductUpload, setShowProductUpload] = useState(false);
  const [showComboManager, setShowComboManager] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [copySuccess, setCopySuccess] = useState<string>('');

  // Pagination states for orders
  const [orderPage, setOrderPage] = useState(1);
  const [ordersPerPage] = useState(20);
  const [orderSortField, setOrderSortField] = useState<'date' | 'status' | 'amount' | 'name'>('date');
  const [orderSortDirection, setOrderSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [paginatedOrders, setPaginatedOrders] = useState<Order[]>([]);

  // Pagination states for products
  const [productPage, setProductPage] = useState(1);
  const [productsPerPage] = useState(20);
  const [productSortField, setProductSortField] = useState<'name' | 'price' | 'stock' | 'category'>('name');
  const [productSortDirection, setProductSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [paginatedProducts, setPaginatedProducts] = useState<Product[]>([]);

  // Pagination states for combos
  const [comboPage, setComboPage] = useState(1);
  const [combosPerPage] = useState(20);
  const [comboSortField, setComboSortField] = useState<'name' | 'price' | 'status'>('name');
  const [comboSortDirection, setComboSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filteredCombos, setFilteredCombos] = useState<Combo[]>([]);
  const [paginatedCombos, setPaginatedCombos] = useState<Combo[]>([]);

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalProducts: 0,
    totalCombos: 0,
    thisMonthRevenue: 0,
    averageOrderValue: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Filter and sort orders
  useEffect(() => {
    if (!orders.length) return;
    
    let filtered = [...orders];
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.customer_name.toLowerCase().includes(query) ||
        order.customer_email.toLowerCase().includes(query) ||
        order.id.toLowerCase().includes(query) ||
        (order.customer_phone && order.customer_phone.includes(query))
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (orderSortField) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'amount':
          comparison = a.total_amount - b.total_amount;
          break;
        case 'name':
          comparison = a.customer_name.localeCompare(b.customer_name);
          break;
        default:
          comparison = 0;
      }
      return orderSortDirection === 'asc' ? comparison : -comparison;
    });
    
    setFilteredOrders(filtered);
    setOrderPage(1);
  }, [orders, searchQuery, orderSortField, orderSortDirection]);

  // Filter and sort products
  useEffect(() => {
    if (!products.length) return;
    
    let filtered = [...products];
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (productSortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'stock':
          comparison = (a.stock_quantity || 0) - (b.stock_quantity || 0);
          break;
        case 'category':
          comparison = a.category.localeCompare(b.category);
          break;
        default:
          comparison = 0;
      }
      return productSortDirection === 'asc' ? comparison : -comparison;
    });
    
    setFilteredProducts(filtered);
    setProductPage(1);
  }, [products, searchQuery, productSortField, productSortDirection]);

  // Filter and sort combos
  useEffect(() => {
    if (!combos.length) return;
    
    let filtered = [...combos];
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(combo => 
        combo.name.toLowerCase().includes(query) ||
        combo.description.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (comboSortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          const aPrice = a.discount_price || a.discount_percentage 
            ? a.combo_products?.reduce((sum, cp) => sum + (cp.product?.price || 0) * (cp.quantity || 1), 0) * (1 - (a.discount_percentage || 0) / 100)
            : a.combo_products?.reduce((sum, cp) => sum + (cp.product?.price || 0) * (cp.quantity || 1), 0) || 0;
          const bPrice = b.discount_price || b.discount_percentage 
            ? b.combo_products?.reduce((sum, cp) => sum + (cp.product?.price || 0) * (cp.quantity || 1), 0) * (1 - (b.discount_percentage || 0) / 100)
            : b.combo_products?.reduce((sum, cp) => sum + (cp.product?.price || 0) * (cp.quantity || 1), 0) || 0;
          comparison = aPrice - bPrice;
          break;
        case 'status':
          comparison = (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0);
          break;
        default:
          comparison = 0;
      }
      return comboSortDirection === 'asc' ? comparison : -comparison;
    });
    
    setFilteredCombos(filtered);
    setComboPage(1);
  }, [combos, searchQuery, comboSortField, comboSortDirection]);

  // Update paginated orders
  useEffect(() => {
    const startIndex = (orderPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    setPaginatedOrders(filteredOrders.slice(startIndex, endIndex));
  }, [filteredOrders, orderPage, ordersPerPage]);

  // Update paginated products
  useEffect(() => {
    const startIndex = (productPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    setPaginatedProducts(filteredProducts.slice(startIndex, endIndex));
  }, [filteredProducts, productPage, productsPerPage]);

  // Update paginated combos
  useEffect(() => {
    const startIndex = (comboPage - 1) * combosPerPage;
    const endIndex = startIndex + combosPerPage;
    setPaginatedCombos(filteredCombos.slice(startIndex, endIndex));
  }, [filteredCombos, comboPage, combosPerPage]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [ordersData, productsData, combosData] = await Promise.all([
        fetchWithAuth('/api/admin/orders'),
        fetchWithAuth('/api/admin/products'),
        fetchWithAuth('/api/admin/combos'),
      ]);

      setOrders(ordersData);
      setProducts(productsData);
      setCombos(combosData);

      const totalRevenue = ordersData.reduce(
        (sum: number, o: Order) =>
          ['paid', 'delivered', 'completed'].includes(o.status) ? sum + o.total_amount : sum,
        0
      );

      const pendingOrders = ordersData.filter((o: Order) =>
        ['created', 'pending', 'processing'].includes(o.status)
      ).length;

      const completedOrders = ordersData.filter((o: Order) =>
        ['paid', 'delivered', 'completed'].includes(o.status)
      ).length;

      const thisMonth = new Date().getMonth();
      const thisMonthRevenue = ordersData
        .filter((o: Order) => new Date(o.created_at).getMonth() === thisMonth)
        .reduce((sum: number, o: Order) => sum + o.total_amount, 0);

      setStats({
        totalOrders: ordersData.length,
        totalRevenue,
        pendingOrders,
        completedOrders,
        totalProducts: productsData.length,
        totalCombos: combosData.length,
        thisMonthRevenue,
        averageOrderValue: ordersData.length ? totalRevenue / ordersData.length : 0,
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      alert('Failed to load dashboard data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreData = async () => {
    setLoadingMore(true);
    // Simulate loading more data
    await new Promise(resolve => setTimeout(resolve, 1000));
    setLoadingMore(false);
  };

  const deleteCombo = async (comboId: string) => {
    if (!confirm('Are you sure you want to delete this combo?')) return;
    try {
      await fetchWithAuth(`/api/admin/combos/${comboId}`, { method: 'DELETE' });
      await fetchDashboardData();
      alert('Combo deleted successfully!');
    } catch (error) {
      console.error('Error deleting combo:', error);
      alert('Failed to delete combo');
    }
  };

  const toggleComboStatus = async (combo: Combo) => {
    try {
      await fetchWithAuth(`/api/admin/combos/${combo.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !combo.is_active }),
      });
      await fetchDashboardData();
      alert(`Combo ${!combo.is_active ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error('Error updating combo status:', error);
      alert('Failed to update combo status');
    }
  };

  const updateOrderStatus = async (orderId: string, status: string, trackingNumber?: string) => {
    try {
      await fetchWithAuth(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({ status, tracking_number: trackingNumber || '' }),
      });
      await fetchDashboardData();
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Failed to update order status');
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await fetchWithAuth(`/api/admin/products/${productId}`, { method: 'DELETE' });
      await fetchDashboardData();
      alert('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      await fetchWithAuth(`/api/admin/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: !product.is_active }),
      });
      await fetchDashboardData();
      alert(`Product ${!product.is_active ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error('Error updating product status:', error);
      alert('Failed to update product status');
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setShowEditProduct(true);
  };

  const handleEditCombo = (combo: Combo) => {
    setEditingCombo(combo);
    setShowComboManager(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    window.location.href = '/admin';
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'paid':
      case 'delivered':
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'shipped':
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending':
      case 'created':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled':
      case 'failed':
      case 'refunded':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(text);
    setTimeout(() => setCopySuccess(''), 2000);
  };

  const exportOrdersCSV = () => {
    const csvData = filteredOrders.map(order => ({
      'Order ID': order.id,
      'Date': new Date(order.created_at).toLocaleDateString(),
      'Customer Name': order.customer_name,
      'Customer Email': order.customer_email,
      'Customer Phone': order.customer_phone || '',
      'Address': order.shipping_address || '',
      'City': order.shipping_city || '',
      'State': order.shipping_state || '',
      'Pincode': order.shipping_pincode || '',
      'Amount': order.total_amount,
      'Status': order.status,
      'Tracking Number': order.tracking_number || '',
      'Payment ID': order.razorpay_payment_id || '',
      'Items Count': Array.isArray(order.items) ? order.items.length : 0,
      'Has Customization': Array.isArray(order.items) 
        ? order.items.some((item: any) => item.customization).toString()
        : 'false',
    }));

    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(',')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const generateInvoice = (order: Order) => {
    setSelectedOrder(order);
    setShowInvoice(true);
  };

  const printInvoice = () => {
    const invoiceContent = document.getElementById('invoice-content');
    if (invoiceContent) {
      const originalContent = document.body.innerHTML;
      document.body.innerHTML = invoiceContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContent;
      window.location.reload();
    }
  };

  // Sort button component
  const SortButton = ({ field, currentField, direction, onSort, children }: any) => (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 hover:text-premium-gold transition-colors"
    >
      {children}
      {currentField === field ? (
        direction === 'asc' ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )
      ) : (
        <ArrowUpDown className="h-4 w-4 opacity-30" />
      )}
    </button>
  );

  // Pagination component
  const Pagination = ({ currentPage, totalItems, itemsPerPage, onPageChange }: any) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-between px-6 py-4 border-t">
        <div className="text-sm text-gray-600">
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to{' '}
          {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronsLeft className="h-5 w-5" />
          </button>
          {pageNumbers.map(number => (
            <button
              key={number}
              onClick={() => onPageChange(number)}
              className={`px-3 py-1 rounded ${
                currentPage === number
                  ? 'bg-premium-gold text-white'
                  : 'hover:bg-gray-100'
              }`}
            >
              {number}
            </button>
          ))}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-2 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronsRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  };

  if (loading && activeTab === 'dashboard') {
    return (
      <div className="min-h-screen bg-premium-cream flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-premium-gold mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Shield className="h-8 w-8 text-premium-gold" />
                <div>
                  <h1 className="text-2xl font-serif font-bold">Admin Dashboard</h1>
                  <p className="text-sm text-gray-600">Premium Gift Shop Management</p>
                </div>
              </div>
          <div className="hidden md:flex items-center space-x-1 ml-8">
  {/* Dashboard - always visible */}
  <button
    onClick={() => setActiveTab('dashboard')}
    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
      activeTab === 'dashboard'
        ? 'bg-premium-gold text-white'
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    <BarChart3 className="h-4 w-4" />
    <span>Dashboard</span>
  </button>

  {/* Orders - always visible */}
  <button
    onClick={() => setActiveTab('orders')}
    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
      activeTab === 'orders'
        ? 'bg-premium-gold text-white'
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    <Package className="h-4 w-4" />
    <span>Orders</span>
  </button>

  {/* Products Dropdown */}
  <div className="relative group">
    <button
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
        ['products', 'combos', 'categories'].includes(activeTab)
          ? 'bg-premium-gold text-white'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <ShoppingBag className="h-4 w-4" />
      <span>Products</span>
      <ChevronDown className="h-4 w-4" />
    </button>
    
    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border py-2 min-w-[180px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
      <button
        onClick={() => setActiveTab('products')}
        className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2 ${
          activeTab === 'products' ? 'bg-premium-cream text-premium-gold' : ''
        }`}
      >
        <ShoppingBag className="h-4 w-4" />
        <span>Products</span>
      </button>
      <button
        onClick={() => setActiveTab('combos')}
        className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2 ${
          activeTab === 'combos' ? 'bg-premium-cream text-premium-gold' : ''
        }`}
      >
        <Package className="h-4 w-4" />
        <span>Combos</span>
      </button>
      <button
        onClick={() => setActiveTab('categories')}
        className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2 ${
          activeTab === 'categories' ? 'bg-premium-cream text-premium-gold' : ''
        }`}
      >
        <Tag className="h-4 w-4" />
        <span>Categories</span>
      </button>
    </div>
  </div>

  {/* Marketing Dropdown */}
  <div className="relative group">
    <button
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
        ['coupons', 'reviews', 'hero', 'popups', 'logo'].includes(activeTab)
          ? 'bg-premium-gold text-white'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Gift className="h-4 w-4" />
      <span>Marketing</span>
      <ChevronDown className="h-4 w-4" />
    </button>
    
    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border py-2 min-w-[180px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
      <button
        onClick={() => setActiveTab('coupons')}
        className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2 ${
          activeTab === 'coupons' ? 'bg-premium-cream text-premium-gold' : ''
        }`}
      >
        <Tag className="h-4 w-4" />
        <span>Coupons</span>
      </button>
      <button
        onClick={() => setActiveTab('reviews')}
        className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2 ${
          activeTab === 'reviews' ? 'bg-premium-cream text-premium-gold' : ''
        }`}
      >
        <Star className="h-4 w-4" />
        <span>Reviews</span>
      </button>
      <button
        onClick={() => setActiveTab('hero')}
        className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2 ${
          activeTab === 'hero' ? 'bg-premium-cream text-premium-gold' : ''
        }`}
      >
        <Video className="h-4 w-4" />
        <span>Hero</span>
      </button>
      <button
        onClick={() => setActiveTab('popups')}
        className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2 ${
          activeTab === 'popups' ? 'bg-premium-cream text-premium-gold' : ''
        }`}
      >
        <Gift className="h-4 w-4" />
        <span>Popups</span>
      </button>
      <button
        onClick={() => setActiveTab('logo')}
        className={`w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center space-x-2 ${
          activeTab === 'logo' ? 'bg-premium-cream text-premium-gold' : ''
        }`}
      >
        <ImageIcon className="h-4 w-4" />
        <span>Logo</span>
      </button>
    </div>
  </div>
</div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={fetchDashboardData}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Refresh Data"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <LogOut className="h-5 w-5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          <div className="md:hidden mt-4 overflow-x-auto">
            <div className="flex space-x-2">
              {['dashboard', 'orders', 'products', 'combos', 'coupons', 'categories', 'reviews', 'hero', 'popups', 'logo'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-premium-gold text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl p-6 shadow border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-3xl font-bold mt-2">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 text-sm text-green-600">
                  +{Math.round((stats.thisMonthRevenue / (stats.totalRevenue - stats.thisMonthRevenue)) * 100)}% from last month
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-3xl font-bold mt-2">{stats.totalOrders}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <Package className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${stats.pendingOrders > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                    {stats.pendingOrders} pending
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Products</p>
                    <p className="text-3xl font-bold mt-2">{stats.totalProducts}</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <ShoppingBag className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setShowProductUpload(true)}
                    className="text-sm text-premium-gold hover:text-premium-burgundy font-medium"
                  >
                    + Add Product
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg. Order Value</p>
                    <p className="text-3xl font-bold mt-2">{formatCurrency(stats.averageOrderValue)}</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  This month: {formatCurrency(stats.thisMonthRevenue)}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow border border-gray-100 p-6 mb-8">
              <h2 className="text-xl font-semibold mb-6">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setShowProductUpload(true)}
                  className="p-4 border rounded-lg hover:border-premium-gold hover:bg-premium-cream transition-colors text-center"
                >
                  <Plus className="h-8 w-8 text-premium-gold mx-auto mb-2" />
                  <span className="font-medium">Add Product</span>
                </button>
                <button
                  onClick={() => setShowComboManager(true)}
                  className="p-4 border rounded-lg hover:border-premium-gold hover:bg-premium-cream transition-colors text-center"
                >
                  <Package className="h-8 w-8 text-premium-gold mx-auto mb-2" />
                  <span className="font-medium">Create Combo</span>
                </button>
                <button
                  onClick={exportOrdersCSV}
                  className="p-4 border rounded-lg hover:border-premium-gold hover:bg-premium-cream transition-colors text-center"
                >
                  <Download className="h-8 w-8 text-premium-gold mx-auto mb-2" />
                  <span className="font-medium">Export Data</span>
                </button>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="p-4 border rounded-lg hover:border-premium-gold hover:bg-premium-cream transition-colors text-center"
                >
                  <Eye className="h-8 w-8 text-premium-gold mx-auto mb-2" />
                  <span className="font-medium">View Orders</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-xl font-semibold">Recent Orders</h2>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-premium-gold hover:text-premium-burgundy font-medium"
                >
                  View All →
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-4">Order ID</th>
                      <th className="text-left p-4">Customer</th>
                      <th className="text-left p-4">Amount</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Customization</th>
                      <th className="text-left p-4">Date</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((order) => {
                      const hasCustomization = Array.isArray(order.items) 
                        ? order.items.some((item: any) => item.customization)
                        : false;
                      
                      return (
                        <tr key={order.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <div className="font-mono text-sm font-medium">{order.id.slice(0, 8)}...</div>
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{order.customer_name}</p>
                              <p className="text-sm text-gray-600">{order.customer_email}</p>
                            </div>
                          </td>
                          <td className="p-4 font-semibold">
                            {formatCurrency(order.total_amount)}
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                              {order.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4">
                            {hasCustomization ? (
                              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                Yes
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">No</span>
                            )}
                          </td>
                          <td className="p-4 text-sm text-gray-600">
                            {new Date(order.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">All Orders ({filteredOrders.length})</h2>
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search orders..."
                    className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-premium-gold w-full"
                  />
                </div>
                <button
                  onClick={exportOrdersCSV}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors"
                >
                  <Download className="h-4 w-4" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
            
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No orders found</p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-premium-gold hover:text-premium-burgundy"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-4">Order ID</th>
                        <th className="text-left p-4">
                          <SortButton
                            field="name"
                            currentField={orderSortField}
                            direction={orderSortDirection}
                            onSort={(field: string) => {
                              if (orderSortField === field) {
                                setOrderSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                              } else {
                                setOrderSortField(field as any);
                                setOrderSortDirection('asc');
                              }
                            }}
                          >
                            Customer
                          </SortButton>
                        </th>
                        <th className="text-left p-4">
                          <SortButton
                            field="amount"
                            currentField={orderSortField}
                            direction={orderSortDirection}
                            onSort={(field: string) => {
                              if (orderSortField === field) {
                                setOrderSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                              } else {
                                setOrderSortField(field as any);
                                setOrderSortDirection('asc');
                              }
                            }}
                          >
                            Amount
                          </SortButton>
                        </th>
                        <th className="text-left p-4">
                          <SortButton
                            field="status"
                            currentField={orderSortField}
                            direction={orderSortDirection}
                            onSort={(field: string) => {
                              if (orderSortField === field) {
                                setOrderSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                              } else {
                                setOrderSortField(field as any);
                                setOrderSortDirection('asc');
                              }
                            }}
                          >
                            Status
                          </SortButton>
                        </th>
                        <th className="text-left p-4">Customization</th>
                        <th className="text-left p-4">
                          <SortButton
                            field="date"
                            currentField={orderSortField}
                            direction={orderSortDirection}
                            onSort={(field: string) => {
                              if (orderSortField === field) {
                                setOrderSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                              } else {
                                setOrderSortField(field as any);
                                setOrderSortDirection('desc');
                              }
                            }}
                          >
                            Date
                          </SortButton>
                        </th>
                        <th className="text-left p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOrders.map((order) => {
                        const hasCustomization = Array.isArray(order.items) 
                          ? order.items.some((item: any) => item.customization)
                          : false;
                        
                        return (
                          <tr key={order.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">
                              <div className="font-mono text-sm">{order.id.slice(0, 8)}...</div>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="font-medium">{order.customer_name}</p>
                                <p className="text-sm text-gray-600 flex items-center">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {order.shipping_city || 'N/A'}
                                </p>
                              </div>
                            </td>
                            <td className="p-4 font-semibold">
                              {formatCurrency(order.total_amount)}
                            </td>
                            <td className="p-4">
                              <select
                                value={order.status}
                                onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                className={`px-3 py-1 rounded text-xs font-medium border ${getStatusColor(order.status)} focus:outline-none`}
                              >
                                <option value="pending">PENDING</option>
                                <option value="processing">PROCESSING</option>
                                <option value="paid">PAID</option>
                                <option value="shipped">SHIPPED</option>
                                <option value="delivered">DELIVERED</option>
                                <option value="cancelled">CANCELLED</option>
                              </select>
                            </td>
                            <td className="p-4">
                              {hasCustomization ? (
                                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                  Yes
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">No</span>
                              )}
                            </td>
                            <td className="p-4 text-sm text-gray-600">
                              <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(order.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setSelectedOrder(order)}
                                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => updateOrderStatus(order.id, 'shipped', `TRK${Date.now()}`)}
                                  className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
                                >
                                  Ship
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                <Pagination
                  currentPage={orderPage}
                  totalItems={filteredOrders.length}
                  itemsPerPage={ordersPerPage}
                  onPageChange={setOrderPage}
                />
                
                {paginatedOrders.length < filteredOrders.length && (
                  <div className="text-center py-4 border-t">
                    <button
                      onClick={loadMoreData}
                      disabled={loadingMore}
                      className="px-4 py-2 text-premium-gold hover:text-premium-burgundy font-medium disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <Loader className="h-5 w-5 animate-spin mx-auto" />
                      ) : (
                        `Load More (${filteredOrders.length - paginatedOrders.length} remaining)`
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">All Products ({filteredProducts.length})</h2>
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-premium-gold w-full"
                  />
                </div>
                <button
                  onClick={() => setShowProductUpload(true)}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Product</span>
                </button>
              </div>
            </div>
            
            {filteredProducts.length === 0 ? (
              <div className="p-8 text-center">
                <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No products found</p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-premium-gold hover:text-premium-burgundy"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-4">Image</th>
                        <th className="text-left p-4">
                          <SortButton
                            field="name"
                            currentField={productSortField}
                            direction={productSortDirection}
                            onSort={(field: string) => {
                              if (productSortField === field) {
                                setProductSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                              } else {
                                setProductSortField(field as any);
                                setProductSortDirection('asc');
                              }
                            }}
                          >
                            Name
                          </SortButton>
                        </th>
                        <th className="text-left p-4">
                          <SortButton
                            field="category"
                            currentField={productSortField}
                            direction={productSortDirection}
                            onSort={(field: string) => {
                              if (productSortField === field) {
                                setProductSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                              } else {
                                setProductSortField(field as any);
                                setProductSortDirection('asc');
                              }
                            }}
                          >
                            Category
                          </SortButton>
                        </th>
                        <th className="text-left p-4">Gender</th>
                        <th className="text-left p-4">
                          <SortButton
                            field="price"
                            currentField={productSortField}
                            direction={productSortDirection}
                            onSort={(field: string) => {
                              if (productSortField === field) {
                                setProductSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                              } else {
                                setProductSortField(field as any);
                                setProductSortDirection('asc');
                              }
                            }}
                          >
                            Price
                          </SortButton>
                        </th>
                        <th className="text-left p-4">
                          <SortButton
                            field="stock"
                            currentField={productSortField}
                            direction={productSortDirection}
                            onSort={(field: string) => {
                              if (productSortField === field) {
                                setProductSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                              } else {
                                setProductSortField(field as any);
                                setProductSortDirection('asc');
                              }
                            }}
                          >
                            Stock
                          </SortButton>
                        </th>
                        <th className="text-left p-4">Customizable</th>
                        <th className="text-left p-4">Status</th>
                        <th className="text-left p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProducts.map((product) => (
                        <tr key={product.id} className="border-b hover:bg-gray-50">
                          <td className="p-4">
                            <img
                              src={getImageUrl(product.image_url)}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-gray-600 line-clamp-1">{product.description}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                              {product.category}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs capitalize">
                              {product.gender || 'unisex'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div>
                              <p className="font-semibold">{formatCurrency(product.price)}</p>
                              {product.discount_percentage && (
                                <p className="text-sm text-red-600">
                                  -{product.discount_percentage}%
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              product.stock_quantity > 10 
                                ? 'bg-green-100 text-green-800' 
                                : product.stock_quantity > 0 
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {product.stock_quantity} in stock
                            </span>
                          </td>
                          <td className="p-4">
                            {product.is_customizable ? (
                              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                                Yes
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">No</span>
                            )}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => toggleProductStatus(product)}
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                product.is_active 
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                  : 'bg-red-100 text-red-800 hover:bg-red-200'
                              }`}
                            >
                              {product.is_active ? 'Active' : 'Inactive'}
                            </button>
                          </td>
                          <td className="p-4">
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleEditProduct(product)}
                                className="p-2 hover:bg-gray-100 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4 text-blue-600" />
                              </button>
                              <button 
                                onClick={() => deleteProduct(product.id)}
                                className="p-2 hover:bg-gray-100 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <Pagination
                  currentPage={productPage}
                  totalItems={filteredProducts.length}
                  itemsPerPage={productsPerPage}
                  onPageChange={setProductPage}
                />
                
                {paginatedProducts.length < filteredProducts.length && (
                  <div className="text-center py-4 border-t">
                    <button
                      onClick={loadMoreData}
                      disabled={loadingMore}
                      className="px-4 py-2 text-premium-gold hover:text-premium-burgundy font-medium disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <Loader className="h-5 w-5 animate-spin mx-auto" />
                      ) : (
                        `Load More (${filteredProducts.length - paginatedProducts.length} remaining)`
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'combos' && (
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">All Combos ({filteredCombos.length})</h2>
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search combos..."
                    className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-premium-gold w-full"
                  />
                </div>
                <button
                  onClick={() => setShowComboManager(true)}
                  className="flex items-center justify-center space-x-2 px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Combo</span>
                </button>
              </div>
            </div>
            
            {filteredCombos.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No combos created yet</p>
                <button
                  onClick={() => setShowComboManager(true)}
                  className="mt-4 px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy"
                >
                  Create Your First Combo
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-4">Image</th>
                        <th className="text-left p-4">
                          <SortButton
                            field="name"
                            currentField={comboSortField}
                            direction={comboSortDirection}
                            onSort={(field: string) => {
                              if (comboSortField === field) {
                                setComboSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                              } else {
                                setComboSortField(field as any);
                                setComboSortDirection('asc');
                              }
                            }}
                          >
                            Name
                          </SortButton>
                        </th>
                        <th className="text-left p-4">Products</th>
                        <th className="text-left p-4">
                          <SortButton
                            field="price"
                            currentField={comboSortField}
                            direction={comboSortDirection}
                            onSort={(field: string) => {
                              if (comboSortField === field) {
                                setComboSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                              } else {
                                setComboSortField(field as any);
                                setComboSortDirection('asc');
                              }
                            }}
                          >
                            Price
                          </SortButton>
                        </th>
                        <th className="text-left p-4">
                          <SortButton
                            field="status"
                            currentField={comboSortField}
                            direction={comboSortDirection}
                            onSort={(field: string) => {
                              if (comboSortField === field) {
                                setComboSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                              } else {
                                setComboSortField(field as any);
                                setComboSortDirection('asc');
                              }
                            }}
                          >
                            Status
                          </SortButton>
                        </th>
                        <th className="text-left p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCombos.map((combo) => {
                        const comboProducts = combo.combo_products || [];
                        const totalValue = comboProducts.reduce(
                          (sum: number, cp: ComboProduct) => 
                            sum + (cp.product?.price || 0) * (cp.quantity || 1), 
                          0
                        );
                        
                        const discountedPrice = combo.discount_percentage 
                          ? totalValue * (1 - combo.discount_percentage / 100)
                          : combo.discount_price || totalValue;

                        // Get unique genders from combo products
                        const genders = [...new Set(
                          comboProducts
                            .map(cp => cp.product?.gender)
                            .filter(Boolean)
                        )];

                        return (
                          <tr key={combo.id} className="border-b hover:bg-gray-50">
                            <td className="p-4">
                              <img
                                src={getImageUrl(combo.image_url)}
                                alt={combo.name}
                                className="w-16 h-16 object-cover rounded-lg"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=200&h=200&fit=crop';
                                }}
                              />
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="font-medium">{combo.name}</p>
                                <p className="text-sm text-gray-600 line-clamp-2">{combo.description}</p>
                                {combo.discount_percentage && (
                                  <span className="inline-block mt-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                                    {combo.discount_percentage}% OFF
                                  </span>
                                )}
                                {genders.length > 0 && (
                                  <div className="flex gap-1 mt-2">
                                    {genders.map(gender => (
                                      <span key={gender} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs capitalize">
                                        {gender}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex -space-x-2">
                                {comboProducts.slice(0, 4).map((cp: ComboProduct, idx: number) => (
                                  <div key={idx} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
                                    <img 
                                      src={getImageUrl(cp.product?.image_url)} 
                                      alt={cp.product?.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.src = 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=100&h=100&fit=crop';
                                      }}
                                    />
                                  </div>
                                ))}
                                {comboProducts.length > 4 && (
                                  <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-800 text-white text-xs flex items-center justify-center">
                                    +{comboProducts.length - 4}
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-2">
                                {comboProducts.length} products
                              </p>
                            </td>
                            <td className="p-4">
                              <div>
                                {combo.discount_percentage && (
                                  <p className="text-sm text-gray-500 line-through">
                                    {formatCurrency(totalValue)}
                                  </p>
                                )}
                                <p className="font-semibold text-premium-gold">
                                  {formatCurrency(discountedPrice)}
                                </p>
                              </div>
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => toggleComboStatus(combo)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                  combo.is_active 
                                    ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                                }`}
                              >
                                {combo.is_active ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                            <td className="p-4">
                              <div className="flex space-x-2">
                                <button 
                                  onClick={() => handleEditCombo(combo)}
                                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4 text-blue-600" />
                                </button>
                                <button 
                                  onClick={() => deleteCombo(combo.id)}
                                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                <Pagination
                  currentPage={comboPage}
                  totalItems={filteredCombos.length}
                  itemsPerPage={combosPerPage}
                  onPageChange={setComboPage}
                />
                
                {paginatedCombos.length < filteredCombos.length && (
                  <div className="text-center py-4 border-t">
                    <button
                      onClick={loadMoreData}
                      disabled={loadingMore}
                      className="px-4 py-2 text-premium-gold hover:text-premium-burgundy font-medium disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <Loader className="h-5 w-5 animate-spin mx-auto" />
                      ) : (
                        `Load More (${filteredCombos.length - paginatedCombos.length} remaining)`
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'coupons' && <CouponManager />}
        {activeTab === 'categories' && <CategoryManager />}
        {activeTab === 'reviews' && <ReviewManager />}
        {activeTab === 'hero' && <HeroManager />}
        {activeTab === 'popups' && <PopupManager />}
        {activeTab === 'logo' && <LogoManager />}
      </div>

      {/* Order Details Modal with Customization Display */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-serif font-semibold">Order Details</h2>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Customer Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-600">Name</label>
                      <p className="font-medium">{selectedOrder.customer_name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Email</label>
                      <p className="font-medium">{selectedOrder.customer_email}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Phone</label>
                      <p className="font-medium">{selectedOrder.customer_phone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Order Date</label>
                      <p className="font-medium">
                        {new Date(selectedOrder.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold mt-8 mb-4">Shipping Address</h3>
                  <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
                    <p className="font-medium">{selectedOrder.customer_name}</p>
                    <p>{selectedOrder.shipping_address || 'Address not provided'}</p>
                    <p>{selectedOrder.shipping_city}, {selectedOrder.shipping_state} - {selectedOrder.shipping_pincode}</p>
                    <p>{selectedOrder.shipping_country || 'India'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Order Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-600">Order ID</label>
                      <p className="font-mono font-medium">{selectedOrder.id}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Payment ID</label>
                      <p className="font-mono font-medium">{selectedOrder.razorpay_payment_id || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Status</label>
                      <select
                        value={selectedOrder.status}
                        onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                        className={`px-4 py-2 rounded-lg border ${getStatusColor(selectedOrder.status)} focus:outline-none`}
                      >
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="paid">Paid</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Tracking Number</label>
                      <input
                        type="text"
                        placeholder="Enter tracking number"
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-premium-gold"
                        value={selectedOrder.tracking_number || ''}
                        onChange={(e) => updateOrderStatus(selectedOrder.id, selectedOrder.status, e.target.value)}
                      />
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold mt-8 mb-4">Order Items</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {Array.isArray(selectedOrder.items) ? (
                      selectedOrder.items.map((item: any, idx: number) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img
                                src={getImageUrl(item.image_url)}
                                alt={item.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                              <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-gray-600">
                                  Qty: {item.quantity} × {formatCurrency(item.price)}
                                </p>
                                {item.gender && (
                                  <p className="text-xs text-gray-500 capitalize">
                                    For: {item.gender}
                                  </p>
                                )}
                              </div>
                            </div>
                            <p className="font-semibold">
                              {formatCurrency(item.price * item.quantity)}
                            </p>
                          </div>
                          
                          {/* Show customization data if exists */}
                          {item.customization && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                <ImageIcon className="h-4 w-4" />
                                Customization:
                              </p>
                              {item.customization.text && (
                                <div className="flex items-center gap-2 mb-2 bg-white p-2 rounded-lg border">
                                  <span className="text-xs text-gray-500">Text:</span>
                                  <code className="bg-gray-100 px-3 py-1.5 rounded text-sm font-mono flex-1">
                                    {item.customization.text}
                                  </code>
                                  <button
                                    onClick={() => copyToClipboard(item.customization.text)}
                                    className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                                    title="Copy text"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </button>
                                  {copySuccess === item.customization.text && (
                                    <span className="text-xs text-green-600">Copied!</span>
                                  )}
                                </div>
                              )}
                              {item.customization.image_url && (
                                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border">
                                  <span className="text-xs text-gray-500">Image:</span>
                                  <a
                                    href={item.customization.image_url}
                                    download
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                                  >
                                    <Download className="h-4 w-4" />
                                    <span className="text-sm">Download</span>
                                  </a>
                                  <a
                                    href={item.customization.image_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 hover:bg-gray-100 rounded"
                                    title="View"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">No items data</p>
                    )}
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <div className="flex justify-between text-xl font-bold">
                      <span>Total Amount</span>
                      <span className="text-premium-gold">
                        {formatCurrency(selectedOrder.total_amount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t flex flex-wrap gap-3 justify-end">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => generateInvoice(selectedOrder)}
                  className="px-6 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy flex items-center"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Generate Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInvoice && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-serif font-semibold">Invoice Preview</h2>
                <div className="flex space-x-3">
                  <button
                    onClick={printInvoice}
                    className="flex items-center space-x-2 px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print</span>
                  </button>
                  <button onClick={() => setShowInvoice(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div id="invoice-content">
                <InvoicePDF order={selectedOrder} />
              </div>
            </div>
          </div>
        </div>
      )}

      {showProductUpload && (
        <ProductUpload 
          onClose={() => setShowProductUpload(false)} 
          onSuccess={() => {
            setShowProductUpload(false);
            fetchDashboardData();
          }}
        />
      )}

      {showEditProduct && editingProduct && (
        <EditProduct 
          product={editingProduct}
          onClose={() => {
            setShowEditProduct(false);
            setEditingProduct(null);
          }} 
          onSuccess={() => {
            setShowEditProduct(false);
            setEditingProduct(null);
            fetchDashboardData();
          }}
        />
      )}

      {showComboManager && (
        <ComboManager 
          combo={editingCombo}
          onClose={() => {
            setShowComboManager(false);
            setEditingCombo(null);
          }} 
          onSuccess={() => {
            setShowComboManager(false);
            setEditingCombo(null);
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
};

export default AdminPanel;