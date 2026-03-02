import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/helpers';
import { CONFIG } from '../config';
import { Wallet, Truck, Tag, CheckCircle, XCircle, ArrowLeft, ShoppingBag, Gift, AlertCircle, Sparkles, Smile, Frown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/apiFetch';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Checkout: React.FC = () => {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const [formData, setFormData] = useState({
    customer_name: '', // Changed from 'name' to match backend
    customer_email: '', // Changed from 'email' to match backend
    customer_phone: '', // Changed from 'phone' to match backend
    shipping_address: '', // New field for full address
    city: '',
    state: '',
    pincode: '',
    special_requests: '', // Changed from 'specialRequests' to match backend
  });

  /* ---------------- CALCULATIONS ---------------- */
  const subtotal = total;
  const FREE_SHIPPING_THRESHOLD = 499;
  const shippingCharge = subtotal > FREE_SHIPPING_THRESHOLD ? 0 : 79;
  const codCharge = paymentMethod === 'cod' ? 49 : 0;
  const grandTotal = Math.max(
    subtotal + shippingCharge + codCharge - couponDiscount,
    0
  );

  const amountToFreeShipping = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);
  const shippingProgress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);

  /* ---------------- HELPERS ---------------- */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field-specific errors when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    // Build full shipping address
    const fullAddress = `${formData.shipping_address}, ${formData.city}, ${formData.state} - ${formData.pincode}`;
    setFormData(prev => ({ ...prev, shipping_address: fullAddress }));

    // Validate each field
    if (!formData.customer_name?.trim()) {
      errors.customer_name = "Oops! We need your name to personalize your gift box 🎁";
    }
    if (!formData.customer_email?.trim()) {
      errors.customer_email = "Email is required for order updates 📧";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.customer_email)) {
      errors.customer_email = "That email doesn't look quite right 🤔";
    }
    if (!formData.customer_phone?.trim()) {
      errors.customer_phone = "Phone number needed for delivery updates 📱";
    } else if (!/^\d{10}$/.test(formData.customer_phone)) {
      errors.customer_phone = "Please enter a valid 10-digit mobile number 📞";
    }
    if (!formData.shipping_address?.trim()) {
      errors.shipping_address = "Where should we send your goodies? 🏠";
    }
    if (!formData.city?.trim()) {
      errors.city = "City name is missing 🌆";
    }
    if (!formData.state?.trim()) {
      errors.state = "Which state are we shipping to? 🗺️";
    }
    if (!formData.pincode?.trim()) {
      errors.pincode = "Pincode helps us deliver faster 📮";
    } else if (!/^\d{6}$/.test(formData.pincode)) {
      errors.pincode = "Pincode should be 6 digits 🔢";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /* ---------------- COUPON ---------------- */
  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Hey! Don\'t forget to enter a coupon code ✨');
      return;
    }

    setCouponLoading(true);
    setCouponError('');
    setCouponSuccess('');

    try {
      const data = await apiFetch('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: couponCode,
          subtotal,
          email: formData.customer_email || undefined,
        }),
      });

      if (data.valid) {
        setAppliedCoupon(data.coupon);
        setCouponDiscount(data.coupon.discount_amount);
        setCouponSuccess(`🎉 Yay! ${data.coupon.code} applied successfully! You saved ₹${data.coupon.discount_amount}`);
        setCouponError('');
      } else {
        throw new Error(data.message || 'Hmm, this coupon doesn\'t seem to work 🤔');
      }
    } catch (e: any) {
      // Parse error message if it's from the API
      let errorMessage = e.message || 'Something went wrong. Please try again!';
      
      // Make error messages friendly
      if (errorMessage.includes('expired')) {
        errorMessage = 'This coupon has expired 😢 But don\'t worry, we have more coming!';
      } else if (errorMessage.includes('Invalid')) {
        errorMessage = 'Oops! That coupon code doesn\'t exist. Want to try another? ✨';
      }
      
      setCouponError(errorMessage);
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
    setCouponSuccess('');
  };

  /* ---------------- EXTRACT ORDER ID ---------------- */
  const extractOrderId = (response: any): string | null => {
    if (!response) return null;
    
    console.log('Extracting order ID from:', response);
    
    const patterns = [
      response.order_id,
      response.orderId,
      response.id,
      response.ID,
      response.data?.order_id,
      response.data?.orderId,
      response.data?.id,
      response.data?.order?.id,
      response.order?.id,
      response.result?.order_id,
      response.result?.id,
      response.data?.data?.order_id,
      response.body?.order_id
    ];
    
    for (const pattern of patterns) {
      if (pattern && typeof pattern === 'string') {
        console.log('Found order ID:', pattern);
        return pattern;
      }
    }
    
    if (typeof response === 'string') {
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(response)) {
        return response;
      }
    }
    
    return null;
  };

  /* ---------------- SUCCESS HANDLER ---------------- */
  const handleOrderSuccess = (response: any) => {
    console.log('Processing order success with response:', response);
    
    const orderId = extractOrderId(response);
    
    if (orderId) {
      console.log('✅ Order placed successfully! Order ID:', orderId);
      clearCart();
      
      setTimeout(() => {
        navigate(`/order-confirmation?orderId=${orderId}`);
      }, 100);
    } else {
      console.error('❌ No order ID found in response:', response);
      alert('Order placed but we couldn\'t get the order ID. Please check your email for confirmation! 📧');
      clearCart();
      navigate('/');
    }
  };

  /* ---------------- COD ---------------- */
  const handleCODOrder = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      // Build the full address
      const fullAddress = `${formData.shipping_address}, ${formData.city}, ${formData.state} - ${formData.pincode}`;

      const requestBody = {
        items,
        subtotal,
        shipping_charge: shippingCharge,
        cod_charge: codCharge,
        coupon_code: appliedCoupon?.code || null,
        coupon_discount: couponDiscount,
        total_amount: grandTotal,
        payment_method: 'cod',
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        shipping_address: fullAddress,
        special_requests: formData.special_requests || '',
      };

      console.log('Sending COD request:', requestBody);

      const response = await apiFetch('/api/orders/cod', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      console.log('COD API Response:', response);
      handleOrderSuccess(response);
      
    } catch (error: any) {
      console.error('COD Error:', error);
      
      // Parse error message
      let errorMessage = 'Something went wrong. Please try again! 😅';
      
      if (error.message) {
        try {
          const parsedError = JSON.parse(error.message);
          if (parsedError.error) {
            if (parsedError.error.includes('customer information')) {
              errorMessage = 'Hey! We need your details to process the order. Please fill all fields 📝';
            } else {
              errorMessage = parsedError.error;
            }
          }
        } catch {
          errorMessage = error.message;
        }
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- RAZORPAY ---------------- */
  const loadRazorpayScript = () =>
    new Promise<boolean>((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleOnlinePayment = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      if (!(await loadRazorpayScript())) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection! 🌐');
      }

      const fullAddress = `${formData.shipping_address}, ${formData.city}, ${formData.state} - ${formData.pincode}`;

      // Create Razorpay order
      const orderData = await apiFetch('/api/payment/create-order', {
        method: 'POST',
        body: JSON.stringify({
          amount: Math.round(grandTotal * 100),
          currency: 'INR',
          receipt: `receipt_${Date.now()}`,
          notes: {
            customer_name: formData.customer_name,
            customer_email: formData.customer_email,
            customer_phone: formData.customer_phone,
          }
        }),
      });

      console.log('Razorpay order created:', orderData);

      const razorpay = new window.Razorpay({
        key: CONFIG.RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.id,
        name: 'GFTD',
        description: 'Premium Gift Purchase',
        image: '/gift-logo.png',
        handler: async (res: any) => {
          try {
            console.log('Razorpay payment response:', res);
            
            const verifyResponse = await apiFetch('/api/payment/verify-payment', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: res.razorpay_order_id,
                razorpay_payment_id: res.razorpay_payment_id,
                razorpay_signature: res.razorpay_signature,
                order_data: {
                  items,
                  subtotal,
                  shipping_charge: shippingCharge,
                  coupon_code: appliedCoupon?.code,
                  coupon_discount: couponDiscount,
                  total_amount: grandTotal,
                  payment_method: 'online',
                  customer_name: formData.customer_name,
                  customer_email: formData.customer_email,
                  customer_phone: formData.customer_phone,
                  shipping_address: fullAddress,
                  special_requests: formData.special_requests,
                },
              }),
            });

            console.log('Payment verification response:', verifyResponse);
            
            if (verifyResponse.success) {
              handleOrderSuccess(verifyResponse);
            } else {
              throw new Error(verifyResponse.message || 'Payment verification failed');
            }
          } catch (error: any) {
            console.error('Payment verification error:', error);
            alert(error.message || 'Payment verification failed. Please contact support! 📞');
          }
        },
        prefill: {
          name: formData.customer_name,
          email: formData.customer_email,
          contact: formData.customer_phone,
        },
        notes: {
          address: fullAddress,
        },
        theme: { 
          color: '#D4AF37'
        },
        modal: {
          ondismiss: () => {
            console.log('Payment modal dismissed');
            setLoading(false);
          },
          confirm_close: true,
        },
      });

      razorpay.open();
    } catch (error: any) {
      console.error('Payment error:', error);
      alert(error.message || 'Failed to initialize payment. Please try again! 😅');
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (paymentMethod === 'online') {
      await handleOnlinePayment();
    } else {
      await handleCODOrder();
    }
  };

  /* ---------------- EMPTY CART ---------------- */
  if (!items.length) {
    return (
      <div className="container mx-auto px-4 py-12 md:py-20 text-center">
        <div className="max-w-md mx-auto">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-premium-cream rounded-full mb-6">
            <ShoppingBag className="h-12 w-12 text-premium-gold" />
          </div>
          <h1 className="text-3xl font-serif font-bold mb-4">Your cart is feeling lonely! 🛒</h1>
          <p className="text-gray-600 mb-8">Add some beautiful gifts to make someone's day special ✨</p>
          <button
            onClick={() => navigate('/products')}
            className="px-6 py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-12">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/cart')}
          className="flex items-center text-gray-600 mb-4 md:hidden hover:text-premium-gold transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          Back to Cart
        </button>

        <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold mb-6 md:mb-8 text-center">
          Secure <span className="text-premium-gold">Checkout</span>
        </h1>

        <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
          {/* Order Summary */}
          <div className="order-1 lg:order-1">
            <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 sticky top-20">
              <h2 className="text-xl md:text-2xl font-serif font-semibold mb-4 md:mb-6">Order Summary</h2>
              
              {/* Free Shipping Progress Bar - with friendly messages */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-700">Free Shipping</span>
                  </div>
                  {shippingCharge === 0 ? (
                    <span className="text-green-600 font-semibold flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      You're eligible! 🎉
                    </span>
                  ) : (
                    <span className="text-blue-600 font-medium">
                      Add ₹{amountToFreeShipping.toLocaleString()} more
                    </span>
                  )}
                </div>
                
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${shippingProgress}%` }}
                  />
                </div>
                
                {shippingCharge > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                      <Smile className="h-4 w-4 text-blue-500" />
                      Just ₹{amountToFreeShipping} more for FREE shipping! 
                    </p>
                    <button
                      onClick={() => navigate('/products')}
                      className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium group"
                    >
                      <ShoppingBag className="h-4 w-4 group-hover:animate-bounce" />
                      Shop ₹{amountToFreeShipping.toLocaleString()} more
                    </button>
                  </div>
                )}
              </div>
              
              {/* Items List */}
              <div className="space-y-3 md:space-y-4 mb-4 md:mb-6 max-h-[300px] md:max-h-96 overflow-y-auto">
                {items.map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b">
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-medium text-sm md:text-base line-clamp-1">{item.name}</h4>
                      <p className="text-xs md:text-sm text-gray-600">
                        Qty: {item.quantity} × {formatCurrency(item.price)}
                      </p>
                    </div>
                    <p className="font-semibold text-sm md:text-base whitespace-nowrap">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 md:space-y-3 pt-3 md:pt-4 border-t">
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-gray-600">Shipping:</span>
                  <span className={shippingCharge === 0 ? 'text-green-600 font-medium' : ''}>
                    {shippingCharge === 0 ? (
                      <span className="flex items-center gap-1">
                        <Gift className="h-4 w-4" />
                        FREE
                      </span>
                    ) : formatCurrency(shippingCharge)}
                  </span>
                </div>
                {paymentMethod === 'cod' && (
                  <div className="flex justify-between text-sm md:text-base">
                    <span className="text-gray-600">COD Charges:</span>
                    <span>{formatCurrency(codCharge)}</span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm md:text-base text-green-600">
                    <span>Coupon Discount:</span>
                    <span>-{formatCurrency(couponDiscount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base md:text-xl font-bold pt-3 border-t">
                  <span>Total:</span>
                  <span className="text-premium-gold">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Details Form */}
          <div className="order-2 lg:order-2">
            <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-serif font-semibold mb-4 md:mb-6">Shipping Details</h2>
              
              <div className="space-y-3 md:space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="customer_name"
                    value={formData.customer_name}
                    onChange={handleInputChange}
                    className={`w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none transition-colors ${
                      fieldErrors.customer_name ? 'border-red-300 bg-red-50' : ''
                    }`}
                    placeholder="Enter your full name"
                  />
                  {fieldErrors.customer_name && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.customer_name}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="customer_email"
                    value={formData.customer_email}
                    onChange={handleInputChange}
                    className={`w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none transition-colors ${
                      fieldErrors.customer_email ? 'border-red-300 bg-red-50' : ''
                    }`}
                    placeholder="Enter your email"
                  />
                  {fieldErrors.customer_email && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.customer_email}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={handleInputChange}
                    maxLength={10}
                    className={`w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none transition-colors ${
                      fieldErrors.customer_phone ? 'border-red-300 bg-red-50' : ''
                    }`}
                    placeholder="10-digit mobile number"
                  />
                  {fieldErrors.customer_phone && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.customer_phone}
                    </p>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="shipping_address"
                    value={formData.shipping_address}
                    onChange={handleInputChange}
                    rows={2}
                    className={`w-full px-3 md:px-4 py-2 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none transition-colors ${
                      fieldErrors.shipping_address ? 'border-red-300 bg-red-50' : ''
                    }`}
                    placeholder="House no, Street, Area"
                  />
                  {fieldErrors.shipping_address && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.shipping_address}
                    </p>
                  )}
                </div>

                {/* City, State, Pincode */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2">City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className={`w-full px-3 md:px-4 py-2 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none transition-colors ${
                        fieldErrors.city ? 'border-red-300 bg-red-50' : ''
                      }`}
                      placeholder="City"
                    />
                    {fieldErrors.city && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.city}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2">State *</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className={`w-full px-3 md:px-4 py-2 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none transition-colors ${
                        fieldErrors.state ? 'border-red-300 bg-red-50' : ''
                      }`}
                      placeholder="State"
                    />
                    {fieldErrors.state && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.state}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2">Pincode *</label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      maxLength={6}
                      className={`w-full px-3 md:px-4 py-2 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none transition-colors ${
                        fieldErrors.pincode ? 'border-red-300 bg-red-50' : ''
                      }`}
                      placeholder="6-digit pincode"
                    />
                    {fieldErrors.pincode && (
                      <p className="text-red-500 text-xs mt-1">{fieldErrors.pincode}</p>
                    )}
                  </div>
                </div>

                {/* Coupon Section */}
                <div className="border-t pt-3 md:pt-4 mt-3 md:mt-4">
                  <h3 className="font-medium mb-2 md:mb-3 flex items-center text-sm md:text-base">
                    <Tag className="h-4 w-4 mr-2" />
                    Got a coupon? 🏷️
                  </h3>
                  
                  {appliedCoupon ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0">
                          <CheckCircle className="h-5 w-5 text-green-600 mr-2 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-green-800 text-sm md:text-base truncate">{appliedCoupon.code}</p>
                            <p className="text-xs md:text-sm text-green-600">
                              {appliedCoupon.discount_type === 'percentage' 
                                ? `${appliedCoupon.discount_value}% off`
                                : `₹${appliedCoupon.discount_value} off`}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={removeCoupon}
                          className="text-red-600 hover:text-red-800 flex-shrink-0 ml-2"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>
                      {couponSuccess && (
                        <p className="text-green-600 text-xs mt-2 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {couponSuccess}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          placeholder="Enter coupon code"
                          className="flex-1 px-3 md:px-4 py-2 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none"
                        />
                        <button
                          onClick={validateCoupon}
                          disabled={couponLoading}
                          className="px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy disabled:opacity-50 text-sm md:text-base whitespace-nowrap transition-colors"
                        >
                          {couponLoading ? 'Checking...' : 'Apply'}
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-red-600 text-xs mt-2 flex items-center gap-1">
                          <Frown className="h-3 w-3" />
                          {couponError}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Payment Method */}
                <div className="border-t pt-3 md:pt-4 mt-3 md:mt-4">
                  <h3 className="font-medium mb-2 md:mb-3 flex items-center text-sm md:text-base">
                    <Wallet className="h-4 w-4 mr-2" />
                    Payment Method
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('online')}
                      className={`p-3 border rounded-lg text-left transition-all ${
                        paymentMethod === 'online'
                          ? 'border-premium-gold bg-premium-gold/5 ring-2 ring-premium-gold/20'
                          : 'border-gray-200 hover:border-premium-gold hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-medium text-sm md:text-base">Pay Online</p>
                      <p className="text-xs text-gray-600">Cards, UPI, NetBanking</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cod')}
                      className={`p-3 border rounded-lg text-left transition-all ${
                        paymentMethod === 'cod'
                          ? 'border-premium-gold bg-premium-gold/5 ring-2 ring-premium-gold/20'
                          : 'border-gray-200 hover:border-premium-gold hover:bg-gray-50'
                      }`}
                    >
                      <p className="font-medium text-sm md:text-base">Cash on Delivery</p>
                      <p className="text-xs text-gray-600">Pay ₹49 at delivery</p>
                    </button>
                  </div>
                </div>

                {/* Special Requests */}
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2">
                    Special Requests <span className="text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    name="special_requests"
                    value={formData.special_requests}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 md:px-4 py-2 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none"
                    placeholder="Gift wrapping, delivery instructions, birthday message, etc. 🎁"
                  />
                </div>

                {/* Submit Button */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  className={`w-full py-3 md:py-4 rounded-lg font-medium text-base md:text-lg transition-all mt-4 ${
                    loading 
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-premium-gold to-premium-burgundy text-white hover:scale-[1.02] shadow-lg hover:shadow-xl'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Processing your order...
                    </div>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Place Order • {formatCurrency(grandTotal)}
                      <Sparkles className="h-5 w-5" />
                    </span>
                  )}
                </button>

                {/* Shipping Info */}
                <div className="space-y-2 mt-4 text-xs md:text-sm text-gray-600">
                  <p className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-green-600" />
                    <span>Free shipping on orders above ₹499</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Gift className="h-4 w-4 text-premium-gold" />
                    <span>Secure checkout • 100% safe payment</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-3">
                    By placing this order, you agree to our terms and conditions 📋
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;