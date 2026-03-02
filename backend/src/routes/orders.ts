import express, { Request, Response, NextFunction } from "express";
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Function to generate custom order ID
async function generateCustomOrderId(): Promise<string> {
  try {
    // Get the latest custom order ID
    const { data: latestOrder, error } = await supabase
      .from('orders')
      .select('custom_order_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    let nextNumber = 100; // Start from 100 instead of 1
    
    if (latestOrder?.custom_order_id) {
      // Extract number from existing custom order ID (format: GFTD#101)
      const match = latestOrder.custom_order_id.match(/GFTD#(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    } else {
      // If no existing orders, check if there are any orders without custom_order_id
      // and generate IDs for them starting from 100
      const { data: ordersWithoutCustomId } = await supabase
        .from('orders')
        .select('id')
        .is('custom_order_id', null)
        .order('created_at', { ascending: true });

      if (ordersWithoutCustomId && ordersWithoutCustomId.length > 0) {
        // This will be handled by a migration script, but for new orders we start after the highest
        const { data: maxCustomId } = await supabase
          .from('orders')
          .select('custom_order_id')
          .not('custom_order_id', 'is', null)
          .order('custom_order_id', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (maxCustomId?.custom_order_id) {
          const match = maxCustomId.custom_order_id.match(/GFTD#(\d+)/);
          if (match) {
            nextNumber = parseInt(match[1]) + 1;
          }
        }
      }
    }

    // Format: GFTD#101, GFTD#102, etc.
    return `GFTD#${nextNumber}`;
  } catch (error) {
    console.error('Error generating custom order ID:', error);
    // Fallback to timestamp-based ID if generation fails
    return `GFTD#${Date.now()}`;
  }
}

// IMPORTANT: Place specific routes BEFORE parameterized routes

// Track order by custom ID and phone - UPDATED
router.get('/track', async (req: Request, res: Response) => {
  try {
    const { orderId, phone } = req.query;
    
    if (!orderId || !phone) {
      return res.status(400).json({ error: 'Order ID and phone number are required' });
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('custom_order_id', orderId) // Changed from 'id' to 'custom_order_id'
      .eq('customer_phone', phone)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Order not found' });
      }
      throw error;
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error tracking order:', error);
    res.status(500).json({ error: error.message });
  }
});

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

// Get order by UUID - MOVED DOWN (after specific routes)
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

// Get order by custom order ID (GFTD#101 format)
router.get('/custom/:customId', async (req, res) => {
  try {
    const { customId } = req.params;
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('custom_order_id', customId)
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

// Create COD order - UPDATED with custom order ID
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

    // Generate custom order ID
    const customOrderId = await generateCustomOrderId();
    
    // Let Supabase generate UUID automatically
    const { data, error } = await supabase
      .from('orders')
      .insert({
        // Don't provide id - let Supabase generate it
        custom_order_id: customOrderId, // Add custom order ID
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

    console.log('COD Order created:', data.id, 'Custom ID:', data.custom_order_id);

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
      order: {
        ...data,
        tracking_id: data.custom_order_id // Send custom ID to frontend
      }
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