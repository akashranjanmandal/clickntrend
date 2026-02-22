import express from 'express';
import { supabase, supabasePublic } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// ========== PUBLIC ROUTES ==========

// Get social proof for a product
router.get('/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Get product settings
    const { data: settings, error: settingsError } = await supabasePublic
      .from('social_proof_settings')
      .select('*')
      .eq('product_id', productId)
      .maybeSingle();

    if (settingsError) throw settingsError;

    // Get stats
    const { data: stats, error: statsError } = await supabasePublic
      .from('social_proof_stats')
      .select('*')
      .eq('product_id', productId)
      .maybeSingle();

    if (statsError) throw statsError;

    res.json({
      text_template: settings?.text_template || '🔺{count} People are Purchasing Right Now',
      count: stats?.purchase_count || settings?.count || 9,
      is_enabled: settings?.is_enabled !== false
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
          price
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
        : 0
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
    const { text_template, count, is_enabled } = req.body;

    const { data, error } = await supabase
      .from('social_proof_settings')
      .upsert({
        product_id: productId,
        text_template,
        count,
        is_enabled,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error updating social proof settings:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;