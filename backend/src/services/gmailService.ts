import nodemailer from 'nodemailer';
import config from '../config';
import { getOrderConfirmationEmailHTML, getOrderConfirmationEmailText } from '../utils/emailTemplates';

interface OrderData {
  id: string;
  custom_order_id?: string;
  customer_email: string;
  customer_name: string;
  items: any[];
  subtotal: number;
  shipping_charge: number;
  coupon_discount: number;
  total_amount: number;
  payment_method: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_pincode: string;
  customer_phone: string;
  special_requests?: string;
  created_at: string;
}

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.gmailUser,
    pass: config.gmailAppPassword
  }
});

// Verify connection - Fixed: Added proper types for parameters
transporter.verify((error: Error | null, success: boolean) => {
  if (error) {
    console.error('❌ Gmail SMTP connection error:', error);
  } else {
    console.log('✅ Gmail SMTP server is ready to send emails');
  }
});

export const sendOrderConfirmationEmail = async (orderData: OrderData) => {
  try {
    console.log('📧 Sending order confirmation email to:', orderData.customer_email);

    const mailOptions = {
      from: `"GFTD" <${config.gmailUser}>`,
      to: orderData.customer_email,
      cc: ['care@gftd.in'],
      subject: `🎉 Order Confirmed! ${orderData.custom_order_id || '#' + orderData.id} - GFTD`,
      html: getOrderConfirmationEmailHTML(orderData),
      text: getOrderConfirmationEmailText(orderData),
      headers: {
        'X-Order-ID': orderData.id,
        'X-Custom-Order-ID': orderData.custom_order_id || '',
        'X-Priority': '1'
      }
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully!');
    console.log('📬 Message ID:', info.messageId);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const err = error as Error;
    console.error('❌ Failed to send email:', err);
    return { success: false, error: err.message };
  }
};

export const sendAdminNotification = async (orderData: OrderData) => {
  try {
    const orderDisplayId = orderData.custom_order_id || '#' + orderData.id;
    
    const adminMailOptions = {
      from: `"GFTD Orders" <${config.gmailUser}>`,
      to: 'care@gftd.in',
      subject: `🎉 New Order Received: ${orderDisplayId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px;">
          <h2 style="color: #8B4513;">New Order Alert! 🎁</h2>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
            <p><strong>Order ID:</strong> ${orderDisplayId}</p>
            <p><strong>Customer:</strong> ${orderData.customer_name}</p>
            <p><strong>Email:</strong> ${orderData.customer_email}</p>
            <p><strong>Phone:</strong> ${orderData.customer_phone}</p>
            <p><strong>Total Amount:</strong> ₹${orderData.total_amount}</p>
            <p><strong>Payment Method:</strong> ${orderData.payment_method === 'online' ? 'Online' : 'COD'}</p>
            <p><strong>Order Date:</strong> ${new Date(orderData.created_at).toLocaleString('en-IN')}</p>
          </div>
          
          <h3>Items Ordered:</h3>
          <ul>
            ${orderData.items.map((item: any) => `
              <li>${item.name} x${item.quantity} - ₹${item.price * item.quantity}</li>
            `).join('')}
          </ul>
        </div>
      `,
    };

    const info = await transporter.sendMail(adminMailOptions);
    console.log('✅ Admin notification sent:', info.messageId);
  } catch (error) {
    const err = error as Error;
    console.error('❌ Failed to send admin notification:', err);
  }
};