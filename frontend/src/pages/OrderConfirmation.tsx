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
  Calendar,
  Hash,
  IndianRupee,
  Copy,
  FileText
} from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { apiFetch } from '../utils/apiFetch'
import { formatCurrency } from '../utils/helpers'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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
    
    // Header - GFTD
    doc.setFontSize(28)
    doc.setTextColor(212, 175, 55)
    doc.setFont('helvetica', 'bold')
    doc.text('GFTD', 20, 25)
    
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'normal')
    doc.text('Premium Gifts', 20, 32)
    
    // Invoice Title
    doc.setFontSize(20)
    doc.setTextColor(128, 0, 32)
    doc.setFont('helvetica', 'bold')
    doc.text('ORDER INVOICE', pageWidth - 20, 25, { align: 'right' })
    
    // Order Details
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
      year: 'numeric'
    }) : new Date().toLocaleDateString(), 65, 72)
    doc.text((order.payment_method || 'Online').toUpperCase(), 65, 82)
    
    // Customer Information
    doc.setFontSize(14)
    doc.setTextColor(128, 0, 32)
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
    doc.setTextColor(128, 0, 32)
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
    doc.setTextColor(128, 0, 32)
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
    
    // Use autoTable correctly
    autoTable(doc, {
      startY: 160,
      head: [tableColumn],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [128, 0, 32],
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
    
    // Get the last Y position
    const finalY = (doc as any).lastAutoTable.finalY + 10
    
    // Total Amount
    doc.setFillColor(250, 250, 250)
    doc.roundedRect(pageWidth - 80, finalY, 60, 20, 3, 3, 'F')
    
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text('Total Amount:', pageWidth - 75, finalY + 8)
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(212, 175, 55)
    doc.text(`₹${order.total_amount.toLocaleString()}`, pageWidth - 25, finalY + 13, { align: 'right' })
    
    // GFTD Contact Information
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.setFont('helvetica', 'normal')
    doc.text('GFTD - Premium Gifts', pageWidth / 2, finalY + 40, { align: 'center' })
    doc.text('contact@gftd.com | +91 9876543210', pageWidth / 2, finalY + 45, { align: 'center' })
    doc.text('Mumbai, India', pageWidth / 2, finalY + 50, { align: 'center' })
    
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

      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 md:mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl"
          >
            <CheckCircle className="w-12 h-12 text-green-600" />
          </motion.div>
          
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-3">
            Order Confirmed!
          </h1>
          <p className="text-lg md:text-xl text-gray-600">
            Thank you for choosing GFTD, {order.customer_name?.split(' ')[0] || 'there'}!
          </p>

          {/* Order ID Badge */}
          <div className="inline-flex items-center gap-3 bg-primary-600 text-white px-6 py-3 rounded-full shadow-lg mt-4">
            <Hash className="w-5 h-5" />
            <span className="font-mono font-bold text-lg">{displayOrderId}</span>
            <button
              onClick={handleCopyOrderId}
              className="p-1 hover:bg-white/20 rounded transition-colors relative"
            >
              <Copy className="w-4 h-4" />
              {copySuccess && (
                <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs bg-gray-800 text-white px-2 py-1 rounded whitespace-nowrap">
                  Copied!
                </span>
              )}
            </button>
          </div>

          {/* Order Date */}
          <p className="text-sm text-gray-500 mt-4 flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4" />
            {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric'
            }) : new Date().toLocaleDateString()}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={generatePDF}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Download Invoice
            </button>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </motion.div>

        {/* Order Details Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Order Summary */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary-600" />
              Order Summary
            </h2>
            
            <div className="space-y-3">
              {Array.isArray(order.items) && order.items.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">Qty: {item.quantity} × ₹{item.price.toLocaleString()}</p>
                  </div>
                  <p className="font-semibold">₹{(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
              
              <div className="pt-4 mt-2 border-t">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary-600">₹{order.total_amount.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                  <CreditCard className="w-4 h-4" />
                  <span>Paid via {order.payment_method?.toUpperCase() || 'Online'}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Shipping Information */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              Shipping Details
            </h2>
            
            <div className="space-y-4">
              <div className="flex gap-3">
                <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <div>
                  <p className="font-medium">{order.customer_name}</p>
                  <p className="text-gray-600 text-sm mt-1">
                    {[
                      order.shipping_address,
                      order.shipping_city,
                      order.shipping_state,
                      order.shipping_pincode
                    ].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                <p className="text-gray-600">{order.customer_email}</p>
              </div>
              
              {order.customer_phone && (
                <div className="flex gap-3">
                  <Phone className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <p className="text-gray-600">{order.customer_phone}</p>
                </div>
              )}
              
              {order.special_requests && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-500">Special Requests</p>
                  <p className="text-gray-700 mt-1">{order.special_requests}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Order Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-lg p-6 md:col-span-2"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              Order Status
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[
                { status: 'Confirmed', icon: CheckCircle, active: true },
                { status: 'Processing', icon: Package, active: true },
                { status: 'Shipped', icon: Truck, active: false },
                { status: 'Delivered', icon: Gift, active: false },
              ].map((step, index) => (
                <div key={step.status} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    step.active ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <step.icon className={`w-5 h-5 ${
                      step.active ? 'text-green-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className={`font-medium ${
                      step.active ? 'text-green-700' : 'text-gray-500'
                    }`}>{step.status}</p>
                    <p className="text-xs text-gray-400">
                      {index === 0 ? 'Just now' : 
                       index === 1 ? 'Within 24h' :
                       index === 2 ? '1-2 days' : '3-5 days'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {order.tracking_number && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">Tracking Number: {order.tracking_number}</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-8 text-sm text-gray-500"
        >
          <p>A confirmation email has been sent to {order.customer_email}</p>
          <p className="mt-1">For any queries, contact support@gftd.com</p>
        </motion.div>
      </div>
    </div>
  )
}