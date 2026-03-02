import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  Package, 
  Truck, 
  Home, 
  ShoppingBag, 
  Gift, 
  Clock,
  MapPin,
  Mail,
  Phone,
  CreditCard,
  Download,
  Share2,
  Printer,
  Heart,
  Star,
  Sparkles,
  Award,
  ChevronRight,
  Calendar,
  Hash,
  IndianRupee,
  Copy,
  FileText,
  AlertCircle
} from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../utils/apiFetch'
import { formatCurrency } from '../utils/helpers'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface Order {
  id: string
  custom_order_id?: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  items: any[]
  total_amount: number
  payment_method?: string
  shipping_address?: string
  shipping_city?: string
  shipping_state?: string
  shipping_pincode?: string
  tracking_number?: string
  created_at?: string
  status?: string
  subtotal?: number
  shipping_charge?: number
  cod_charge?: number
  coupon_discount?: number
  coupon_code?: string
  special_requests?: string
}

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [showConfetti, setShowConfetti] = useState(true)
  const [copySuccess, setCopySuccess] = useState(false)

  const orderId = searchParams.get('orderId')

  useEffect(() => {
    if (orderId) {
      fetchOrder()
    } else {
      navigate('/')
    }
    
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [orderId])

  const fetchOrder = async () => {
    try {
      setLoading(true)
      console.log('🔍 Fetching order:', orderId)
      
      const response = await apiFetch(`/api/orders/${orderId}`, {
        method: 'GET',
      })

      console.log('✅ Order fetched:', response)
      setOrder(response)
      
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDisplayOrderId = () => {
    if (!order) return 'GFTD#000'
    return order.custom_order_id || `GFTD#${order.id.slice(-5).toUpperCase()}`
  }

  const handleCopyOrderId = () => {
    if (order) {
      navigator.clipboard.writeText(getDisplayOrderId())
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }

  const generatePDF = () => {
    if (!order) return

    const doc = new jsPDF()
    const displayOrderId = getDisplayOrderId()
    const pageWidth = doc.internal.pageSize.getWidth()
    
    // Brand Colors
    const goldColor = [212, 175, 55] // #D4AF37
    const burgundyColor = [128, 0, 32] // #800020
    
    // Header
    doc.setFillColor(245, 245, 250)
    doc.rect(0, 0, pageWidth, 40, 'F')
    
    doc.setFontSize(28)
    doc.setTextColor(goldColor[0], goldColor[1], goldColor[2])
    doc.setFont('helvetica', 'bold')
    doc.text('GFTD', 20, 25)
    
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'normal')
    doc.text('Premium Gifts & Curated Experiences', 20, 32)
    
    doc.setFontSize(20)
    doc.setTextColor(burgundyColor[0], burgundyColor[1], burgundyColor[2])
    doc.setFont('helvetica', 'bold')
    doc.text('ORDER INVOICE', pageWidth - 20, 25, { align: 'right' })
    
    // Order Details Box
    doc.setFillColor(250, 250, 250)
    doc.roundedRect(20, 50, pageWidth - 40, 35, 3, 3, 'F')
    
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    doc.setFont('helvetica', 'normal')
    doc.text('Order Number:', 25, 62)
    doc.text('Order Date:', 25, 72)
    doc.text('Payment Method:', 25, 82)
    
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(displayOrderId, 65, 62)
    doc.text(order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : new Date().toLocaleDateString(), 65, 72)
    doc.text((order.payment_method || 'Online').toUpperCase(), 65, 82)
    
    // Customer Information
    doc.setFontSize(14)
    doc.setTextColor(burgundyColor[0], burgundyColor[1], burgundyColor[2])
    doc.setFont('helvetica', 'bold')
    doc.text('Customer Information', 20, 105)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text('Name:', 20, 115)
    doc.text('Email:', 20, 122)
    doc.text('Phone:', 20, 129)
    
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(order.customer_name, 45, 115)
    doc.text(order.customer_email, 45, 122)
    doc.text(order.customer_phone || 'N/A', 45, 129)
    
    // Shipping Address
    doc.setFontSize(14)
    doc.setTextColor(burgundyColor[0], burgundyColor[1], burgundyColor[2])
    doc.setFont('helvetica', 'bold')
    doc.text('Shipping Address', pageWidth / 2 + 10, 105)
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    
    const addressParts = [
      order.shipping_address,
      order.shipping_city,
      order.shipping_state,
      order.shipping_pincode
    ].filter(Boolean)
    
    const address = addressParts.join(', ') || 'Address not provided'
    const addressLines = doc.splitTextToSize(address, pageWidth / 2 - 30)
    doc.text(addressLines, pageWidth / 2 + 10, 115)
    
    // Order Items Table
    doc.setFontSize(14)
    doc.setTextColor(burgundyColor[0], burgundyColor[1], burgundyColor[2])
    doc.setFont('helvetica', 'bold')
    doc.text('Order Summary', 20, 155)
    
    const tableColumn = ["Item", "Quantity", "Unit Price", "Total"]
    const tableRows: any[] = []
    
    if (Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        const itemData = [
          item.name,
          item.quantity.toString(),
          `₹${item.price.toLocaleString()}`,
          `₹${(item.price * item.quantity).toLocaleString()}`
        ]
        tableRows.push(itemData)
      })
    }
    
    doc.autoTable({
      startY: 160,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: burgundyColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 250],
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 40, halign: 'right' },
        3: { cellWidth: 40, halign: 'right' },
      },
      margin: { left: 20, right: 20 },
    })
    
    const subtotal = order.total_amount
    const tax = subtotal * 0.18
    const grandTotal = subtotal + tax
    
    const finalY = (doc as any).lastAutoTable.finalY + 10
    
    // Summary Box
    doc.setFillColor(250, 250, 250)
    doc.roundedRect(pageWidth - 80, finalY, 60, 45, 3, 3, 'F')
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text('Subtotal:', pageWidth - 75, finalY + 8)
    doc.text('Tax (18%):', pageWidth - 75, finalY + 16)
    doc.text('Shipping:', pageWidth - 75, finalY + 24)
    doc.text('Total:', pageWidth - 75, finalY + 37)
    
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text(`₹${subtotal.toLocaleString()}`, pageWidth - 25, finalY + 8, { align: 'right' })
    doc.text(`₹${tax.toLocaleString()}`, pageWidth - 25, finalY + 16, { align: 'right' })
    doc.text('FREE', pageWidth - 25, finalY + 24, { align: 'right' })
    
    doc.setFontSize(12)
    doc.setTextColor(goldColor[0], goldColor[1], goldColor[2])
    doc.text(`₹${grandTotal.toLocaleString()}`, pageWidth - 25, finalY + 37, { align: 'right' })
    
    // Footer
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.setFont('helvetica', 'italic')
    doc.text('Thank you for shopping with GFTD!', pageWidth / 2, finalY + 60, { align: 'center' })
    doc.text('For any queries, contact support@gftd.com', pageWidth / 2, finalY + 67, { align: 'center' })
    
    doc.save(`GFTD_Invoice_${displayOrderId.replace('#', '_')}.pdf`)
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My GFTD Order',
          text: `Just ordered from GFTD! Order #${getDisplayOrderId()}`,
          url: window.location.href,
        })
      } catch (error) {
        console.log('Error sharing:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-gradient-to-br from-primary-50/50 to-secondary-50/50">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 360, 360]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative"
        >
          <div className="w-20 h-20 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
          <Gift className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary-600" />
        </motion.div>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-xl font-medium text-gray-700"
        >
          Fetching your order details...
        </motion.p>
        <p className="text-gray-500 mt-2">This will just take a moment</p>
      </div>
    )
  }

  if (!order) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-[70vh] flex flex-col items-center justify-center px-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className="w-32 h-32 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center mb-8 shadow-xl"
        >
          <Package className="w-16 h-16 text-red-600" />
        </motion.div>
        
        <h2 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4 text-center">
          Order Not Found
        </h2>
        <p className="text-xl text-gray-600 mb-8 text-center max-w-md">
          The order you're looking for doesn't exist or may have been removed.
        </p>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
          className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-10 py-4 rounded-xl font-semibold hover:from-primary-700 hover:to-primary-800 transition-all duration-300 flex items-center gap-3 shadow-lg shadow-primary-600/30"
        >
          <Home className="w-5 h-5" />
          Return to Homepage
        </motion.button>
      </motion.div>
    )
  }

  const displayOrderId = getDisplayOrderId()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-8 md:py-12 px-4">
      {/* Confetti Effect */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 pointer-events-none z-50"
          >
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: -20,
                  rotate: 0,
                  scale: Math.random() * 0.5 + 0.5,
                }}
                animate={{
                  y: window.innerHeight + 100,
                  rotate: Math.random() * 360,
                }}
                transition={{
                  duration: Math.random() * 3 + 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                  ease: "linear",
                }}
                className="absolute w-3 h-3 rounded-full"
                style={{
                  background: `hsl(${Math.random() * 360}, 70%, 50%)`,
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 md:mb-12 relative"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="relative inline-block"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur-2xl opacity-50 animate-pulse"></div>
            <div className="relative w-28 h-28 md:w-32 md:h-32 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl border-4 border-white">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <CheckCircle className="w-14 h-14 md:w-16 md:h-16 text-green-600" />
              </motion.div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
              Order Confirmed! 
              <Sparkles className="inline-block w-8 h-8 md:w-10 md:h-10 text-yellow-500 ml-2 animate-bounce" />
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
              Thank you for choosing GFTD, {order.customer_name?.split(' ')[0] || 'there'}! 
              Your order has been successfully placed.
            </p>
          </motion.div>

          {/* Order ID Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="inline-flex items-center gap-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-full shadow-lg mt-4"
          >
            <Hash className="w-5 h-5" />
            <span className="font-mono font-bold text-lg">
              {displayOrderId}
            </span>
            <button
              onClick={handleCopyOrderId}
              className="ml-2 p-1 hover:bg-white/20 rounded transition-colors"
              title="Copy Order ID"
            >
              <Copy className="w-4 h-4" />
            </button>
            {copySuccess && (
              <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs bg-gray-800 text-white px-2 py-1 rounded">
                Copied!
              </span>
            )}
          </motion.div>

          {/* Order Date */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-sm text-gray-500 mt-4 flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : new Date().toLocaleDateString()}
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="flex flex-wrap items-center justify-center gap-3 mt-6"
          >
            <button
              onClick={generatePDF}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-gray-700 hover:text-primary-600 border border-gray-200"
            >
              <FileText className="w-4 h-4" />
              Download PDF Invoice
            </button>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-gray-700 hover:text-primary-600 border border-gray-200"
            >
              <Share2 className="w-4 h-4" />
              Share Order
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 text-gray-700 hover:text-primary-600 border border-gray-200"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </motion.div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
          {/* Left Column - Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Order Summary Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5" />
                  Order Summary
                  <span className="text-xs bg-white/20 px-3 py-1 rounded-full ml-auto">
                    {Array.isArray(order.items) ? order.items.length : 0} items
                  </span>
                </h2>
              </div>
              
              <div className="p-6">
                {/* Items List */}
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {Array.isArray(order.items) && order.items.map((item: any, index: number) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                    >
                      <div className="relative">
                        <img
                          src={item.image_url || 'https://via.placeholder.com/80'}
                          alt={item.name}
                          className="w-20 h-20 object-cover rounded-lg shadow-md group-hover:shadow-lg transition-shadow"
                        />
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {item.quantity}
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 group-hover:text-primary-600 transition-colors">
                          {item.name}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {item.category || 'Gift Item'}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-600">
                            ₹{item.price.toLocaleString()} each
                          </span>
                          <span className="font-bold text-primary-700">
                            ₹{(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="space-y-3">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>₹{order.total_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Shipping</span>
                      <span className="text-green-600 font-medium flex items-center gap-1">
                        <Gift className="w-4 h-4" />
                        FREE
                      </span>
                    </div>
                    {order.coupon_discount ? (
                      <div className="flex justify-between text-green-600">
                        <span>Coupon Discount</span>
                        <span>-₹{order.coupon_discount.toLocaleString()}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between text-gray-600">
                      <span>Tax (GST 18%)</span>
                      <span>₹{(order.total_amount * 0.18).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-4 border-t border-gray-200">
                      <span className="flex items-center gap-2">
                        <IndianRupee className="w-5 h-5" />
                        Total Paid
                      </span>
                      <span className="text-2xl text-primary-600">
                        ₹{(order.total_amount * 1.18).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Method Badge */}
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  <CreditCard className="w-4 h-4" />
                  <span>Paid via {order.payment_method?.toUpperCase() || 'Online Payment'}</span>
                </div>
              </div>
            </div>

            {/* Shipping Information Card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Truck className="w-5 h-5" />
                  Shipping Information
                </h2>
              </div>
              
              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Delivery Address</p>
                        <p className="font-semibold text-gray-800">{order.customer_name}</p>
                        <p className="text-gray-600 text-sm mt-1">
                          {[
                            order.shipping_address,
                            order.shipping_city,
                            order.shipping_state,
                            order.shipping_pincode
                          ].filter(Boolean).join(', ') || 'Address not provided'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Mail className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-semibold text-gray-800 break-all">{order.customer_email}</p>
                      </div>
                    </div>
                    
                    {order.customer_phone && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Phone className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="font-semibold text-gray-800">{order.customer_phone}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expected Delivery */}
                  <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-4 border border-green-100">
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-green-600" />
                      Expected Delivery
                    </h4>
                    <p className="text-2xl font-bold text-green-700">
                      {new Date(new Date(order.created_at || new Date()).setDate(new Date(order.created_at || new Date()).getDate() + 5)).toLocaleDateString('en-IN', { 
                        day: 'numeric', 
                        month: 'long'
                      })}
                    </p>
                    <p className="text-sm text-gray-600 mt-2 flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      Standard shipping (5-7 business days)
                    </p>
                  </div>
                </div>

                {order.special_requests && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500">Special Requests</p>
                    <p className="text-gray-700 mt-1">{order.special_requests}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Column - Order Status & Next Steps */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="space-y-6"
          >
            {/* Order Status Timeline */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden sticky top-20">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Order Status
                </h2>
              </div>
              
              <div className="p-6">
                <div className="relative">
                  <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-gradient-to-b from-green-400 via-blue-400 to-gray-200"></div>
                  
                  {[
                    { 
                      status: 'Order Confirmed', 
                      time: 'Just now', 
                      icon: CheckCircle, 
                      active: true,
                      color: 'green',
                      description: 'Your order has been received'
                    },
                    { 
                      status: 'Processing', 
                      time: 'Within 24 hours', 
                      icon: Package, 
                      active: true,
                      color: 'blue',
                      description: 'Preparing your items'
                    },
                    { 
                      status: 'Shipped', 
                      time: '1-2 business days', 
                      icon: Truck, 
                      active: false,
                      color: 'orange',
                      description: 'On the way to you'
                    },
                    { 
                      status: 'Delivered', 
                      time: '3-5 business days', 
                      icon: Gift, 
                      active: false,
                      color: 'purple',
                      description: 'Package delivered'
                    },
                  ].map((step, index) => (
                    <motion.div
                      key={step.status}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + index * 0.1 }}
                      className="relative flex items-start mb-8 last:mb-0"
                    >
                      <div className={`z-10 flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center
                        ${step.active 
                          ? `bg-${step.color}-100 ring-4 ring-${step.color}-50` 
                          : 'bg-gray-100'}`}
                      >
                        <step.icon className={`w-6 h-6 ${step.active ? `text-${step.color}-600` : 'text-gray-400'}`} />
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className={`font-semibold ${step.active ? `text-${step.color}-700` : 'text-gray-500'}`}>
                            {step.status}
                          </h4>
                          {step.active && (
                            <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{step.time}</p>
                        <p className="text-xs text-gray-400 mt-1">{step.description}</p>
                        
                        {step.active && index < 3 && (
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="h-1 bg-gradient-to-r from-green-400 to-blue-400 rounded-full mt-2"
                          />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {order.tracking_number && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                    <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      Tracking Number
                    </h4>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-white px-4 py-2.5 rounded-lg font-mono text-blue-600 border border-blue-200 text-sm">
                        {order.tracking_number}
                      </code>
                      <button 
                        onClick={() => navigator.clipboard.writeText(order.tracking_number!)}
                        className="p-2.5 bg-white rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
                      >
                        <Copy className="w-4 h-4 text-blue-600" />
                      </button>
                    </div>
                    <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Track your package in real-time
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Next Steps & Rewards Card */}
            <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-purple-700 rounded-2xl shadow-xl p-6 text-white">
              <h3 className="text-2xl font-serif font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-300" />
                What's Next?
              </h3>
              
              <div className="space-y-4 mb-6">
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3"
                >
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Confirmation Email</p>
                    <p className="text-sm text-white/80">Sent to {order.customer_email}</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Order Processing</p>
                    <p className="text-sm text-white/80">Will be processed within 24 hours</p>
                  </div>
                </motion.div>
                
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3"
                >
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Truck className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Shipping Update</p>
                    <p className="text-sm text-white/80">Tracking info via email/SMS</p>
                  </div>
                </motion.div>
              </div>

              {/* Rewards Section */}
              <div className="border-t border-white/20 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Award className="w-4 h-4 text-yellow-300" />
                    Rewards Earned
                  </h4>
                  <span className="text-2xl font-bold text-yellow-300">150</span>
                </div>
                <p className="text-xs text-white/80 mb-4">
                  You've earned 150 reward points from this purchase!
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate('/products')}
                    className="flex-1 bg-white text-primary-700 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Shop More
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="flex-1 bg-primary-500 text-white py-3 rounded-xl font-semibold hover:bg-primary-400 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Home className="w-4 h-4" />
                    Home
                  </button>
                </div>
              </div>
            </div>

            {/* Recommended Products */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" />
                You might also like
              </h3>
              
              <div className="space-y-3">
                {[1, 2].map((item) => (
                  <div key={item} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-lg"></div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">Premium Gift Box</h4>
                      <p className="text-xs text-gray-500">Starting at ₹999</p>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer Note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-12 text-sm text-gray-500"
        >
          <p>A confirmation email has been sent to {order.customer_email}</p>
          <p className="mt-1">For any queries, contact our support team</p>
        </motion.div>
      </div>
    </div>
  )
}