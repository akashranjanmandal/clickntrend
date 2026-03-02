import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../utils/helpers';
import { CONFIG } from '../config';
import { Wallet, Truck, Tag, CheckCircle, XCircle, ArrowLeft, ShoppingBag, Gift, AlertCircle, Sparkles, Bug } from 'lucide-react';
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
  const [debugMode, setDebugMode] = useState(true); // Enable debug mode
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  // Try multiple field name variations
  const [formData, setFormData] = useState({
    // Name variations
    name: '',
    customer_name: '',
    full_name: '',
    userName: '',
    
    // Email variations
    email: '',
    customer_email: '',
    userEmail: '',
    
    // Phone variations
    phone: '',
    customer_phone: '',
    mobile: '',
    phoneNumber: '',
    contact: '',
    
    // Address variations
    address: '',
    customer_address: '',
    shipping_address: '',
    addressLine1: '',
    street: '',
    
    city: '',
    state: '',
    
    // Pincode variations
    pincode: '',
    zip: '',
    postal_code: '',
    zipCode: '',
    
    special_requests: '',
    notes: '',
    instructions: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    // Check if at least one name field is filled
    const hasName = formData.name || formData.customer_name || formData.full_name || formData.userName;
    if (!hasName) {
      errors.name = "Please enter your full name";
    }
    
    // Check email
    const email = formData.email || formData.customer_email || formData.userEmail;
    if (!email) {
      errors.email = "Please enter your email";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      errors.email = "Please enter a valid email address";
    }
    
    // Check phone
    const phone = formData.phone || formData.customer_phone || formData.mobile || formData.phoneNumber || formData.contact;
    if (!phone) {
      errors.phone = "Please enter your phone number";
    } else if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
      errors.phone = "Please enter a valid 10-digit phone number";
    }
    
    // Check address
    const address = formData.address || formData.customer_address || formData.shipping_address || formData.addressLine1 || formData.street;
    if (!address) {
      errors.address = "Please enter your address";
    }
    
    // Check city
    if (!formData.city) {
      errors.city = "Please enter your city";
    }
    
    // Check state
    if (!formData.state) {
      errors.state = "Please enter your state";
    }
    
    // Check pincode
    const pincode = formData.pincode || formData.zip || formData.postal_code || formData.zipCode;
    if (!pincode) {
      errors.pincode = "Please enter your pincode";
    } else if (!/^\d{6}$/.test(pincode.replace(/\D/g, ''))) {
      errors.pincode = "Please enter a valid 6-digit pincode";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Get the first non-empty value from multiple fields
  const getFirstNonEmpty = (...fields: (string | undefined)[]): string => {
    for (const field of fields) {
      if (field && field.trim()) return field.trim();
    }
    return '';
  };

  // Build complete address
  const getFullAddress = () => {
    const address = getFirstNonEmpty(
      formData.address,
      formData.customer_address,
      formData.shipping_address,
      formData.addressLine1,
      formData.street
    );
    
    const pincode = getFirstNonEmpty(
      formData.pincode,
      formData.zip,
      formData.postal_code,
      formData.zipCode
    );
    
    return `${address}, ${formData.city}, ${formData.state} - ${pincode}`;
  };

  // Prepare ALL possible field combinations
  const prepareAllRequestVariations = () => {
    const fullAddress = getFullAddress();
    const name = getFirstNonEmpty(formData.name, formData.customer_name, formData.full_name, formData.userName);
    const email = getFirstNonEmpty(formData.email, formData.customer_email, formData.userEmail);
    const phone = getFirstNonEmpty(formData.phone, formData.customer_phone, formData.mobile, formData.phoneNumber, formData.contact);
    const address = getFirstNonEmpty(formData.address, formData.customer_address, formData.shipping_address, formData.addressLine1, formData.street);
    const pincode = getFirstNonEmpty(formData.pincode, formData.zip, formData.postal_code, formData.zipCode);
    const specialRequests = getFirstNonEmpty(formData.special_requests, formData.notes, formData.instructions);

    // Common base data
    const baseData = {
      items,
      subtotal,
      shipping_charge: shippingCharge,
      cod_charge: codCharge,
      coupon_code: appliedCoupon?.code || null,
      coupon_discount: couponDiscount,
      total_amount: grandTotal,
      payment_method: paymentMethod,
    };

    // Try ALL possible field name combinations
    return {
      // Version 1: Original field names
      v1: {
        ...baseData,
        name,
        email,
        phone,
        address: fullAddress,
        city: formData.city,
        state: formData.state,
        pincode,
        special_requests: specialRequests,
      },
      
      // Version 2: customer_ prefixed
      v2: {
        ...baseData,
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
        customer_address: fullAddress,
        city: formData.city,
        state: formData.state,
        pincode,
        special_requests: specialRequests,
      },
      
      // Version 3: shipping_ prefixed
      v3: {
        ...baseData,
        shipping_name: name,
        shipping_email: email,
        shipping_phone: phone,
        shipping_address: fullAddress,
        shipping_city: formData.city,
        shipping_state: formData.state,
        shipping_pincode: pincode,
        special_requests: specialRequests,
      },
      
      // Version 4: user_ prefixed
      v4: {
        ...baseData,
        user_name: name,
        user_email: email,
        user_phone: phone,
        user_address: fullAddress,
        user_city: formData.city,
        user_state: formData.state,
        user_pincode: pincode,
        special_requests: specialRequests,
      },
      
      // Version 5: Separate fields
      v5: {
        ...baseData,
        customer: {
          name,
          email,
          phone
        },
        shipping: {
          address: fullAddress,
          city: formData.city,
          state: formData.state,
          pincode
        },
        special_requests: specialRequests,
      },
      
      // Version 6: Flat with different names
      v6: {
        ...baseData,
        full_name: name,
        email_address: email,
        mobile_number: phone,
        delivery_address: fullAddress,
        city_name: formData.city,
        state_name: formData.state,
        postal_code: pincode,
        notes: specialRequests,
      },
      
      // Version 7: billing_ prefixed
      v7: {
        ...baseData,
        billing_name: name,
        billing_email: email,
        billing_phone: phone,
        billing_address: fullAddress,
        billing_city: formData.city,
        billing_state: formData.state,
        billing_zip: pincode,
        special_instructions: specialRequests,
      },
    };
  };

  /* ---------------- COUPON ---------------- */
  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    setCouponLoading(true);
    setCouponError('');
    setCouponSuccess('');

    try {
      const email = getFirstNonEmpty(formData.email, formData.customer_email, formData.userEmail);
      
      const data = await apiFetch('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: couponCode,
          subtotal,
          email: email || undefined,
        }),
      });

      if (data.valid) {
        setAppliedCoupon(data.coupon);
        setCouponDiscount(data.coupon.discount_amount);
        setCouponSuccess(`✨ Coupon applied! You saved ₹${data.coupon.discount_amount}`);
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
    setCouponSuccess('');
  };

  /* ---------------- EXTRACT ORDER ID ---------------- */
  const extractOrderId = (response: any): string | null => {
    if (!response) return null;
    
    const patterns = [
      response.order_id,
      response.orderId,
      response.id,
      response.data?.order_id,
      response.data?.id,
    ];
    
    for (const pattern of patterns) {
      if (pattern && typeof pattern === 'string') {
        return pattern;
      }
    }
    
    return null;
  };

  /* ---------------- COD ---------------- */
  const handleCODOrder = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      // Prepare all possible request variations
      const allRequests = prepareAllRequestVariations();
      
      if (debugMode) {
        console.log('📦 All request variations:', allRequests);
      }

      // Try each version until one works
      let lastError = null;
      let successResponse = null;

      for (const [version, requestBody] of Object.entries(allRequests)) {
        try {
          console.log(`🔄 Trying ${version}...`, requestBody);
          
          const response = await apiFetch('/api/orders/cod', {
            method: 'POST',
            body: JSON.stringify(requestBody),
          });

          console.log(`✅ ${version} succeeded!`, response);
          successResponse = response;
          break;
        } catch (error: any) {
          console.log(`❌ ${version} failed:`, error.message);
          lastError = error;
          
          // If this is the last version and we're in debug mode, show all errors
          if (version === 'v7' && debugMode) {
            console.error('All versions failed. Last error:', lastError);
          }
          
          // Continue to next version
          continue;
        }
      }

      if (successResponse) {
        const orderId = extractOrderId(successResponse);
        
        if (orderId) {
          clearCart();
          navigate(`/order-confirmation?orderId=${orderId}`);
        } else {
          alert('Order placed successfully!');
          clearCart();
          navigate('/');
        }
      } else {
        throw lastError || new Error('All request versions failed');
      }
      
    } catch (error: any) {
      console.error('❌ All COD attempts failed:', error);
      
      let errorMessage = 'Failed to place order. Please try again.';
      if (error.message) {
        try {
          const parsedError = JSON.parse(error.message);
          if (parsedError.error) {
            errorMessage = parsedError.error;
            
            // Add helpful hint
            if (parsedError.error.includes('customer information')) {
              errorMessage = 'Please check all fields are filled correctly. We need your complete information.';
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
        throw new Error('Failed to load payment gateway');
      }

      const allRequests = prepareAllRequestVariations();
      const primaryRequest = allRequests.v2; // Start with customer_ prefixed version

      // Create Razorpay order
      const orderData = await apiFetch('/api/payment/create-order', {
        method: 'POST',
        body: JSON.stringify({
          amount: Math.round(grandTotal * 100),
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
            const verifyResponse = await apiFetch('/api/payment/verify-payment', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: res.razorpay_order_id,
                razorpay_payment_id: res.razorpay_payment_id,
                razorpay_signature: res.razorpay_signature,
                order_data: primaryRequest,
              }),
            });

            const orderId = extractOrderId(verifyResponse);
            
            if (verifyResponse.success && orderId) {
              clearCart();
              navigate(`/order-confirmation?orderId=${orderId}`);
            } else {
              alert('Payment verification failed. Please contact support.');
            }
          } catch (error) {
            console.error('Verification error:', error);
            alert('Payment verification failed.');
          }
        },
        prefill: {
          name: primaryRequest.customer_name,
          email: primaryRequest.customer_email,
          contact: primaryRequest.customer_phone,
        },
        notes: primaryRequest,
        theme: { color: '#D4AF37' },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });

      razorpay.open();
    } catch (e: any) {
      console.error('Payment error:', e);
      alert(e.message || 'Payment failed. Please try again.');
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

  /* ---------------- RENDER FORM FIELDS ---------------- */
  const renderField = (
    label: string,
    name: string,
    type: string = 'text',
    placeholder: string = '',
    required: boolean = true
  ) => (
    <div>
      <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          name={name}
          value={(formData as any)[name] || ''}
          onChange={handleInputChange}
          rows={2}
          className={`w-full px-3 md:px-4 py-2 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none transition-colors ${
            fieldErrors[name] ? 'border-red-300 bg-red-50' : ''
          }`}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={(formData as any)[name] || ''}
          onChange={handleInputChange}
          maxLength={type === 'tel' ? 10 : undefined}
          className={`w-full px-3 md:px-4 py-2 md:py-3 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none transition-colors ${
            fieldErrors[name] ? 'border-red-300 bg-red-50' : ''
          }`}
          placeholder={placeholder}
        />
      )}
      {fieldErrors[name] && (
        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {fieldErrors[name]}
        </p>
      )}
    </div>
  );

  /* ---------------- EMPTY CART ---------------- */
  if (!items.length) {
    return (
      <div className="container mx-auto px-4 py-12 md:py-20 text-center">
        <div className="max-w-md mx-auto">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-premium-cream rounded-full mb-6">
            <ShoppingBag className="h-12 w-12 text-premium-gold" />
          </div>
          <h1 className="text-3xl font-serif font-bold mb-4">Your cart is empty</h1>
          <p className="text-gray-600 mb-8">Add some beautiful gifts to make someone's day special</p>
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
        {/* Debug Toggle */}
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setDebugMode(!debugMode)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <Bug className="h-3 w-3" />
            {debugMode ? 'Debug Mode ON' : 'Debug Mode OFF'}
          </button>
        </div>

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
              
              {/* Free Shipping Progress Bar */}
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
                    <p className="text-sm text-gray-600 mb-2">
                      Just ₹{amountToFreeShipping} more for FREE shipping!
                    </p>
                    <button
                      onClick={() => navigate('/products')}
                      className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      <ShoppingBag className="h-4 w-4" />
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
                {/* Multiple name fields to catch all possibilities */}
                {renderField('Full Name', 'customer_name', 'text', 'Enter your full name')}
                
                {/* Email fields */}
                {renderField('Email', 'customer_email', 'email', 'Enter your email')}
                
                {/* Phone fields */}
                {renderField('Phone Number', 'customer_phone', 'tel', '10-digit mobile number')}
                
                {/* Address fields */}
                {renderField('Address', 'customer_address', 'textarea', 'House no, Street, Area')}

                {/* City, State, Pincode */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs md:text-sm font-medium mb-1 md:mb-2">City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className={`w-full px-3 md:px-4 py-2 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none ${
                        fieldErrors.city ? 'border-red-300 bg-red-50' : ''
                      }`}
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
                      className={`w-full px-3 md:px-4 py-2 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none ${
                        fieldErrors.state ? 'border-red-300 bg-red-50' : ''
                      }`}
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
                      maxLength={6}
                      className={`w-full px-3 md:px-4 py-2 text-sm md:text-base border rounded-lg focus:border-premium-gold focus:outline-none ${
                        fieldErrors.pincode ? 'border-red-300 bg-red-50' : ''
                      }`}
                      placeholder="6-digit pincode"
                    />
                  </div>
                </div>

                {/* Coupon Section */}
                <div className="border-t pt-3 md:pt-4 mt-3 md:mt-4">
                  <h3 className="font-medium mb-2 md:mb-3 flex items-center text-sm md:text-base">
                    <Tag className="h-4 w-4 mr-2" />
                    Apply Coupon
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
                          className="px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy disabled:opacity-50 text-sm md:text-base whitespace-nowrap"
                        >
                          {couponLoading ? '...' : 'Apply'}
                        </button>
                      </div>
                      {couponError && (
                        <p className="text-red-600 text-xs mt-2">{couponError}</p>
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
                    name="special_requests"
                    value={formData.special_requests}
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
                      : 'bg-gradient-to-r from-premium-gold to-premium-burgundy text-white hover:scale-[1.02] shadow-lg'
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
                  <p className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-green-600" />
                    <span>Free shipping on orders above ₹499</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-3">
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