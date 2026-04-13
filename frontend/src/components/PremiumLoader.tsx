import React from 'react';
import { motion } from 'framer-motion';

const PremiumLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-[9999]">
      <div className="text-center px-4">
        {/* Animated Gift Icon */}
        <motion.div
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mx-auto mb-6"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-gold/20 to-gold/5 rounded-2xl" />
          <div className="relative flex items-center justify-center w-full h-full">
            <svg className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          
          {/* Pulsing Rings */}
          <motion.div
            animate={{ scale: [1, 1.5, 2], opacity: [0.5, 0.3, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 rounded-full border-2 border-gold/30"
          />
          <motion.div
            animate={{ scale: [1, 1.8, 2.5], opacity: [0.3, 0.2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            className="absolute inset-0 rounded-full border border-gold/20"
          />
        </motion.div>
        
        {/* Loading Dots */}
        <div className="flex justify-center gap-2 mt-4">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ 
                duration: 0.8, 
                repeat: Infinity, 
                delay: i * 0.2,
                ease: "easeInOut"
              }}
              className="w-2 h-2 bg-gold rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PremiumLoader;