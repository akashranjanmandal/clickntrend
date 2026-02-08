import { useState } from 'react'
import { motion } from 'framer-motion'
import { Package, Star, ShoppingCart, Sparkles, Tag, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { comboService } from '../lib/supabase'
import { useCart } from '../context/CartContext'
import { Combo } from '../types'
import toast from 'react-hot-toast'

export default function Combos() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const { dispatch } = useCart()

  const { data: combos = [], isLoading } = useQuery({
    queryKey: ['combos', selectedCategory],
    queryFn: () => comboService.getCombos()
  })

  const categories = ['All', 'Birthday', 'Anniversary', 'Valentine', 'Luxury', 'Corporate']

  const addToCart = (combo: Combo) => {
    const price = combo.discount_price || 
      (combo.products?.reduce((sum, item) => {
        const productPrice = item.products?.price || 0
        return sum + (productPrice * item.quantity)
      }, 0) || 0)

    dispatch({
      type: 'ADD_ITEM',
      payload: {
        id: combo.id,
        type: 'combo',
        name: combo.name,
        price: price,
        quantity: 1,
        image_url: combo.image_url,
        combo
      }
    })
    toast.success('Combo added to cart!')
  }

  const calculateSavings = (combo: Combo) => {
    if (combo.discount_price) {
      const originalPrice = combo.products?.reduce((sum, item) => {
        const productPrice = item.products?.price || 0
        return sum + (productPrice * item.quantity)
      }, 0) || 0
      
      if (originalPrice > 0) {
        const savings = originalPrice - combo.discount_price
        const percentage = Math.round((savings / originalPrice) * 100)
        return { savings, percentage }
      }
    }
    return null
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Package className="w-8 h-8 text-primary-600" />
          <Sparkles className="w-8 h-8 text-yellow-500" />
          <Package className="w-8 h-8 text-purple-600" />
        </div>
        <h1 className="text-5xl font-serif font-bold text-gray-900 mb-4">
          Curated Gift Combos
        </h1>
        <p className="text-xl text-gray-600">
          Expertly crafted gift sets that make every occasion special
        </p>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap justify-center gap-3">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-6 py-2 rounded-full transition-all ${selectedCategory === category
              ? 'bg-primary-600 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Combos Grid */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-2xl h-64 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : combos.length > 0 ? (
        <motion.div 
          layout
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {combos.map((combo) => {
            const savings = calculateSavings(combo)
            
            return (
              <motion.div
                key={combo.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden hover:shadow-2xl transition-all duration-300"
              >
                {/* Image */}
                <div className="relative h-64 overflow-hidden">
                  <img
                    src={combo.image_url || 'https://images.unsplash.com/photo-1544716278-e513176f20b5'}
                    alt={combo.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  
                  {/* Savings Badge */}
                  {savings && (
                    <div className="absolute top-4 right-4 bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-full shadow-lg">
                      <div className="text-sm font-bold">Save {savings.percentage}%</div>
                      <div className="text-xs">₹{savings.savings.toLocaleString()} off</div>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">{combo.name}</h3>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm text-gray-600">4.9</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-6 line-clamp-2">
                    {combo.description}
                  </p>

                  {/* Products in Combo */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <Users className="w-4 h-4" />
                      <span>Includes {combo.products?.length || 0} premium items:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {combo.products?.slice(0, 3).map((item) => (
                        <span
                          key={item.product_id}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                        >
                          {item.quantity}x {item.products?.name.split(' ')[0]}
                        </span>
                      ))}
                      {combo.products && combo.products.length > 3 && (
                        <span className="px-3 py-1 bg-primary-100 text-primary-700 text-sm rounded-full">
                          +{combo.products.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      {combo.discount_price ? (
                        <>
                          <span className="text-2xl font-bold text-gray-900">
                            ₹{combo.discount_price.toLocaleString()}
                          </span>
                          {savings && (
                            <span className="text-gray-400 line-through ml-2">
                              ₹{(combo.discount_price + savings.savings).toLocaleString()}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-2xl font-bold text-gray-900">
                          ₹{combo.products?.reduce((sum, item) => {
                            const price = item.products?.price || 0
                            return sum + (price * item.quantity)
                          }, 0).toLocaleString()}
                        </span>
                      )}
                    </div>
                    
                    {combo.discount_percentage && (
                      <div className="flex items-center gap-2 text-green-600 font-semibold">
                        <Tag className="w-5 h-5" />
                        {combo.discount_percentage}% OFF
                      </div>
                    )}
                  </div>

                  {/* Add to Cart */}
                  <button
                    onClick={() => addToCart(combo)}
                    className="w-full bg-gradient-to-r from-primary-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Add to Cart
                  </button>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      ) : (
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <Package className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-2">No combos available</h3>
          <p className="text-gray-600">Check back soon for new curated gift sets!</p>
        </div>
      )}

      {/* CTA */}
      <div className="text-center pt-8">
        <div className="inline-block bg-gradient-to-r from-primary-50 to-purple-50 rounded-2xl p-8">
          <h3 className="text-2xl font-semibold mb-4">Want something more personal?</h3>
          <p className="text-gray-600 mb-6">Create your own custom gift combination</p>
          <button
            onClick={() => window.location.href = '/custom-combo'}
            className="bg-white text-primary-700 border-2 border-primary-200 px-8 py-3 rounded-xl font-semibold hover:bg-primary-50 transition-colors"
          >
            Build Custom Combo
          </button>
        </div>
      </div>
    </div>
  )
}