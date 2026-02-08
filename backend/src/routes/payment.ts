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
router.post('/create-order', async (req: express.Request, res: express.Response) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    
    console.log('Creating Razorpay order:', { amount, currency, receipt });

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

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
    res.status(500).json({ 
      error: 'Failed to create order', 
      details: error.message || 'Unknown error'
    });
  }
});

// Verify payment and save order
router.post('/verify-payment', async (req: express.Request, res: express.Response) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      order_data 
    } = req.body;
    
    console.log('=== PAYMENT VERIFICATION START ===');
    console.log('Order ID:', razorpay_order_id);
    console.log('Payment ID:', razorpay_payment_id);
    console.log('Order data:', JSON.stringify(order_data, null, 2));

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('Missing payment details');
      return res.status(400).json({ 
        success: false, 
        error: 'Missing payment details' 
      });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      console.error('Invalid signature');
      console.log('Expected:', expectedSignature);
      console.log('Received:', razorpay_signature);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid payment signature' 
      });
    }

    console.log('✅ Payment signature verified');

    // Save order to database
    try {
      console.log('Saving order to database...');
      
      const orderRecord = {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        items: order_data.items || [],
        total_amount: order_data.total_amount || 0,
        customer_name: order_data.customer_name || '',
        customer_email: order_data.customer_email || '',
        customer_phone: order_data.customer_phone || '',
        special_requests: order_data.specialRequests || '',
        shipping_address: order_data.address || '',
        shipping_city: order_data.city || '',
        shipping_state: order_data.state || '',
        shipping_pincode: order_data.pincode || '',
        shipping_country: 'India',
        status: 'paid',
        paid_at: new Date().toISOString()
      };

      console.log('Order record:', orderRecord);

      const { data: savedOrder, error: dbError } = await supabase
        .from('orders')
        .insert(orderRecord)
        .select()
        .single();

      if (dbError) {
        console.error('❌ Database error:', dbError);
        throw dbError;
      }

      console.log('✅ Order saved to database:', savedOrder.id);

      // Also save order items for analytics
      if (order_data.items && Array.isArray(order_data.items)) {
        const orderItems = order_data.items.map((item: any) => ({
          order_id: savedOrder.id,
          product_id: item.id || 'custom',
          quantity: item.quantity || 1,
          price: item.price || 0,
          created_at: new Date().toISOString()
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) {
          console.error('Failed to save order items:', itemsError);
        } else {
          console.log('✅ Order items saved');
        }
      }

      res.json({ 
        success: true, 
        message: 'Payment verified and order saved successfully',
        order_id: savedOrder.id,
        order: savedOrder
      });

    } catch (dbError: any) {
      console.error('❌ Database save error:', dbError);
      // Even if DB save fails, payment was successful
      res.json({ 
        success: true, 
        message: 'Payment verified but order save failed. Please contact support.',
        error: dbError.message,
        razorpay_order_id,
        razorpay_payment_id
      });
    }

    console.log('=== PAYMENT VERIFICATION END ===');
    
  } catch (error: any) {
    console.error('🚨 Payment verification error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Payment verification failed',
      details: error.message || 'Unknown error'
    });
  }
});

export default router;