import express, { Request, Response, NextFunction } from "express";
import { supabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';
import { sendOrderConfirmationEmail, sendAdminNotification } from '../services/gmailService';

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

// Track order by custom order ID and phone
router.get('/track', async (req: Request, res: Response) => {
  try {
    const { orderId, phone } = req.query;
    
    if (!orderId || !phone) {
      return res.status(400).json({ error: 'Order ID and phone number are required' });
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('custom_order_id', orderId)
      .eq('customer_phone', phone)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Order not found' });
      }
      throw error;
    }

    // Return only necessary fields for tracking
    const trackingInfo = {
      custom_order_id: data.custom_order_id,
      status: data.status,
      customer_name: data.customer_name,
      total_amount: data.total_amount,
      payment_method: data.payment_method,
      created_at: data.created_at,
      estimated_delivery: new Date(new Date(data.created_at).setDate(new Date(data.created_at).getDate() + 5)).toISOString().split('T')[0],
      items: data.items.map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      }))
    };

    res.json(trackingInfo);
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

// Get order by UUID
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

// Create COD order - with custom order ID and email notifications
router.post('/cod', async (req, res) => {
  try {
    const orderData = req.body;
    
    console.log('📦 COD Order Data Received:', orderData);
    
    // Validate required fields
    if (!orderData.name || !orderData.email || !orderData.phone) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required customer information' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(orderData.email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate phone number (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(orderData.phone.replace(/\D/g, ''))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number. Please enter 10 digits'
      });
    }

    // Validate grand total is not negative
    if (orderData.total_amount < 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Order total cannot be negative' 
      });
    }

    // Validate items array
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Order must contain at least one item'
      });
    }

    // Generate custom order ID
    const customOrderId = await generateCustomOrderId();
    
    // Prepare order data for insert
    const orderToInsert = {
      custom_order_id: customOrderId,
      items: orderData.items,
      subtotal: Number(orderData.subtotal) || 0,
      shipping_charge: Number(orderData.shipping_charge) || 0,
      cod_charge: Number(orderData.cod_charge) || 0,
      coupon_code: orderData.coupon_code || null,
      coupon_discount: Number(orderData.coupon_discount) || 0,
      total_amount: Number(orderData.total_amount) || 0,
      payment_method: 'cod',
      customer_name: orderData.name.trim(),
      customer_email: orderData.email.trim().toLowerCase(),
      customer_phone: orderData.phone.replace(/\D/g, ''),
      shipping_address: orderData.address.trim(),
      shipping_city: orderData.city.trim(),
      shipping_state: orderData.state.trim(),
      shipping_pincode: orderData.pincode.trim(),
      special_requests: orderData.specialRequests?.trim() || '',
      status: 'pending',
      paid_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📝 Inserting order:', orderToInsert);

    // Insert order into database
    const { data, error } = await supabase
      .from('orders')
      .insert(orderToInsert)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase error:', error);
      throw error;
    }

    console.log('✅ COD Order created:', data.id, 'Custom ID:', data.custom_order_id);

    // If coupon was used, track it
    if (orderData.coupon_code && orderData.coupon_discount > 0) {
      try {
        // Get coupon ID from code
        const { data: coupon } = await supabase
          .from('coupons')
          .select('id, code')
          .eq('code', orderData.coupon_code.toUpperCase())
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
          
          console.log('✅ Coupon usage tracked for order:', data.id);
        }
      } catch (couponError) {
        console.error('⚠️ Error tracking coupon usage:', couponError);
        // Don't fail the order if coupon tracking fails
      }
    }

    // Send email confirmation to customer (non-blocking)
    console.log('📧 Sending confirmation email to:', data.customer_email);
    
    // Prepare order data for email
    const emailOrderData = {
      id: data.id,
      custom_order_id: data.custom_order_id,
      customer_email: data.customer_email,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      items: data.items,
      subtotal: data.subtotal,
      shipping_charge: data.shipping_charge,
      coupon_discount: data.coupon_discount,
      total_amount: data.total_amount,
      payment_method: 'cod',
      shipping_address: data.shipping_address,
      shipping_city: data.shipping_city,
      shipping_state: data.shipping_state,
      shipping_pincode: data.shipping_pincode,
      special_requests: data.special_requests,
      created_at: data.created_at
    };

    // Send emails asynchronously - don't await to not delay response
    Promise.allSettled([
      // Send customer confirmation
      sendOrderConfirmationEmail(emailOrderData).then(result => {
        if (result.success) {
          console.log('✅ Customer email sent for order:', data.custom_order_id);
        } else {
          console.error('❌ Failed to send customer email:', result.error);
        }
      }),
      
      // Send admin notification
      sendAdminNotification(emailOrderData).then(() => {
        console.log('✅ Admin notification sent for order:', data.custom_order_id);
      }).catch(err => {
        console.error('❌ Failed to send admin notification:', err);
      })
    ]).then(results => {
      console.log('📧 Email sending completed:', results.map(r => r.status));
    });

    // Return success response
    res.status(201).json({ 
      success: true, 
      message: 'Order placed successfully',
      order: {
        id: data.id,
        custom_order_id: data.custom_order_id,
        tracking_id: data.custom_order_id, // Send custom ID to frontend for tracking
        total_amount: data.total_amount,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        created_at: data.created_at,
        status: data.status,
        payment_method: 'cod'
      }
    });

  } catch (error: any) {
    console.error('❌ Error creating COD order:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to create order',
      details: 'An error occurred while processing your order. Please try again.'
    });
  }
});

// Update order status (admin only)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, tracking_number, admin_notes } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const { data, error } = await supabase
      .from('orders')
      .update({
        status: status || undefined,
        tracking_number: tracking_number || undefined,
        admin_notes: admin_notes || undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // TODO: Send status update email to customer if status changed
    // This can be implemented later
    
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get order statistics (admin only)
router.get('/stats/summary', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('status, total_amount, payment_method, created_at');

    if (error) throw error;

    const stats = {
      total_orders: data.length,
      total_revenue: data.reduce((sum, order) => sum + (order.status !== 'cancelled' ? order.total_amount : 0), 0),
      by_status: {} as Record<string, number>,
      by_payment: {} as Record<string, number>,
      today_orders: 0,
      pending_orders: 0
    };

    const today = new Date().toISOString().split('T')[0];

    data.forEach(order => {
      // Count by status
      stats.by_status[order.status] = (stats.by_status[order.status] || 0) + 1;
      
      // Count by payment method
      stats.by_payment[order.payment_method] = (stats.by_payment[order.payment_method] || 0) + 1;
      
      // Count today's orders
      if (order.created_at.startsWith(today)) {
        stats.today_orders++;
      }
      
      // Count pending orders
      if (order.status === 'pending') {
        stats.pending_orders++;
      }
    });

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;