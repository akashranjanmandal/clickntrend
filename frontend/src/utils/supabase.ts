import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';

export const supabase = createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY
);

// Helper function to fetch products directly from Supabase
export const fetchProductsDirectly = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

// Helper function to fetch combos directly
export const fetchCombosDirectly = async () => {
  try {
    const { data, error } = await supabase
      .from('combos')
      .select(`
        *,
        combo_products (
          product:products (*)
        )
      `)
      .eq('is_active', true);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching combos:', error);
    return [];
  }
};