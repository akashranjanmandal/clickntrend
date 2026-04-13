import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, HelpCircle, Mail, Phone, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'ordering' | 'shipping' | 'returns' | 'payment' | 'general';
}

interface FAQModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FAQModal: React.FC<FAQModalProps> = ({ isOpen, onClose }) => {
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const faqs: FAQItem[] = [
    {
      id: '1',
      question: 'How do I place an order?',
      answer: 'Simply browse our products, add items to your cart, and proceed to checkout. You can pay via Credit/Debit cards, UPI, NetBanking, or Cash on Delivery.',
      category: 'ordering'
    },
    {
      id: '2',
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit/debit cards, UPI (Google Pay, PhonePe, Paytm), NetBanking, and Cash on Delivery for orders under ₹10,000.',
      category: 'payment'
    },
    {
      id: '3',
      question: 'How long does shipping take?',
      answer: 'Standard shipping takes 3-5 business days. Express shipping (2-3 business days) is available at checkout. Free shipping on orders above ₹499.',
      category: 'shipping'
    },
    {
      id: '4',
      question: 'Can I track my order?',
      answer: 'Yes! Once your order ships, you\'ll receive a tracking number via email and SMS. You can also track your order in the "Order Status" section.',
      category: 'shipping'
    },
    {
      id: '5',
      question: 'What is your return policy?',
      answer: 'We offer 7-day returns on most items. Products must be unused and in original packaging. Customized items cannot be returned unless damaged.',
      category: 'returns'
    },
    {
      id: '6',
      question: 'Do you offer gift wrapping?',
      answer: 'Yes, we offer premium gift wrapping for ₹199. You can add this option at checkout and include a personalized message.',
      category: 'ordering'
    },
    {
      id: '7',
      question: 'Can I cancel my order?',
      answer: 'Orders can be cancelled within 2 hours of placement. After that, please contact customer support for assistance.',
      category: 'ordering'
    },
    {
      id: '8',
      question: 'Is Cash on Delivery available?',
      answer: 'Yes, COD is available for orders under ₹10,000. A nominal fee of ₹49 applies for COD orders.',
      category: 'payment'
    },
    {
      id: '9',
      question: 'Do you ship internationally?',
      answer: 'Currently, we ship only within India. We\'re working on expanding to international shipping soon!',
      category: 'shipping'
    },
    {
      id: '10',
      question: 'How do I contact customer support?',
      answer: 'You can reach us via email at care@gftd.in or call us at +91 8240398515. Our support team is available 24/7.',
      category: 'general'
    }
  ];

  const categories = [
    { id: 'all', label: 'All Questions', icon: HelpCircle },
    { id: 'ordering', label: 'Ordering', icon: HelpCircle },
    { id: 'payment', label: 'Payment', icon: HelpCircle },
    { id: 'shipping', label: 'Shipping', icon: HelpCircle },
    { id: 'returns', label: 'Returns', icon: HelpCircle },
    { id: 'general', label: 'General', icon: HelpCircle },
  ];

  const toggleItem = (id: string) => {
    setOpenItems(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const filteredFaqs = activeCategory === 'all'
    ? faqs
    : faqs.filter(faq => faq.category === activeCategory);

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
          className="relative bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-premium-gold to-premium-burgundy text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-serif font-bold">Frequently Asked Questions</h2>
                <p className="text-white/80 mt-1">Find answers to common questions</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 mt-6 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                    activeCategory === cat.id
                      ? 'bg-white text-premium-charcoal'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  <cat.icon className="h-4 w-4" />
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* FAQ List */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            <div className="space-y-4">
              {filteredFaqs.map((faq) => (
                <div
                  key={faq.id}
                  className="border border-gray-200 rounded-xl overflow-hidden hover:border-premium-gold transition-colors"
                >
                  <button
                    onClick={() => toggleItem(faq.id)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left bg-white hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium text-premium-charcoal">{faq.question}</span>
                    {openItems.includes(faq.id) ? (
                      <ChevronUp className="h-5 w-5 text-premium-gold flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-premium-gold flex-shrink-0" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {openItems.includes(faq.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-6 pb-4 text-gray-600"
                      >
                        {faq.answer}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Contact Support */}
            <div className="mt-8 p-6 bg-gray-50 rounded-xl">
              <h3 className="font-semibold text-premium-charcoal mb-4 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-premium-gold" />
                Still have questions?
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <a
                  href="mailto:care@gftd.in"
                  className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="p-3 bg-premium-gold/10 rounded-full">
                    <Mail className="h-5 w-5 text-premium-gold" />
                  </div>
                  <div>
                    <p className="font-medium">Email Us</p>
                    <p className="text-sm text-gray-500">care@gftd.in</p>
                  </div>
                </a>
                <a
                  href="tel:+918240398515"
                  className="flex items-center gap-3 p-4 bg-white rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="p-3 bg-premium-gold/10 rounded-full">
                    <Phone className="h-5 w-5 text-premium-gold" />
                  </div>
                  <div>
                    <p className="font-medium">Call Us</p>
                    <p className="text-sm text-gray-500">+91 8240398515</p>
                  </div>
                </a>
              </div>
              <p className="text-xs text-gray-500 text-center mt-4">
                Our support team is available 24/7 to assist you
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FAQModal;