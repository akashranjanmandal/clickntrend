import express from 'express';
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Get all coupons (admin only)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get active coupons for checkout (public)
router.get('/active', async (req, res) => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('coupons')
      .select('code, description, discount_type, discount_value, min_order_amount, max_discount_amount')
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching active coupons:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create coupon (admin only)
router.post('/', requireAuth, async (req, res) => {
  try {
    const couponData = req.body;
    
    const { data, error } = await supabase
      .from('coupons')
      .insert({
        ...couponData,
        used_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update coupon (admin only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { data, error } = await supabase
      .from('coupons')
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
    console.error('Error updating coupon:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete coupon (admin only)
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // First delete coupon usage records
    await supabase
      .from('coupon_usage')
      .delete()
      .eq('coupon_id', id);
    
    // Then delete the coupon
    const { error } = await supabase
      .from('coupons')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ error: error.message });
  }
});

// Validate coupon (public)
router.post('/validate', async (req, res) => {
  try {
    const { code, subtotal, email, categories } = req.body;

    if (!code) {
      return res.status(400).json({ valid: false, message: 'Coupon code is required' });
    }

    // Get coupon
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !coupon) {
      return res.status(404).json({ valid: false, message: 'Invalid coupon code' });
    }

    // Check if coupon is expired
    if (coupon.end_date && new Date(coupon.end_date) < new Date()) {
      return res.status(400).json({ valid: false, message: 'Coupon has expired' });
    }

    // Check if coupon is started
    if (coupon.start_date && new Date(coupon.start_date) > new Date()) {
      return res.status(400).json({ valid: false, message: 'Coupon is not active yet' });
    }

    // Check minimum order amount
    if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
      return res.status(400).json({ 
        valid: false, 
        message: `Minimum order amount should be ₹${coupon.min_order_amount}` 
      });
    }

    // Check usage limit
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({ valid: false, message: 'Coupon usage limit exceeded' });
    }

    // Check per user limit if email provided
    if (email && coupon.per_user_limit) {
      const { count, error: usageError } = await supabase
        .from('coupon_usage')
        .select('*', { count: 'exact', head: true })
        .eq('coupon_id', coupon.id)
        .eq('customer_email', email);

      if (!usageError && count && count >= coupon.per_user_limit) {
        return res.status(400).json({ 
          valid: false, 
          message: `You have already used this coupon ${count} times` 
        });
      }
    }

    // Check applicable categories
    if (coupon.applicable_categories && coupon.applicable_categories.length > 0 && categories?.length > 0) {
      const hasApplicableCategory = categories.some((cat: string) => 
        coupon.applicable_categories.includes(cat)
      );
      if (!hasApplicableCategory) {
        return res.status(400).json({ 
          valid: false, 
          message: 'Coupon not applicable for items in your cart' 
        });
      }
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = (subtotal * coupon.discount_value) / 100;
      if (coupon.max_discount_amount) {
        discountAmount = Math.min(discountAmount, coupon.max_discount_amount);
      }
    } else {
      discountAmount = coupon.discount_value;
    }

    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        discount_amount: discountAmount
      }
    });

  } catch (error: any) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ valid: false, message: 'Error validating coupon' });
  }
});

// Track coupon usage (internal - called after successful order)
router.post('/track-usage', async (req, res) => {
  try {
    const { coupon_id, order_id, customer_email, discount_amount } = req.body;

    // Insert usage record
    const { error: usageError } = await supabase
      .from('coupon_usage')
      .insert({
        coupon_id,
        order_id,
        customer_email,
        discount_amount,
        used_at: new Date().toISOString()
      });

    if (usageError) throw usageError;

    // Increment used count
    const { error: updateError } = await supabase
      .from('coupons')
      .update({ 
        used_count: supabase.rpc('increment', { x: 1 }),
        updated_at: new Date().toISOString()
      })
      .eq('id', coupon_id);

    if (updateError) throw updateError;

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking coupon usage:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;