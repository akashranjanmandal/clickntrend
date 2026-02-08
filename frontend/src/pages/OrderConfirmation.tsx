import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Package, Truck, Home, ShoppingBag, Gift, Clock } from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Order } from '../types'

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  const orderId = searchParams.get('orderId')

  useEffect(() => {
    if (orderId) {
      fetchOrder()
    }
  }, [orderId])

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (error) throw error
      setOrder(data)
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <Package className="w-12 h-12 text-red-600" />
        </div>
        <h2 className="text-3xl font-serif font-bold text-gray-900 mb-4">
          Order Not Found
        </h2>
        <p className="text-gray-600 mb-8">The order you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors flex items-center gap-2"
        >
          <Home className="w-5 h-5" />
          Return Home
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Success Header */}
      <div className="text-center mb-12">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-12 h-12 text-green-600" />
        </motion.div>
        
        <h1 className="text-5xl font-serif font-bold text-gray-900 mb-4">
          Order Confirmed!
        </h1>
        <p className="text-xl text-gray-600">
          Thank you for your purchase, {order.customer_name}!
        </p>
        <p className="text-gray-500 mt-2">
          Order #{order.id.slice(0, 8).toUpperCase()}
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Order Details */}
        <div className="space-y-8">
          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-primary-600" />
              Order Summary
            </h2>
            
            <div className="space-y-4">
              {Array.isArray(order.items) && order.items.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-4">
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div>
                      <h4 className="font-semibold">{item.name}</h4>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <div className="font-semibold">
                    ₹{(item.price * item.quantity).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-6 mt-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{order.total_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-green-600">FREE</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>₹{(order.total_amount * 0.18).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-4 border-t">
                  <span>Total Paid</span>
                  <span className="text-primary-600">
                    ₹{(order.total_amount * 1.18).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Info */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Truck className="w-6 h-6 text-blue-600" />
              Shipping Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Deliver to</label>
                <p className="font-semibold">{order.customer_name}</p>
              </div>
              <div>
                <label className="text-sm text-gray-500">Email</label>
                <p className="font-semibold">{order.customer_email}</p>
              </div>
              {order.customer_phone && (
                <div>
                  <label className="text-sm text-gray-500">Phone</label>
                  <p className="font-semibold">{order.customer_phone}</p>
                </div>
              )}
              {order.special_requests && (
                <div>
                  <label className="text-sm text-gray-500">Special Requests</label>
                  <p className="italic text-gray-700">{order.special_requests}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Status & Next Steps */}
        <div className="space-y-8">
          {/* Order Status */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
              <Clock className="w-6 h-6 text-orange-600" />
              Order Status
            </h2>
            
            <div className="space-y-6">
              {/* Status Timeline */}
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                
                {/* Status steps */}
                {[
                  { status: 'Order Placed', time: 'Just now', icon: CheckCircle, active: true },
                  { status: 'Processing', time: 'Within 24 hours', icon: Package },
                  { status: 'Shipped', time: '1-2 business days', icon: Truck },
                  { status: 'Delivered', time: '3-5 business days', icon: Gift },
                ].map((step, index) => (
                  <div key={step.status} className="relative flex items-start mb-8">
                    <div className={`z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
                      ${index === 0 ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <step.icon className={`w-6 h-6 ${index === 0 ? 'text-green-600' : 'text-gray-400'}`} />
                    </div>
                    <div className="ml-4">
                      <h4 className={`font-semibold ${index === 0 ? 'text-green-700' : 'text-gray-700'}`}>
                        {step.status}
                      </h4>
                      <p className="text-sm text-gray-500">{step.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tracking */}
              {order.tracking_number && (
                <div className="bg-blue-50 p-4 rounded-xl">
                  <h4 className="font-semibold text-blue-800 mb-2">Tracking Number</h4>
                  <code className="bg-white px-4 py-2 rounded-lg font-mono text-blue-600">
                    {order.tracking_number}
                  </code>
                </div>
              )}
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-2xl p-6 border border-primary-100">
            <h3 className="text-xl font-semibold mb-4">What's Next?</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Order confirmation email sent to {order.customer_email}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Your order will be processed within 24 hours</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>You'll receive tracking information once shipped</span>
              </li>
            </ul>

            <div className="mt-8 space-y-3">
              <button
                onClick={() => navigate('/products')}
                className="w-full bg-white text-primary-700 border-2 border-primary-200 py-3 rounded-xl font-semibold hover:bg-primary-50 transition-colors"
              >
                Continue Shopping
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full bg-primary-600 text-white py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}