import express from 'express';
import { supabase, supabasePublic } from '../utils/supabase';

const router = express.Router();

console.log('✅ public popups routes loaded');

// Get active popup (public)
router.get('/active', async (_req, res) => {
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
  } catch (err: any) {
    console.error('Error fetching active popup:', err);
    res.status(500).json({ error: err.message });
  }
});

// Track popup view (public)
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
  } catch (err: any) {
    console.error('Error tracking popup view:', err);
    res.status(500).json({ error: err.message });
  }
});

// Track popup click (public)
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
  } catch (err: any) {
    console.error('Error tracking popup click:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;