import React from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

interface CategoryCardProps {
  name: string;
  icon: string;
  color: string;
  hover_effect?: string;
  count?: number;
  onClick?: () => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  name,
  icon,
  color,
  hover_effect = 'scale',
  count,
  onClick
}) => {
  // Dynamically import lucide icon if it's not an emoji
  const IconComponent = icon.length === 1 ? null : (Icons as any)[icon] || Icons.Gift;

  const getHoverAnimation = () => {
    switch (hover_effect) {
      case 'scale':
        return { scale: 1.1 };
      case 'rotate':
        return { rotate: 5, scale: 1.05 };
      case 'bounce':
        return { y: -10, scale: 1.05 };
      case 'pulse':
        return { scale: [1, 1.1, 1], transition: { duration: 0.5 } };
      default:
        return { scale: 1.05 };
    }
  };

  const getIconAnimation = () => {
    switch (hover_effect) {
      case 'rotate':
        return { rotate: 360 };
      case 'bounce':
        return { y: -5 };
      default:
        return { scale: 1.1 };
    }
  };

  return (
    <motion.div
      whileHover={getHoverAnimation()}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`relative bg-gradient-to-br ${color} p-6 rounded-2xl text-center cursor-pointer overflow-hidden group`}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.8),transparent_70%)]" />
      </div>

      {/* Icon */}
      <motion.div
        whileHover={getIconAnimation()}
        transition={{ type: 'spring', stiffness: 300 }}
        className="relative z-10"
      >
        {IconComponent ? (
          <IconComponent className="w-12 h-12 mx-auto mb-4 text-premium-charcoal" />
        ) : (
          <span className="text-5xl mb-4 block">{icon}</span>
        )}
      </motion.div>

      {/* Category Name */}
      <h3 className="font-serif text-lg font-semibold text-premium-charcoal mb-2 relative z-10">
        {name}
      </h3>

      {/* Product Count */}
      {count !== undefined && (
        <p className="text-sm text-gray-600 relative z-10">
          {count} {count === 1 ? 'gift' : 'gifts'}
        </p>
      )}

      {/* Shine Effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
    </motion.div>
  );
};

export default CategoryCard;