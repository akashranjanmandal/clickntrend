import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/helpers';
import { CONFIG } from '../config';
import { Wallet, Truck, Tag, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
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
  const [couponLoading, setCouponLoading] = useState(false);

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

  /* ---------------- CALCULATIONS ---------------- */
  const subtotal = total;
  const shippingCharge = subtotal > 499 ? 0 : 79;
  const codCharge = paymentMethod === 'cod' ? 49 : 0;
  const grandTotal = Math.max(
    subtotal + shippingCharge + codCharge - couponDiscount,
    0
  );

  /* ---------------- HELPERS ---------------- */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const required = ['name', 'email', 'phone', 'address', 'city', 'state', 'pincode'];
    for (const field of required) {
      if (!(formData as any)[field]) {
        alert(`Please fill in ${field}`);
        return false;
      }
    }
    if (!/^\d{10}$/.test(formData.phone)) {
      alert('Please enter a valid 10-digit phone number');
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      alert('Please enter a valid email address');
      return false;
    }
    if (!/^\d{6}$/.test(formData.pincode)) {
      alert('Please enter a valid 6-digit pincode');
      return false;
    }
    return true;
  };

  /* ---------------- COUPON ---------------- */
  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    setCouponLoading(true);
    setCouponError('');

    try {
      const data = await apiFetch('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: couponCode,
          subtotal,
          email: formData.email || undefined,
        }),
      });

      if (data.valid) {
        setAppliedCoupon(data.coupon);
        setCouponDiscount(data.coupon.discount_amount);
      } else {
        throw new Error(data.message || 'Invalid coupon');
      }
    } catch (e: any) {
      setCouponError(e.message || 'Error validating coupon');
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

  /* ---------------- COD ---------------- */
  const handleCODOrder = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      await apiFetch('/api/orders/cod', {
        method: 'POST',
        body: JSON.stringify({
          items,
          subtotal,
          shipping_charge: shippingCharge,
          cod_charge: codCharge,
          coupon_code: appliedCoupon?.code,
          coupon_discount: couponDiscount,
          total_amount: grandTotal,
          payment_method: 'cod',
          ...formData,
        }),
      });

      alert('Order placed successfully!');
      clearCart();
      navigate('/');
    } catch {
      alert('Failed to place order. Please try again.');
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
        throw new Error('Razorpay SDK failed to load');
      }

      const orderData = await apiFetch('/api/payment/create-order', {
        method: 'POST',
        body: JSON.stringify({
          amount: grandTotal,
          currency: 'INR',
          receipt: `receipt_${Date.now()}`,
        }),
      });

      const razorpay = new window.Razorpay({
        key: CONFIG.RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.id,
        name: 'GFTD',
        description: 'Premium Gift Purchase',
        handler: async (res: any) => {
          try {
            const verify = await apiFetch('/api/payment/verify-payment', {
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
                  ...formData,
                },
              }),
            });

            if (verify.success) {
              alert('🎉 Payment successful! Order confirmed.');
              clearCart();
              navigate('/');
            } else {
              alert('Payment verification failed.');
            }
          } catch {
            alert('Payment verification failed.');
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
        theme: { color: '#D4AF37' },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });

      razorpay.open();
    } catch (e: any) {
      alert(e.message || 'Payment failed');
    } finally {
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
        <h1 className="text-3xl font-serif font-bold mb-4">Your cart is empty</h1>
        <button
          onClick={() => navigate('/products')}
          className="px-6 py-3 bg-premium-gold text-white rounded-lg"
        >
          Browse Products
        </button>
      </div>
    );
  }

  /* ---------------- UI (UNCHANGED) ---------------- */
 return (
    <div className="container mx-auto px-4 py-6 md:py-12">
      <div className="max-w-6xl mx-auto">
        {/* Back Button - Mobile Only */}
        <button
          onClick={() => navigate('/cart')}
          className="flex items-center text-gray-600 mb-4 md:hidden"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          Back to Cart
        </button>

        <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold mb-6 md:mb-8 text-center">
          Secure <span className="text-premium-gold">Checkout</span>
        </h1>

        <div className="grid lg:grid-cols-2 gap-6 md:gap-8">
          {/* Order Summary - Mobile First */}
          <div className="order-2 lg:order-1">
            <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 sticky top-20">
              <h2 className="text-xl md:text-2xl font-serif font-semibold mb-4 md:mb-6">Order Summary</h2>
              
              {/* Items List - Mobile Optimized */}
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

              {/* Price Breakdown - Mobile Optimized */}
              <div className="space-y-2 md:space-y-3 pt-3 md:pt-4 border-t">
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm md:text-base">
                  <span className="text-gray-600">Shipping:</span>
                  <span className={shippingCharge === 0 ? 'text-green-600 font-medium' : ''}>
                    {shippingCharge === 0 ? 'FREE' : formatCurrency(shippingCharge)}
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

          {/* Customer Details Form - Mobile First */}
          <div className="order-1 lg:order-2">
            <div className="bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6">
              <h2 className="text-xl md:text-2xl font-serif font-semibold mb-4 md:mb-6">Shipping Details</h2>
              
              <div className="space-y-3 md:space-y-4">
                {/* Name & Email - Stack on Mobile */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2">Full Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    maxLength={10}
                    className="w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none"
                    placeholder="10-digit mobile number"
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2">Address *</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    rows={2}
                    className="w-full px-3 md:px-4 py-2 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none"
                    placeholder="House no, Street, Area"
                  />
                </div>

                {/* City, State, Pincode - Stack on Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2">City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 md:px-4 py-2 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none"
                      placeholder="City"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2">State *</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 md:px-4 py-2 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none"
                      placeholder="State"
                    />
                  </div>

                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2">Pincode *</label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleInputChange}
                      required
                      maxLength={6}
                      className="w-full px-3 md:px-4 py-2 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none"
                      placeholder="6-digit pincode"
                    />
                  </div>
                </div>

                {/* Coupon Section - Mobile Optimized */}
                <div className="border-t pt-3 md:pt-4 mt-3 md:mt-4">
                  <h3 className="font-medium mb-2 md:mb-3 flex items-center text-sm md:text-base">
                    <Tag className="h-4 w-4 mr-2" />
                    Apply Coupon
                  </h3>
                  
                  {appliedCoupon ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
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
                  ) : (
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
                        className="px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy disabled:opacity-50 text-sm md:text-base whitespace-nowrap"
                      >
                        {couponLoading ? '...' : 'Apply'}
                      </button>
                    </div>
                  )}
                  {couponError && (
                    <p className="text-red-600 text-xs mt-2">{couponError}</p>
                  )}
                </div>

                {/* Payment Method - Mobile Optimized */}
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
                          : 'border-gray-200 hover:border-premium-gold'
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
                          : 'border-gray-200 hover:border-premium-gold'
                      }`}
                    >
                      <p className="font-medium text-sm md:text-base">Cash on Delivery</p>
                      <p className="text-xs text-gray-600">Pay ₹49 at delivery</p>
                    </button>
                  </div>
                </div>

                {/* Special Requests */}
                <div>
                  <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2">Special Requests</label>
                  <textarea
                    name="specialRequests"
                    value={formData.specialRequests}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 md:px-4 py-2 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none"
                    placeholder="Gift wrapping, delivery instructions, etc."
                  />
                </div>

                {/* Submit Button */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  className={`w-full py-3 md:py-4 rounded-lg font-medium text-base md:text-lg transition-all mt-4 ${
                    loading 
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : 'bg-premium-gold hover:bg-premium-burgundy text-white hover:scale-[1.02]'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Processing...
                    </div>
                  ) : (
                    `Place Order • ${formatCurrency(grandTotal)}`
                  )}
                </button>

                {/* Shipping Info */}
                <div className="space-y-2 mt-4 text-xs md:text-sm text-gray-600">
                  <p className="flex items-center">
                    <Truck className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>Free shipping on orders above ₹499</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    By placing this order, you agree to our terms and conditions
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