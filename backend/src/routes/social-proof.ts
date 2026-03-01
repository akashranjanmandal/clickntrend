import express from 'express';
import { supabase, supabasePublic } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// ========== PUBLIC ROUTES ==========

// Get social proof for a product
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Get product settings from products table directly (since we added fields to products)
    const { data: product, error: productError } = await supabasePublic
      .from('products')
      .select('social_proof_enabled, social_proof_text, social_proof_initial_count, social_proof_end_count')
      .eq('id', productId)
      .maybeSingle();

    if (productError) throw productError;

    // Get stats from social_proof_stats
    const { data: stats, error: statsError } = await supabasePublic
      .from('social_proof_stats')
      .select('*')
      .eq('product_id', productId)
      .maybeSingle();

    if (statsError) throw statsError;

    // Generate a random count between initial and end
    const initialCount = product?.social_proof_initial_count || 5;
    const endCount = product?.social_proof_end_count || 15;
    const randomCount = Math.floor(Math.random() * (endCount - initialCount + 1)) + initialCount;

    res.json({
      text_template: product?.social_proof_text || '🔺{count} People are Purchasing Right Now',
      count: randomCount,
      initial_count: initialCount,
      end_count: endCount,
      is_enabled: product?.social_proof_enabled !== false,
      stats: {
        views: stats?.view_count || 0,
        purchases: stats?.purchase_count || 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching social proof:', error);
    res.status(500).json({ error: error.message });
  }
});

// Track product view
router.post('/track-view', async (req, res) => {
  try {
    const { product_id } = req.body;
    
    const { data: existing } = await supabase
      .from('social_proof_stats')
      .select('*')
      .eq('product_id', product_id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('social_proof_stats')
        .update({
          view_count: (existing.view_count || 0) + 1,
          last_updated: new Date().toISOString()
        })
        .eq('product_id', product_id);
    } else {
      await supabase
        .from('social_proof_stats')
        .insert({
          product_id,
          view_count: 1,
          purchase_count: 0,
          last_updated: new Date().toISOString()
        });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking view:', error);
    res.status(500).json({ error: error.message });
  }
});

// Track purchase
router.post('/track-purchase', async (req, res) => {
  try {
    const { product_id } = req.body;
    
    const { data: existing } = await supabase
      .from('social_proof_stats')
      .select('*')
      .eq('product_id', product_id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('social_proof_stats')
        .update({
          purchase_count: (existing.purchase_count || 0) + 1,
          last_updated: new Date().toISOString()
        })
        .eq('product_id', product_id);
    } else {
      await supabase
        .from('social_proof_stats')
        .insert({
          product_id,
          view_count: 0,
          purchase_count: 1,
          last_updated: new Date().toISOString()
        });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking purchase:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN ROUTES ==========

// Get all social proof stats
router.get('/admin/stats', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('social_proof_stats')
      .select(`
        *,
        products:product_id (
          name,
          price,
          social_proof_initial_count,
          social_proof_end_count,
          social_proof_text,
          social_proof_enabled
        )
      `)
      .order('last_updated', { ascending: false });

    if (error) throw error;

    const formattedData = data?.map(stat => ({
      product_id: stat.product_id,
      product_name: stat.products?.[0]?.name || 'Unknown',
      view_count: stat.view_count || 0,
      purchase_count: stat.purchase_count || 0,
      conversion_rate: stat.view_count > 0 
        ? ((stat.purchase_count / stat.view_count) * 100).toFixed(1)
        : 0,
      social_proof: {
        enabled: stat.products?.[0]?.social_proof_enabled || false,
        text: stat.products?.[0]?.social_proof_text || '🔺{count} People are Purchasing Right Now',
        initial_count: stat.products?.[0]?.social_proof_initial_count || 5,
        end_count: stat.products?.[0]?.social_proof_end_count || 15
      }
    })) || [];

    res.json(formattedData);
  } catch (error: any) {
    console.error('Error fetching social proof stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update social proof settings for a product
router.put('/admin/settings/:productId', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { text_template, initial_count, end_count, is_enabled } = req.body;

    // Update the products table directly
    const { data, error } = await supabase
      .from('products')
      .update({
        social_proof_text: text_template,
        social_proof_initial_count: initial_count,
        social_proof_end_count: end_count,
        social_proof_enabled: is_enabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error updating social proof settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get social proof settings for a product
router.get('/admin/settings/:productId', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;

    const { data, error } = await supabase
      .from('products')
      .select('social_proof_enabled, social_proof_text, social_proof_initial_count, social_proof_end_count')
      .eq('id', productId)
      .single();

    if (error) throw error;

    res.json({
      is_enabled: data.social_proof_enabled !== false,
      text_template: data.social_proof_text || '🔺{count} People are Purchasing Right Now',
      initial_count: data.social_proof_initial_count || 5,
      end_count: data.social_proof_end_count || 15
    });
  } catch (error: any) {
    console.error('Error fetching social proof settings:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;