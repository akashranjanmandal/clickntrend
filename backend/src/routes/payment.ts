import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import config from '../config';
import { supabase } from '../utils/supabase';

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
      amount: Math.round(amount * 100), // Convert to paise
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

// Verify payment
router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_data } = req.body;
    
    console.log('=== PAYMENT VERIFICATION START ===');
    console.log('Order ID:', razorpay_order_id);
    console.log('Payment ID:', razorpay_payment_id);
    console.log('Order data received:', order_data);

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

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(body.toString())
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (isValid) {
      console.log('✅ Payment signature verified');
      
      // Save order to database
      console.log('Saving order to database...');
      
      const orderRecord = {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        items: order_data.items,
        subtotal: order_data.subtotal,
        shipping_charge: order_data.shipping_charge,
        coupon_code: order_data.coupon_code,
        coupon_discount: order_data.coupon_discount,
        total_amount: order_data.total_amount,
        customer_name: order_data.name,
        customer_email: order_data.email,
        customer_phone: order_data.phone,
        special_requests: order_data.specialRequests || '',
        shipping_address: order_data.address,
        shipping_city: order_data.city,
        shipping_state: order_data.state,
        shipping_pincode: order_data.pincode,
        shipping_country: 'India',
        payment_method: 'online',
        status: 'paid',
        paid_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Order record to insert:', orderRecord);

      const { data: order, error } = await supabase
        .from('orders')
        .insert(orderRecord)
        .select()
        .single();

      if (error) {
        console.error('❌ Database insert error:', error);
        throw error;
      }

      console.log('✅ Order saved to database:', order.id);

      // Track coupon usage if applicable
      if (order_data.coupon_code && order_data.coupon_discount > 0) {
        try {
          const { data: coupon } = await supabase
            .from('coupons')
            .select('id')
            .eq('code', order_data.coupon_code)
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
            
            console.log('✅ Coupon usage tracked');
          }
        } catch (couponError) {
          console.error('Error tracking coupon:', couponError);
        }
      }

      console.log('=== PAYMENT VERIFICATION END ===');
      
      res.json({ 
        success: true, 
        message: 'Payment verified successfully',
        order_id: order.id,
        payment_id: razorpay_payment_id
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

export default router;