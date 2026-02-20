import React, { useState, useEffect } from 'react';
import { 
  LogOut, Package, DollarSign, TrendingUp, Eye, 
  RefreshCw, Plus, Edit, Trash2, Download, Search,
  ShoppingBag, MapPin, Phone, Mail, Calendar,
  BarChart3, Shield, Printer, XCircle
} from 'lucide-react';
import { Order, Product, Combo } from '../../types';
import CategoryManager from './CategoryManager';
import { formatCurrency, getImageUrl } from '../../utils/helpers';
import ProductUpload from './ProductUpload';
import ComboManager from './ComboManager';
import EditProduct from './EditProduct';
import InvoicePDF from './InvoicePDF';
import CouponManager from './CouponManager';
import { useApi } from '../../hooks/useApi';
import { Tag } from 'lucide-react';

const AdminPanel: React.FC = () => {
  const { fetchWithAuth } = useApi();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'products' | 'combos' | 'coupons' | 'categories'>('dashboard');
  const [showProductUpload, setShowProductUpload] = useState(false);
  const [showComboManager, setShowComboManager] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  
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

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredOrders(orders);
      setFilteredProducts(products);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredOrders(
        orders.filter(order => 
          order.customer_name.toLowerCase().includes(query) ||
          order.customer_email.toLowerCase().includes(query) ||
          order.id.toLowerCase().includes(query) ||
          (order.customer_phone && order.customer_phone.includes(query))
        )
      );
      setFilteredProducts(
        products.filter(product => 
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, orders, products]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [ordersData, productsData, combosData] = await Promise.all([
        fetchWithAuth('/api/admin/orders'),
        fetchWithAuth('/api/admin/products'),
        fetchWithAuth('/api/admin/combos'),
      ]);

      setOrders(ordersData);
      setFilteredOrders(ordersData);
      setProducts(productsData);
      setFilteredProducts(productsData);
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

  const exportOrdersCSV = () => {
    const csvData = orders.map(order => ({
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
              
              <div className="hidden md:flex space-x-1 ml-8">
                {[
                  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                  { id: 'orders', label: 'Orders', icon: Package },
                  { id: 'products', label: 'Products', icon: ShoppingBag },
                  { id: 'combos', label: 'Combos', icon: Package },
                  { id: 'coupons', label: 'Coupons', icon: Tag },
                  { id: 'categories', label: 'Categories', icon: Tag },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-premium-gold text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
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
              {['dashboard', 'orders', 'products', 'combos', 'coupons', 'categories'].map((tab) => (
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
                      <th className="text-left p-4">Date</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.slice(0, 5).map((order) => (
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
                    ))}
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-4">Order ID</th>
                      <th className="text-left p-4">Customer</th>
                      <th className="text-left p-4">Contact</th>
                      <th className="text-left p-4">Amount</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Date</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
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
                        <td className="p-4">
                          <div className="space-y-1">
                            <p className="text-sm flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {order.customer_email}
                            </p>
                            <p className="text-sm flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {order.customer_phone || 'N/A'}
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
                    ))}
                  </tbody>
                </table>
              </div>
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-4">Image</th>
                      <th className="text-left p-4">Name</th>
                      <th className="text-left p-4">Category</th>
                      <th className="text-left p-4">Price</th>
                      <th className="text-left p-4">Stock</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
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
            )}
          </div>
        )}

        {activeTab === 'combos' && (
          <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">All Combos ({combos.length})</h2>
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
            
            {combos.length === 0 ? (
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-4">Image</th>
                      <th className="text-left p-4">Name</th>
                      <th className="text-left p-4">Products</th>
                      <th className="text-left p-4">Price</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combos.map((combo) => {
                      const totalValue = combo.combo_products?.reduce((sum, cp) => 
                        sum + (cp.product?.price || 0) * (cp.quantity || 1), 0) || 0;
                      
                      const discountedPrice = combo.discount_percentage 
                        ? totalValue * (1 - combo.discount_percentage / 100)
                        : combo.discount_price || totalValue;

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
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex -space-x-2">
                              {combo.combo_products?.slice(0, 4).map((cp, idx) => (
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
                              {combo.combo_products && combo.combo_products.length > 4 && (
                                <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-800 text-white text-xs flex items-center justify-center">
                                  +{combo.combo_products.length - 4}
                                </div>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              {combo.combo_products?.length || 0} products
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
            )}
          </div>
        )}

        {activeTab === 'coupons' && <CouponManager />}
        {activeTab === 'categories' && <CategoryManager />}
      </div>

      {/* Modals */}
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
                  <div className="space-y-3">
                    {Array.isArray(selectedOrder.items) ? (
                      selectedOrder.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-semibold">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
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
          onClose={() => setShowComboManager(false)} 
          onSuccess={() => {
            setShowComboManager(false);
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
};

export default AdminPanel;