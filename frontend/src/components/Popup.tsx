import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Gift, Sparkles } from 'lucide-react';
import { apiFetch } from '../config';
import { PopupConfig } from '../types';

interface PopupProps {
  onClose: () => void;
}

const Popup: React.FC<PopupProps> = ({ onClose }) => {
  const [popup, setPopup] = useState<PopupConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));

  useEffect(() => {
    fetchPopup();
  }, []);

  useEffect(() => {
    if (popup?.timer_enabled) {
      setTimeLeft({
        hours: popup.timer_hours,
        minutes: popup.timer_minutes,
        seconds: popup.timer_seconds
      });

      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev.hours === 0 && prev.minutes === 0 && prev.seconds === 0) {
            clearInterval(timer);
            return prev;
          }

          let newSeconds = prev.seconds - 1;
          let newMinutes = prev.minutes;
          let newHours = prev.hours;

          if (newSeconds < 0) {
            newSeconds = 59;
            newMinutes -= 1;
          }

          if (newMinutes < 0) {
            newMinutes = 59;
            newHours -= 1;
          }

          return {
            hours: newHours,
            minutes: newMinutes,
            seconds: newSeconds
          };
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [popup]);

  const fetchPopup = async () => {
    try {
      const data = await apiFetch('/api/popup/active');
      setPopup(data);
      
      // Track view
      if (data) {
        await apiFetch('/api/popup/track-view', {
          method: 'POST',
          body: JSON.stringify({ 
            popup_id: data.id,
            session_id: sessionId 
          }),
        });
      }
    } catch (error) {
      console.error('Error fetching popup:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCTAClick = async () => {
    if (popup) {
      await apiFetch('/api/popup/track-click', {
        method: 'POST',
        body: JSON.stringify({ 
          popup_id: popup.id,
          session_id: sessionId 
        }),
      });
    }
    window.location.href = popup?.cta_link || '/products?category=holi';
  };

  if (loading || !popup) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-premium-gold hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Content */}
          <div className="grid md:grid-cols-2">
            {/* Left side - Image */}
            <div className="relative h-64 md:h-full bg-gradient-to-br from-orange-100 to-pink-100">
              {popup.image_url ? (
                <img
                  src={popup.image_url}
                  alt={popup.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Gift className="w-24 h-24 text-premium-gold opacity-30" />
                </div>
              )}
              
              {/* Discount Badge */}
              <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-full shadow-lg">
                <span className="font-bold">{popup.discount_text.replace('{value}', popup.discount_value)}</span>
              </div>
            </div>

            {/* Right side - Content */}
            <div className="p-8">
              <h2 className="text-3xl font-serif font-bold text-premium-charcoal mb-2">
                {popup.title}
              </h2>
              
              <p className="text-gray-600 mb-4">
                {popup.description}
              </p>

              {/* Timer */}
              {popup.timer_enabled && (
                <div className="mb-6">
                  <p className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {popup.offer_text}
                  </p>
                  <div className="flex gap-3">
                    <div className="text-center">
                      <div className="bg-premium-cream rounded-lg px-4 py-2">
                        <span className="text-2xl font-bold text-premium-gold">
                          {String(timeLeft.hours).padStart(2, '0')}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 mt-1">Hours</span>
                    </div>
                    <div className="text-center">
                      <div className="bg-premium-cream rounded-lg px-4 py-2">
                        <span className="text-2xl font-bold text-premium-gold">
                          {String(timeLeft.minutes).padStart(2, '0')}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 mt-1">Min</span>
                    </div>
                    <div className="text-center">
                      <div className="bg-premium-cream rounded-lg px-4 py-2">
                        <span className="text-2xl font-bold text-premium-gold">
                          {String(timeLeft.seconds).padStart(2, '0')}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 mt-1">Sec</span>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleCTAClick}
                  className="w-full bg-premium-gold text-white py-3 rounded-xl font-semibold hover:bg-premium-burgundy transition-colors flex items-center justify-center gap-2"
                >
                  <Gift className="h-5 w-5" />
                  {popup.cta_text} - {popup.cash_on_delivery_text}
                </button>
                
                {popup.prepaid_discount_text && (
                  <p className="text-sm text-center text-green-600 font-medium">
                    <Sparkles className="h-4 w-4 inline mr-1" />
                    {popup.prepaid_discount_text}
                  </p>
                )}
              </div>

              {/* Why Choose Us */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-medium text-premium-charcoal mb-3">Why Choose Us?</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-premium-gold rounded-full" />
                    Premium Quality Products
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-premium-gold rounded-full" />
                    Free Shipping on Orders ₹499+
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-premium-gold rounded-full" />
                    24/7 Customer Support
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Popup;