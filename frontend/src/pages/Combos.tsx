import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Sparkles } from 'lucide-react';
import { Combo, Gender } from '../types';
import { apiFetch } from '../utils/api';
import { Link, useNavigate } from 'react-router-dom';
import ComboCard from '../components/ComboCard';
import { comboMatchesGender } from '../utils/helpers';

export default function Combos() {
  const navigate = useNavigate();
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [genders, setGenders] = useState<Gender[]>([]);
  const [selectedGender, setSelectedGender] = useState<string>('all');

  useEffect(() => {
    fetchCombos();
    // Redirect shared link /combos?id=UUID to the combo page directly
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) {
      navigate(`/combo/${id}`, { replace: true });
    }
  }, []);

  const fetchCombos = async () => {
    try {
      setLoading(true);
      const [data, gendersData] = await Promise.all([
        apiFetch('/api/combos').catch(() => []),
        apiFetch('/api/genders').catch(() => []),
      ]);
      setCombos(data || []);
      setGenders(gendersData || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-premium-gold mx-auto mb-4" />
          <p className="text-gray-600">Loading amazing combos...</p>
        </div>
      </div>
    );
  }

  if (!combos || combos.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-premium-cream rounded-full mb-6">
            <Package className="h-12 w-12 text-premium-gold" />
          </div>
          <h1 className="text-3xl font-serif font-bold mb-4">No Combos Yet</h1>
          <p className="text-gray-600 mb-8">We're crafting some amazing gift combos for you. Check back soon!</p>
          <Link to="/products" className="px-6 py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  const filteredCombos = combos.filter(combo => comboMatchesGender(combo, selectedGender));

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3 mb-4"
        >
          <Package className="w-8 h-8 text-premium-gold" />
          <Sparkles className="w-8 h-8 text-yellow-500" />
          <Package className="w-8 h-8 text-purple-600" />
        </motion.div>
        <h1 className="text-5xl font-serif font-bold text-premium-charcoal mb-4">
          Curated Gift Combos
        </h1>
        <p className="text-xl text-gray-600">
          Expertly crafted gift sets that make every occasion special
        </p>
      </div>

      {/* Gender filter */}
      {genders.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          <span className="text-sm font-medium text-gray-600 mr-1">For</span>
          {[{ name: 'all', display_name: 'All', icon: '' }, ...genders.map(g => ({ name: g.name as string, display_name: g.display_name, icon: g.icon }))].map((gender) => (
            <button
              key={gender.name}
              onClick={() => setSelectedGender(gender.name)}
              className={`px-4 py-1.5 rounded-full text-sm flex items-center gap-1 transition-colors ${
                selectedGender === gender.name ? 'bg-premium-gold text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {gender.icon && <span>{gender.icon}</span>}
              <span>{gender.display_name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Combos Grid */}
      {filteredCombos.length > 0 ? (
        <motion.div layout className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredCombos.map((combo) => (
            <ComboCard
              key={combo.id}
              combo={combo}
            />
          ))}
        </motion.div>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-600 mb-4">No combos found for this selection.</p>
          <button onClick={() => setSelectedGender('all')} className="text-premium-gold hover:underline">
            Show all combos
          </button>
        </div>
      )}
    </div>
  );
}
