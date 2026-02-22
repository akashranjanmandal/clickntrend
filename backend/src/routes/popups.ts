import express from 'express';
import { supabase, supabasePublic } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// ========== PUBLIC ROUTES ==========

// Get active popup
router.get('/active', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabasePublic
      .from('popup_config')
      .select('*')
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    res.json(data || null);
  } catch (error: any) {
    console.error('Error fetching active popup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Track popup view
router.post('/track-view', async (req, res) => {
  try {
    const { popup_id, session_id } = req.body;
    
    const { error } = await supabase
      .from('popup_display_stats')
      .insert({
        popup_id,
        session_id,
        viewed_at: new Date().toISOString()
      });

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking popup view:', error);
    res.status(500).json({ error: error.message });
  }
});

// Track popup click
router.post('/track-click', async (req, res) => {
  try {
    const { popup_id, session_id } = req.body;
    
    const { error } = await supabase
      .from('popup_display_stats')
      .update({ clicked_at: new Date().toISOString() })
      .eq('popup_id', popup_id)
      .eq('session_id', session_id)
      .is('clicked_at', null);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking popup click:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ADMIN ROUTES ==========

// Get all popups
router.get('/admin', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('popup_config')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error('Error fetching popups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create popup
router.post('/admin', requireAuth, async (req, res) => {
  try {
    const popupData = req.body;
    
    const { data, error } = await supabase
      .from('popup_config')
      .insert({
        ...popupData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error creating popup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update popup
router.put('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('popup_config')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error updating popup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete popup
router.delete('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Delete related stats first
    await supabase
      .from('popup_display_stats')
      .delete()
      .eq('popup_id', id);
    
    const { error } = await supabase
      .from('popup_config')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting popup:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get popup stats
router.get('/admin/:id/stats', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('popup_display_stats')
      .select('*')
      .eq('popup_id', id)
      .order('viewed_at', { ascending: false });

    if (error) throw error;
    
    const totalViews = data?.length || 0;
    const totalClicks = data?.filter(d => d.clicked_at).length || 0;
    const conversionRate = totalViews > 0 ? (totalClicks / totalViews) * 100 : 0;

    res.json({
      totalViews,
      totalClicks,
      conversionRate: conversionRate.toFixed(1),
      stats: data
    });
  } catch (error: any) {
    console.error('Error fetching popup stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;