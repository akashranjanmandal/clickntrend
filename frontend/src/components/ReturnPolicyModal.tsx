import React from 'react';
import { X, RotateCcw, Shield, AlertCircle, CheckCircle, XCircle, Clock,Mail,Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ReturnPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ReturnPolicyModal: React.FC<ReturnPolicyModalProps> = ({ isOpen, onClose }) => {
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
                <RotateCcw className="h-6 w-6" />
                <h2 className="text-2xl font-serif font-bold">Return & Refund Policy</h2>
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
            {/* Return Window */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-premium-gold" />
                Return Window
              </h3>
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <p className="text-green-800 font-medium">7-Day Return Policy</p>
                <p className="text-sm text-gray-600 mt-1">
                  You can return most items within 7 days of delivery for a full refund.
                </p>
              </div>
            </div>

            {/* Eligible Items */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Eligible Items
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <ul className="space-y-2">
                  {[
                    'Unused and in original packaging',
                    'Non-personalized items',
                    'Items with price tags attached',
                    'Products without any damage or wear'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Non-eligible Items */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                Non-eligible Items
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <ul className="space-y-2">
                  {[
                    'Customized or personalized products',
                    'Used or worn items',
                    'Items without original packaging',
                    'Sale or clearance items',
                    'Perishable goods',
                    'Gift cards'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Return Process */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-premium-gold" />
                Return Process
              </h3>
              <div className="space-y-4">
                {[
                  { step: 1, title: 'Initiate Return', desc: 'Contact our support team within 7 days of delivery' },
                  { step: 2, title: 'Get Approval', desc: 'We\'ll review your request and send return instructions' },
                  { step: 3, title: 'Ship Item Back', desc: 'Pack the item securely and ship to our return address' },
                  { step: 4, title: 'Receive Refund', desc: 'Refund processed within 5-7 business days of receipt' }
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-premium-gold text-white rounded-full flex items-center justify-center font-bold">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold">{item.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Refund Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-premium-gold" />
                Refund Information
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <p className="flex items-center justify-between">
                  <span className="text-gray-600">Original Payment Method:</span>
                  <span className="font-medium">5-7 business days</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-gray-600">Store Credit:</span>
                  <span className="font-medium">Immediate</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="text-gray-600">Shipping Charges:</span>
                  <span className="font-medium">Non-refundable</span>
                </p>
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                Important Notes
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li>Customer is responsible for return shipping costs</li>
                <li>Items must be in original condition with all tags attached</li>
                <li>Refunds are processed to the original payment method</li>
                <li>Sale items are final sale and cannot be returned</li>
              </ul>
            </div>

            {/* Contact Support */}
            <div className="bg-premium-cream p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Need Help with a Return?</h4>
              <p className="text-sm text-gray-600">
                Contact our support team for assistance:
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

export default ReturnPolicyModal;