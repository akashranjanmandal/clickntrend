import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, Truck, CheckCircle, Clock, XCircle, 
  Search, Mail, Phone, MapPin, Calendar, Copy 
} from 'lucide-react';
import { apiFetch } from '../config';
import { Order } from '../types';
import { formatCurrency } from '../utils/helpers';

const OrderTracking: React.FC = () => {
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  const trackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim() || !phone.trim()) {
      setError('Please enter both Order ID and Phone Number');
      return;
    }

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      // Encode the orderId to handle special characters like #
      const encodedOrderId = encodeURIComponent(orderId);
      const data = await apiFetch(`/api/orders/track?orderId=${encodedOrderId}&phone=${phone}`);
      setOrder(data);
    } catch (err: any) {
      setError(err.message || 'Order not found. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(text);
    setTimeout(() => setCopySuccess(''), 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'shipped':
        return <Truck className="h-8 w-8 text-blue-600" />;
      case 'processing':
      case 'paid':
        return <Package className="h-8 w-8 text-purple-600" />;
      case 'cancelled':
        return <XCircle className="h-8 w-8 text-red-600" />;
      default:
        return <Clock className="h-8 w-8 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'text-green-600';
      case 'shipped': return 'text-blue-600';
      case 'processing':
      case 'paid': return 'text-purple-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-serif font-bold text-center mb-4">
          Track Your <span className="text-premium-gold">Order</span>
        </h1>
        <p className="text-center text-gray-600 mb-12">
          Enter your Order ID and Phone Number to check status
        </p>

        {/* Search Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <form onSubmit={trackOrder} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Order ID *</label>
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g., GFTD#101"
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter your order ID (e.g., GFTD#101)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                  required
                  maxLength={10}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-premium-gold text-white rounded-xl hover:bg-premium-burgundy transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Tracking...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  Track Order
                </>
              )}
            </button>
          </form>
        </div>

        {/* Order Details */}
        {order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-serif font-semibold">Order Details</h2>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-sm text-gray-600">Order ID:</p>
                  <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono">
                    {order.custom_order_id || order.id}
                  </code>
                  <button
                    onClick={() => copyToClipboard(order.custom_order_id || order.id)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Copy Order ID"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  {copySuccess === (order.custom_order_id || order.id) && (
                    <span className="text-xs text-green-600">Copied!</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(order.status)}
                <span className={`font-semibold capitalize ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
            </div>

            {/* Order Info */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700">Customer Information</h3>
                <p className="flex items-center gap-2 text-gray-600">
                  <span className="font-medium">Name:</span> {order.customer_name}
                </p>
                <p className="flex items-center gap-2 text-gray-600">
                  <Mail className="h-4 w-4" />
                  {order.customer_email}
                </p>
                <p className="flex items-center gap-2 text-gray-600">
                  <Phone className="h-4 w-4" />
                  {order.customer_phone}
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700">Shipping Address</h3>
                <p className="flex items-start gap-2 text-gray-600">
                  <MapPin className="h-4 w-4 mt-1 flex-shrink-0" />
                  <span>
                    {order.shipping_address}<br />
                    {order.shipping_city}, {order.shipping_state} - {order.shipping_pincode}
                  </span>
                </p>
              </div>
            </div>

            {/* Order Items */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-4">Order Items</h3>
              <div className="space-y-3">
                {Array.isArray(order.items) && order.items.map((item: any, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="font-semibold">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary */}
            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total Amount</span>
                <span className="text-premium-gold">
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Ordered on: {new Date(order.created_at).toLocaleDateString()}
              </p>
              {order.tracking_number && (
                <p className="text-sm text-gray-500 mt-1">
                  Tracking #: {order.tracking_number}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;