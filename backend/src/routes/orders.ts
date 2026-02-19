import express, { Request, Response, NextFunction } from "express";
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Get all orders (admin only)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get orders by email (customer)
router.get('/customer/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_email', email)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create COD order
router.post('/cod', async (req, res) => {
  try {
    const orderData = req.body;
    
    console.log('COD Order Data Received:', orderData);
    
    // Validate required fields
    if (!orderData.name || !orderData.email || !orderData.phone) {
      return res.status(400).json({ 
        error: 'Missing required customer information' 
      });
    }

    // Validate grand total is not negative
    if (orderData.total_amount < 0) {
      return res.status(400).json({ 
        error: 'Order total cannot be negative' 
      });
    }
    
    // Let Supabase generate UUID automatically
    const { data, error } = await supabase
      .from('orders')
      .insert({
        // Don't provide id - let Supabase generate it
        items: orderData.items,
        subtotal: orderData.subtotal,
        shipping_charge: orderData.shipping_charge,
        cod_charge: orderData.cod_charge,
        coupon_code: orderData.coupon_code,
        coupon_discount: orderData.coupon_discount,
        total_amount: orderData.total_amount,
        payment_method: 'cod',
        customer_name: orderData.name,
        customer_email: orderData.email,
        customer_phone: orderData.phone,
        shipping_address: orderData.address,
        shipping_city: orderData.city,
        shipping_state: orderData.state,
        shipping_pincode: orderData.pincode,
        special_requests: orderData.specialRequests,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('COD Order created:', data.id);

    // If coupon was used, track it
    if (orderData.coupon_code && orderData.coupon_discount > 0) {
      try {
        // Get coupon ID from code
        const { data: coupon } = await supabase
          .from('coupons')
          .select('id')
          .eq('code', orderData.coupon_code)
          .single();

        if (coupon) {
          // Track coupon usage
          await supabase
            .from('coupon_usage')
            .insert({
              coupon_id: coupon.id,
              order_id: data.id,
              customer_email: orderData.email,
              discount_amount: orderData.coupon_discount,
              used_at: new Date().toISOString()
            });

          // Increment coupon used count
          await supabase
            .from('coupons')
            .update({ 
              used_count: supabase.rpc('increment', { x: 1 }),
              updated_at: new Date().toISOString()
            })
            .eq('id', coupon.id);
        }
      } catch (couponError) {
        console.error('Error tracking coupon usage:', couponError);
        // Don't fail the order if coupon tracking fails
      }
    }

    res.json({ 
      success: true, 
      message: 'Order placed successfully',
      order: data 
    });
  } catch (error: any) {
    console.error('Error creating COD order:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Failed to create order'
    });
  }
});

// Update order status (admin only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, tracking_number, admin_notes } = req.body;
    
    const { data, error } = await supabase
      .from('orders')
      .update({
        status,
        tracking_number,
        admin_notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;