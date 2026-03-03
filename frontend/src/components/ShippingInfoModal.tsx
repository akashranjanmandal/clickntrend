import React from 'react';
import { X, Truck, Clock, Shield, Package, MapPin, CreditCard, RotateCcw ,Mail,Phone} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ShippingInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ShippingInfoModal: React.FC<ShippingInfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-premium-gold to-premium-burgundy text-white p-6 sticky top-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Truck className="h-6 w-6" />
                <h2 className="text-2xl font-serif font-bold">Shipping Information</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-8">
            {/* Shipping Methods */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-premium-gold" />
                Shipping Methods
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Truck className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="font-semibold">Standard Shipping</h4>
                      <span className="text-green-600 font-semibold">FREE over ₹499</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Delivery in 3-5 business days</p>
                    <p className="text-sm text-gray-500 mt-1">₹79 for orders below ₹499</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Express Shipping</h4>
                    <p className="text-sm text-gray-600 mt-1">Delivery in 2-3 business days</p>
                    <p className="text-sm text-gray-500 mt-1">₹149 flat rate</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Delivery Areas */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-premium-gold" />
                Delivery Areas
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  We currently ship to all major cities and towns across India. 
                  Delivery to remote areas may take 1-2 additional business days.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
                  {['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Pune', 'Hyderabad', 'Ahmedabad', 'Jaipur'].map(city => (
                    <span key={city} className="px-3 py-1 bg-white text-sm rounded-full text-center">
                      {city}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Processing */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-premium-gold" />
                Order Processing
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <p className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Orders placed before 2 PM IST are processed the same day
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Orders placed after 2 PM IST are processed the next business day
                </p>
                <p className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  No deliveries on Sundays and public holidays
                </p>
              </div>
            </div>

            {/* Tracking */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-premium-gold" />
                Order Tracking
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">
                  Once your order ships, you'll receive:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                  <li>Tracking number via email and SMS</li>
                  <li>Real-time updates on order status</li>
                  <li>Estimated delivery date</li>
                </ul>
                <p className="mt-3 text-sm text-gray-500">
                  You can track your order in the "Track Order" section
                </p>
              </div>
            </div>

            {/* Contact Support */}
            <div className="bg-premium-cream p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Need Help?</h4>
              <p className="text-sm text-gray-600">
                For shipping-related queries, contact our support team:
              </p>
              <div className="mt-3 space-y-2">
                <a href="mailto:care@gftd.in" className="flex items-center gap-2 text-premium-gold">
                  <Mail className="h-4 w-4" />
                  care@gftd.in
                </a>
                <a href="tel:+918240398515" className="flex items-center gap-2 text-premium-gold">
                  <Phone className="h-4 w-4" />
                  +91 8240398515
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ShippingInfoModal;