import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/helpers';
import { CONFIG } from '../config';
import { motion } from 'framer-motion';
import { Wallet, Truck, Tag, CheckCircle, XCircle } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Checkout: React.FC = () => {
  const { items, total, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    specialRequests: '',
  });

  // Calculate charges
  const subtotal = total;
  const shippingCharge = subtotal > 499 ? 0 : 79;
  const codCharge = paymentMethod === 'cod' ? 49 : 0;
  const grandTotal = subtotal + shippingCharge + codCharge - couponDiscount;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const requiredFields = ['name', 'email', 'phone', 'address', 'city', 'state', 'pincode'];
    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData]) {
        alert(`Please fill in ${field}`);
        return false;
      }
    }
    
    // Validate phone number (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      alert('Please enter a valid 10-digit phone number');
      return false;
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      alert('Please enter a valid email address');
      return false;
    }
    
    // Validate pincode (6 digits)
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(formData.pincode)) {
      alert('Please enter a valid 6-digit pincode');
      return false;
    }

    return true;
  };

const validateCoupon = async () => {
  if (!couponCode.trim()) {
    setCouponError('Please enter a coupon code');
    return;
  }

  setCouponLoading(true);
  setCouponError('');

  try {
    console.log('Validating coupon:', couponCode);
    
    const response = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: couponCode,
        subtotal,
        email: formData.email || undefined,
      }),
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Coupon validation endpoint not found');
      }
      const errorData = await response.json();
      throw new Error(errorData.message || 'Invalid coupon');
    }
    
    const data = await response.json();
    console.log('Validation response:', data);

    if (data.valid) {
      setAppliedCoupon(data.coupon);
      setCouponDiscount(data.coupon.discount_amount);
      setCouponError('');
    } else {
      setCouponError(data.message || 'Invalid coupon');
      setAppliedCoupon(null);
      setCouponDiscount(0);
    }
  } catch (error: any) {
    console.error('Validation error:', error);
    setCouponError(error.message || 'Error validating coupon');
    setAppliedCoupon(null);
    setCouponDiscount(0);
  } finally {
    setCouponLoading(false);
  }
};

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCode('');
    setCouponError('');
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) return;

    if (paymentMethod === 'online') {
      await handleOnlinePayment();
    } else {
      await handleCODOrder();
    }
  };

  const handleCODOrder = async () => {
    setLoading(true);
    try {
      const orderData = {
        items,
        subtotal,
        shipping_charge: shippingCharge,
        cod_charge: codCharge,
        coupon_code: appliedCoupon?.code,
        coupon_discount: couponDiscount,
        total_amount: grandTotal,
        payment_method: 'cod',
        ...formData,
      };

      const response = await fetch('/api/orders/cod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (response.ok) {
        alert('Order placed successfully! You will pay ₹49 COD charges at delivery.');
        clearCart();
        window.location.href = '/';
      }
    } catch (error) {
      alert('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

const handleOnlinePayment = async () => {
  setLoading(true);
  try {
    // Validate form again
    if (!validateForm()) {
      setLoading(false);
      return;
    }

    // Ensure grandTotal is not negative
    const finalAmount = Math.max(grandTotal, 0);
    
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      throw new Error('Razorpay SDK failed to load');
    }

    // Create order
    const orderResponse = await fetch('/api/payment/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: finalAmount,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
      }),
    });

    if (!orderResponse.ok) {
      const error = await orderResponse.json();
      throw new Error(error.error || 'Failed to create order');
    }

    const orderData = await orderResponse.json();

    // Prepare order data for verification
    const orderDataForVerification = {
      items,
      subtotal,
      shipping_charge: shippingCharge,
      coupon_code: appliedCoupon?.code,
      coupon_discount: couponDiscount,
      total_amount: finalAmount,
      payment_method: 'online',
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      pincode: formData.pincode,
      specialRequests: formData.specialRequests,
    };

    console.log('Order data for verification:', orderDataForVerification);

    // Razorpay options
    const options = {
      key: CONFIG.RAZORPAY_KEY_ID,
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'LuxeGifts',
      description: 'Premium Gift Purchase',
      order_id: orderData.id,
      handler: async (response: any) => {
        try {
          // Verify payment
          const verifyResponse = await fetch('/api/payment/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_data: orderDataForVerification,
            }),
          });

          const verifyData = await verifyResponse.json();

          if (verifyData.success) {
            alert('🎉 Payment successful! Order confirmed.');
            clearCart();
            window.location.href = '/';
          } else {
            alert('Payment verification failed. Please contact support.');
          }
        } catch (error) {
          console.error('Verification error:', error);
          alert('Payment verification failed. Please contact support.');
        }
      },
      prefill: {
        name: formData.name,
        email: formData.email,
        contact: formData.phone,
      },
      notes: {
        address: `${formData.address}, ${formData.city}, ${formData.state} - ${formData.pincode}`,
      },
      theme: {
        color: '#D4AF37',
      },
      modal: {
        ondismiss: function() {
          setLoading(false);
        }
      }
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  } catch (error: any) {
    console.error('Payment error:', error);
    alert(`Payment failed: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl font-serif font-bold mb-4">Your cart is empty</h1>
        <p className="text-gray-600 mb-8">Add some gifts before checking out</p>
        <a
          href="/products"
          className="px-6 py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors"
        >
          Browse Products
        </a>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-serif font-bold mb-8 text-center">
          Secure <span className="text-premium-gold">Checkout</span>
        </h1>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h2 className="text-2xl font-serif font-semibold mb-6">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              {items.map((item, index) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex justify-between items-center py-3 border-b"
                >
                  <div>
                    <h4 className="font-medium">{item.name}</h4>
                    <p className="text-sm text-gray-600">
                      Qty: {item.quantity} × {formatCurrency(item.price)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping:</span>
                <span className={shippingCharge === 0 ? 'text-green-600 font-medium' : ''}>
                  {shippingCharge === 0 ? 'FREE' : formatCurrency(shippingCharge)}
                </span>
              </div>
              {paymentMethod === 'cod' && (
                <div className="flex justify-between">
                  <span className="text-gray-600">COD Charges:</span>
                  <span>{formatCurrency(codCharge)}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Coupon Discount:</span>
                  <span>-{formatCurrency(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold pt-3 border-t">
                <span>Grand Total:</span>
                <span className="text-premium-gold">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </motion.div>

          {/* Customer Details Form */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h2 className="text-2xl font-serif font-semibold mb-6">Shipping Details</h2>
            
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  maxLength={10}
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                  placeholder="Enter 10-digit mobile number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Address *</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  rows={2}
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                  placeholder="House no, Street, Area"
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">City *</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                    placeholder="City"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">State *</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                    placeholder="State"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Pincode *</label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    required
                    maxLength={6}
                    className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                    placeholder="6-digit pincode"
                  />
                </div>
              </div>

              {/* Coupon Section */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-3 flex items-center">
                  <Tag className="h-4 w-4 mr-2" />
                  Apply Coupon
                </h3>
                
                {appliedCoupon ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <div>
                        <p className="font-medium text-green-800">{appliedCoupon.code}</p>
                        <p className="text-sm text-green-600">
                          {appliedCoupon.discount_type === 'percentage' 
                            ? `${appliedCoupon.discount_value}% off`
                            : `₹${appliedCoupon.discount_value} off`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-red-600 hover:text-red-800"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="flex-1 px-4 py-2 border rounded-lg focus:border-premium-gold focus:outline-none"
                    />
                    <button
                      onClick={validateCoupon}
                      disabled={couponLoading}
                      className="px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy disabled:opacity-50"
                    >
                      {couponLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                )}
                {couponError && (
                  <p className="text-red-600 text-sm mt-2">{couponError}</p>
                )}
              </div>

              {/* Payment Method */}
              <div className="border-t pt-4 mt-4">
                <h3 className="font-medium mb-3 flex items-center">
                  <Wallet className="h-4 w-4 mr-2" />
                  Payment Method
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('online')}
                    className={`p-4 border rounded-lg flex items-center justify-center space-x-2 transition-all ${
                      paymentMethod === 'online'
                        ? 'border-premium-gold bg-premium-gold/5 ring-2 ring-premium-gold/20'
                        : 'border-gray-200 hover:border-premium-gold'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-medium">Pay Online</p>
                      <p className="text-sm text-gray-600">Cards, UPI, NetBanking</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-4 border rounded-lg flex items-center justify-center space-x-2 transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-premium-gold bg-premium-gold/5 ring-2 ring-premium-gold/20'
                        : 'border-gray-200 hover:border-premium-gold'
                    }`}
                  >
                    <div>
                      <p className="font-medium">Cash on Delivery</p>
                      <p className="text-sm text-gray-600">Pay ₹49 at delivery</p>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Special Requests (Optional)</label>
                <textarea
                  name="specialRequests"
                  value={formData.specialRequests}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 border rounded-lg focus:border-premium-gold focus:outline-none"
                  placeholder="Gift wrapping, delivery instructions, etc."
                />
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={loading}
                className={`w-full py-4 rounded-lg font-medium text-lg transition-all ${
                  loading 
                    ? 'bg-gray-300 cursor-not-allowed' 
                    : 'bg-premium-gold hover:bg-premium-burgundy text-white hover:scale-[1.02]'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Processing...
                  </div>
                ) : (
                  `Place Order • ${formatCurrency(grandTotal)}`
                )}
              </button>

              <div className="space-y-2 mt-4 text-sm text-gray-600">
                <p className="flex items-center">
                  <Truck className="h-4 w-4 mr-2" />
                  Free shipping on orders above ₹499
                </p>
                <p className="text-xs text-gray-500">
                  By placing this order, you agree to our terms and conditions
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;