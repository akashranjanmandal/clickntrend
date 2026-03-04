import nodemailer from 'nodemailer';
import config from '../config';

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

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
export const transporter = nodemailer.createTransport({
  host: "mail.gftd.in",
  port: 587,
  secure: false,
  auth: {
    user: config.emailUser,
    pass: config.emailPassword
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000
});
// Verify connection
transporter.verify((error: Error | null, success: boolean) => {
  if (error) {
console.error('❌ SMTP connection error:', error);
  } else {
console.log('✅ Hostinger SMTP server is ready to send emails');  }
});

// Send order confirmation email to customer
export const sendOrderConfirmationEmail = async (orderData: OrderData): Promise<EmailResult> => {
  try {
    console.log('📧 Sending order confirmation email to:', orderData.customer_email);

    const mailOptions = {
      from: `"GFTD" <${config.emailUser}>`,
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
    console.log('📬 To:', orderData.customer_email);
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const err = error as Error;
    console.error('❌ Failed to send email:', err);
    return { success: false, error: err.message };
  }
};

// Send admin notification
export const sendAdminNotification = async (orderData: OrderData): Promise<EmailResult> => {
  try {
    const orderDisplayId = orderData.custom_order_id || '#' + orderData.id;
    
    const adminMailOptions = {
      from: `"GFTD Orders" <${config.emailUser}>`,
      to: 'care@gftd.in',
      subject: `🎉 New Order Received: ${orderDisplayId}`,
      html: getAdminNotificationHTML(orderData),
    };

    const info = await transporter.sendMail(adminMailOptions);
    console.log('✅ Admin notification sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const err = error as Error;
    console.error('❌ Failed to send admin notification:', err);
    return { success: false, error: err.message };
  }
};

// HTML Email Template
export const getOrderConfirmationEmailHTML = (orderData: any): string => {
  const itemsList = orderData.items.map((item: any) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price * item.quantity}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #D4AF37 0%, #8B4513 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #eee; }
        .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .badge { background: #8B4513; color: white; padding: 3px 8px; border-radius: 4px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th { background: #f0f0f0; padding: 12px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #eee; }
        .tracking-section { background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎁 Thank You for Your Order!</h1>
      </div>
      
      <div class="content">
        <p style="font-size: 18px;">Dear <strong>${orderData.customer_name}</strong>,</p>
        <p>Your order has been confirmed and is being processed. Here are the details:</p>
        
        <div class="order-details">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="color: #D4AF37; margin: 0;">Order Details</h2>
            <span class="badge">${orderData.payment_method === 'online' ? '💳 Paid' : '💵 COD'}</span>
          </div>
          
          <p><strong>Order ID:</strong> ${orderData.custom_order_id || '#' + orderData.id}</p>
          <p><strong>Order Date:</strong> ${new Date(orderData.created_at).toLocaleString('en-IN', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}</p>
          <p><strong>Payment Method:</strong> ${orderData.payment_method === 'online' ? 'Online Payment' : 'Cash on Delivery'}</p>
          
          <h3 style="margin-top: 20px; color: #8B4513;">Items Ordered</h3>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 10px; text-align: right;"><strong>Subtotal:</strong></td>
                <td style="padding: 10px; text-align: right;">₹${orderData.subtotal}</td>
              </tr>
              <tr>
                <td colspan="3" style="padding: 10px; text-align: right;"><strong>Shipping:</strong></td>
                <td style="padding: 10px; text-align: right;">${orderData.shipping_charge === 0 ? 'FREE' : '₹' + orderData.shipping_charge}</td>
              </tr>
              ${orderData.coupon_discount > 0 ? `
              <tr>
                <td colspan="3" style="padding: 10px; text-align: right;"><strong>Discount:</strong></td>
                <td style="padding: 10px; text-align: right; color: green;">-₹${orderData.coupon_discount}</td>
              </tr>
              ` : ''}
              ${orderData.payment_method === 'cod' ? `
              <tr>
                <td colspan="3" style="padding: 10px; text-align: right;"><strong>COD Charges:</strong></td>
                <td style="padding: 10px; text-align: right;">₹49</td>
              </tr>
              ` : ''}
              <tr style="font-size: 18px; background: #fafafa;">
                <td colspan="3" style="padding: 12px; text-align: right;"><strong>Total Amount:</strong></td>
                <td style="padding: 12px; text-align: right; color: #D4AF37; font-weight: bold;">₹${orderData.total_amount}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        <div class="order-details">
          <h3 style="color: #8B4513; margin-top: 0;">📦 Shipping Address</h3>
          <p style="margin: 5px 0;"><strong>${orderData.customer_name}</strong></p>
          <p style="margin: 5px 0;">${orderData.shipping_address}</p>
          <p style="margin: 5px 0;">${orderData.shipping_city}, ${orderData.shipping_state} - ${orderData.shipping_pincode}</p>
          <p style="margin: 5px 0;">📞 ${orderData.customer_phone}</p>
        </div>
        
        ${orderData.special_requests ? `
        <div class="order-details" style="background: #fff9e6;">
          <h3 style="color: #8B4513; margin-top: 0;">✨ Special Requests</h3>
          <p style="margin: 0;">${orderData.special_requests}</p>
        </div>
        ` : ''}
        
        <div class="tracking-section">
          <h3 style="color: #8B4513; margin-top: 0;">🚚 What's Next?</h3>
          <p>✓ We'll notify you once your order is shipped</p>
          <p>✓ You can track your order status using the Order ID above</p>
          <p>✓ Estimated delivery: <strong>3-5 business days</strong></p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="text-align: center; color: #666;">
          Need help? Contact us at <a href="mailto:care@gftd.in" style="color: #D4AF37; text-decoration: none;">care@gftd.in</a><br>
          <small style="color: #999;">© ${new Date().getFullYear()} GFTD. All rights reserved.</small>
        </p>
      </div>
    </body>
    </html>
  `;
};

export const getOrderConfirmationEmailText = (orderData: any): string => {
  const itemsList = orderData.items.map((item: any) => 
    `- ${item.name} x${item.quantity}: ₹${item.price * item.quantity}`
  ).join('\n');

  return `
🎁 THANK YOU FOR YOUR ORDER!

Dear ${orderData.customer_name},

Your order has been confirmed and is being processed.

════════════════════════════════
ORDER DETAILS
════════════════════════════════
Order ID: ${orderData.custom_order_id || '#' + orderData.id}
Order Date: ${new Date(orderData.created_at).toLocaleString('en-IN')}
Payment Method: ${orderData.payment_method === 'online' ? 'Online Payment' : 'Cash on Delivery'}

════════════════════════════════
ITEMS ORDERED
════════════════════════════════
${itemsList}

────────────────────────────────
Subtotal: ₹${orderData.subtotal}
Shipping: ${orderData.shipping_charge === 0 ? 'FREE' : '₹' + orderData.shipping_charge}
${orderData.coupon_discount > 0 ? `Discount: -₹${orderData.coupon_discount}` : ''}
${orderData.payment_method === 'cod' ? 'COD Charges: ₹49' : ''}
────────────────────────────────
TOTAL: ₹${orderData.total_amount}

════════════════════════════════
SHIPPING ADDRESS
════════════════════════════════
${orderData.customer_name}
${orderData.shipping_address}
${orderData.shipping_city}, ${orderData.shipping_state} - ${orderData.shipping_pincode}
Phone: ${orderData.customer_phone}

${orderData.special_requests ? `════════════════════════════════
SPECIAL REQUESTS
════════════════════════════════
${orderData.special_requests}\n` : ''}
════════════════════════════════
WHAT'S NEXT?
════════════════════════════════
✓ We'll notify you once your order is shipped
✓ You can track your order status using the Order ID above
✓ Estimated delivery: 3-5 business days

────────────────────────────────
Need help? Contact us at care@gftd.in

© ${new Date().getFullYear()} GFTD. All rights reserved.
  `;
};

const getAdminNotificationHTML = (orderData: any): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #D4AF37 0%, #8B4513 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 10px 10px; border: 1px solid #eee; }
        .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .badge { background: #8B4513; color: white; padding: 5px 10px; border-radius: 20px; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f0f0f0; padding: 10px; text-align: left; }
        td { padding: 10px; border-bottom: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin:0;">🎁 New Order Alert!</h1>
        </div>
        
        <div class="content">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="color: #8B4513; margin:0;">Order #${orderData.custom_order_id || orderData.id}</h2>
            <span class="badge">${orderData.payment_method === 'online' ? '💳 PAID' : '💵 COD'}</span>
          </div>
          
          <div class="order-details">
            <h3 style="color: #D4AF37; margin-top:0;">Customer Details</h3>
            <p><strong>Name:</strong> ${orderData.customer_name}</p>
            <p><strong>Email:</strong> ${orderData.customer_email}</p>
            <p><strong>Phone:</strong> ${orderData.customer_phone}</p>
            <p><strong>Order Date:</strong> ${new Date(orderData.created_at).toLocaleString('en-IN')}</p>
          </div>
          
          <div class="order-details">
            <h3 style="color: #D4AF37; margin-top:0;">Shipping Address</h3>
            <p>${orderData.shipping_address}</p>
            <p>${orderData.shipping_city}, ${orderData.shipping_state} - ${orderData.shipping_pincode}</p>
          </div>
          
          <div class="order-details">
            <h3 style="color: #D4AF37; margin-top:0;">Items Ordered</h3>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${orderData.items.map((item: any) => `
                  <tr>
                    <td>${item.name}</td>
                    <td>${item.quantity}</td>
                    <td>₹${item.price}</td>
                    <td>₹${item.price * item.quantity}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="text-align: right;"><strong>Subtotal:</strong></td>
                  <td>₹${orderData.subtotal}</td>
                </tr>
                <tr>
                  <td colspan="3" style="text-align: right;"><strong>Shipping:</strong></td>
                  <td>${orderData.shipping_charge === 0 ? 'FREE' : '₹' + orderData.shipping_charge}</td>
                </tr>
                ${orderData.coupon_discount > 0 ? `
                <tr>
                  <td colspan="3" style="text-align: right;"><strong>Discount:</strong></td>
                  <td style="color: green;">-₹${orderData.coupon_discount}</td>
                </tr>
                ` : ''}
                <tr style="font-size: 18px;">
                  <td colspan="3" style="text-align: right;"><strong>Total:</strong></td>
                  <td style="color: #D4AF37; font-weight: bold;">₹${orderData.total_amount}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          ${orderData.special_requests ? `
          <div class="order-details" style="background: #fff9e6;">
            <h3 style="color: #8B4513; margin-top:0;">✨ Special Requests</h3>
            <p>${orderData.special_requests}</p>
          </div>
          ` : ''}
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          
          <p style="text-align: center; color: #666; font-size: 12px;">
            This is an automated notification from GFTD Admin<br>
            © ${new Date().getFullYear()} GFTD. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};