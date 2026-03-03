import express from 'express';
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// ========== PUBLIC ROUTES ==========

// Get social proof for a product
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Get product settings from products table
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('social_proof_enabled, social_proof_text, social_proof_initial_count, social_proof_end_count')
      .eq('id', productId)
      .maybeSingle();

    if (productError) throw productError;

    // If social proof is disabled, return null
    if (!product?.social_proof_enabled) {
      return res.json({
        text_template: '',
        count: 0,
        initial_count: 0,
        end_count: 0,
        is_enabled: false,
        stats: { views: 0, purchases: 0 }
      });
    }

    // Get stats from social_proof_stats
    const { data: stats, error: statsError } = await supabase
      .from('social_proof_stats')
      .select('*')
      .eq('product_id', productId)
      .maybeSingle();

    if (statsError) throw statsError;

    // Calculate dynamic count based on real data
    const initialCount = product?.social_proof_initial_count || 5;
    const endCount = product?.social_proof_end_count || 15;
    
    let dynamicCount = initialCount;
    
    if (stats) {
      // Base formula: initial count + (views/5) + (purchases*2)
      // This creates realistic variation based on actual activity
      const viewsContribution = Math.floor((stats.view_count || 0) / 5);
      const purchasesContribution = (stats.purchase_count || 0) * 2;
      
      dynamicCount = Math.min(
        initialCount + viewsContribution + purchasesContribution,
        endCount
      );
    }

    // Ensure count doesn't go below initial
    dynamicCount = Math.max(dynamicCount, initialCount);

    res.json({
      text_template: product?.social_proof_text || '🔺 {count} people are viewing this right now',
      count: dynamicCount,
      initial_count: initialCount,
      end_count: endCount,
      is_enabled: true,
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
    
    const { data: existing, error: selectError } = await supabase
      .from('social_proof_stats')
      .select('*')
      .eq('product_id', product_id)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
      const { error: updateError } = await supabase
        .from('social_proof_stats')
        .update({
          view_count: (existing.view_count || 0) + 1,
          last_updated: new Date().toISOString()
        })
        .eq('product_id', product_id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('social_proof_stats')
        .insert({
          product_id,
          view_count: 1,
          purchase_count: 0,
          last_updated: new Date().toISOString()
        });

      if (insertError) throw insertError;
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
    
    const { data: existing, error: selectError } = await supabase
      .from('social_proof_stats')
      .select('*')
      .eq('product_id', product_id)
      .maybeSingle();

    if (selectError) throw selectError;

    if (existing) {
      const { error: updateError } = await supabase
        .from('social_proof_stats')
        .update({
          purchase_count: (existing.purchase_count || 0) + 1,
          last_updated: new Date().toISOString()
        })
        .eq('product_id', product_id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('social_proof_stats')
        .insert({
          product_id,
          view_count: 0,
          purchase_count: 1,
          last_updated: new Date().toISOString()
        });

      if (insertError) throw insertError;
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
      product_name: stat.products?.name || 'Unknown',
      view_count: stat.view_count || 0,
      purchase_count: stat.purchase_count || 0,
      conversion_rate: stat.view_count > 0 
        ? ((stat.purchase_count / stat.view_count) * 100).toFixed(1)
        : 0,
      social_proof: {
        enabled: stat.products?.social_proof_enabled || false,
        text: stat.products?.social_proof_text || '🔺 {count} people are viewing this right now',
        initial_count: stat.products?.social_proof_initial_count || 5,
        end_count: stat.products?.social_proof_end_count || 15
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

    const { data, error } = await supabase
      .from('products')
      .update({
        social_proof_text: text_template,
        social_proof_initial_count: parseInt(initial_count),
        social_proof_end_count: parseInt(end_count),
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
      text_template: data.social_proof_text || '🔺 {count} people are viewing this right now',
      initial_count: data.social_proof_initial_count || 5,
      end_count: data.social_proof_end_count || 15
    });
  } catch (error: any) {
    console.error('Error fetching social proof settings:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;