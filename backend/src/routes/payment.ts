import express, { Request, Response } from "express";
import Razorpay from 'razorpay';
import crypto from 'crypto';
import config from '../config';
import { supabase } from '../utils/supabase';
import { sendOrderConfirmationEmail, sendAdminNotification } from '../services/gmailService';

const router = express.Router();

const razorpay = new Razorpay({
  key_id: config.razorpayKeyId,
  key_secret: config.razorpayKeySecret
});

// Create order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    
    // Validate amount is not negative
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    console.log('Creating Razorpay order:', { amount, currency, receipt });

    const options = {
      amount: Math.round(amount), // Already in paise from frontend
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);
    
    console.log('Razorpay order created:', order.id);
    
    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt
    });
  } catch (error: any) {
    console.error('Razorpay order error:', error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

// ===========================================
// VERIFY PAYMENT AND SEND EMAILS
// ===========================================
router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_data } = req.body;
    
    console.log('=== PAYMENT VERIFICATION START ===');
    console.log('Order ID:', razorpay_order_id);
    console.log('Payment ID:', razorpay_payment_id);
    console.log('Customer Email:', order_data?.email);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing payment details' });
    }

    // Validate order_data has required fields
    if (!order_data || !order_data.name || !order_data.email || !order_data.phone) {
      console.error('Missing customer data in order_data:', order_data);
      return res.status(400).json({ 
        success: false, 
        error: 'Missing customer information' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(order_data.email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate phone number (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(order_data.phone.replace(/\D/g, ''))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number. Please enter 10 digits'
      });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(body.toString())
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (isValid) {
      console.log('✅ Payment signature verified successfully');
      
      // Save order to database
      console.log('Saving order to database...');
      
      const orderRecord = {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        items: order_data.items,
        subtotal: order_data.subtotal,
        shipping_charge: order_data.shipping_charge || 0,
        coupon_code: order_data.coupon_code || null,
        coupon_discount: order_data.coupon_discount || 0,
        total_amount: order_data.total_amount,
        customer_name: order_data.name.trim(),
        customer_email: order_data.email.trim().toLowerCase(),
        customer_phone: order_data.phone.replace(/\D/g, ''),
        special_requests: order_data.special_requests || '',
        shipping_address: order_data.address.trim(),
        shipping_city: order_data.city.trim(),
        shipping_state: order_data.state.trim(),
        shipping_pincode: order_data.pincode.trim(),
        shipping_country: 'India',
        payment_method: 'online',
        status: 'paid',
        paid_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Order record prepared for insertion');

      const { data: order, error } = await supabase
        .from('orders')
        .insert(orderRecord)
        .select()
        .single();

      if (error) {
        console.error('❌ Database insert error:', error);
        throw error;
      }

      console.log('✅ Order saved to database successfully!');
      console.log('📋 Order ID:', order.id);
      console.log('🔖 Custom Order ID:', order.custom_order_id);
      console.log('📧 Customer Email:', order.customer_email);

      // Track coupon usage if applicable
      if (order_data.coupon_code && order_data.coupon_discount > 0) {
        try {
          const { data: coupon } = await supabase
            .from('coupons')
            .select('id')
            .eq('code', order_data.coupon_code.toUpperCase())
            .single();

          if (coupon) {
            await supabase
              .from('coupon_usage')
              .insert({
                coupon_id: coupon.id,
                order_id: order.id,
                customer_email: order_data.email,
                discount_amount: order_data.coupon_discount,
                used_at: new Date().toISOString()
              });

            await supabase
              .from('coupons')
              .update({ 
                used_count: supabase.rpc('increment', { x: 1 }),
                updated_at: new Date().toISOString()
              })
              .eq('id', coupon.id);
            
            console.log('✅ Coupon usage tracked for order:', order.id);
          }
        } catch (couponError) {
          console.error('⚠️ Error tracking coupon:', couponError);
          // Don't fail the order if coupon tracking fails
        }
      }

      // ===========================================
      // SEND EMAIL NOTIFICATIONS (ASYNC)
      // ===========================================
      console.log('📧 Preparing to send email notifications...');
      
      // Prepare order data for email
      const emailOrderData = {
        id: order.id,
        custom_order_id: order.custom_order_id,
        customer_email: order.customer_email,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        items: order.items,
        subtotal: order.subtotal,
        shipping_charge: order.shipping_charge,
        coupon_discount: order.coupon_discount,
        total_amount: order.total_amount,
        payment_method: 'online',
        shipping_address: order.shipping_address,
        shipping_city: order.shipping_city,
        shipping_state: order.shipping_state,
        shipping_pincode: order.shipping_pincode,
        special_requests: order.special_requests,
        created_at: order.created_at
      };

      // Send emails asynchronously - don't await to not delay response
      Promise.allSettled([
        // Send customer confirmation
        sendOrderConfirmationEmail(emailOrderData).then(result => {
          if (result.success) {
            console.log('✅ Customer email sent successfully for order:', order.custom_order_id);
            console.log('📬 Message ID:', result.messageId);
          } else {
            console.error('❌ Failed to send customer email:', result.error);
          }
        }),
        
        // Send admin notification
        sendAdminNotification(emailOrderData).then(result => {
          if (result.success) {
            console.log('✅ Admin notification sent successfully for order:', order.custom_order_id);
          } else {
            console.error('❌ Failed to send admin notification:', result.error);
          }
        })
      ]).then(results => {
        console.log('📧 Email sending completed for order:', order.custom_order_id);
        console.log('Results:', results.map(r => r.status));
      });

      console.log('=== PAYMENT VERIFICATION END ===');
      
      res.json({ 
        success: true, 
        message: 'Payment verified successfully',
        order: {
          id: order.id,
          custom_order_id: order.custom_order_id,
          tracking_id: order.custom_order_id,
          payment_id: razorpay_payment_id,
          amount: order.total_amount,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          created_at: order.created_at
        }
      });
    } else {
      console.log('❌ Invalid payment signature');
      res.status(400).json({ 
        success: false, 
        error: 'Invalid payment signature' 
      });
    }
  } catch (error: any) {
    console.error('❌ Payment verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Payment verification failed',
      details: error.message 
    });
  }
});

// Get payment details by order ID
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const { data, error } = await supabase
      .from('orders')
      .select('razorpay_order_id, razorpay_payment_id, payment_method, status, total_amount, custom_order_id')
      .eq('razorpay_order_id', orderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Order not found' });
      }
      throw error;
    }

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Refund payment (admin only)
router.post('/refund/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { amount, notes } = req.body;

    // Validate payment exists in our database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('razorpay_payment_id', paymentId)
      .single();

    if (orderError) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Process refund with Razorpay
    const refund = await razorpay.payments.refund(paymentId, {
      amount: amount ? Math.round(amount * 100) : undefined, // Convert to paise if amount specified
      notes: {
        order_id: order.id,
        custom_order_id: order.custom_order_id,
        reason: notes || 'Customer requested refund'
      }
    });

    // Update order status in database
    await supabase
      .from('orders')
      .update({
        status: 'refunded',
        refund_data: refund,
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    console.log('✅ Refund processed for order:', order.custom_order_id);

    res.json({
      success: true,
      message: 'Refund processed successfully',
      refund
    });

  } catch (error: any) {
    console.error('Refund error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to process refund',
      details: error.message 
    });
  }
});

export default router;