export const getOrderConfirmationEmailHTML = (orderData: any) => {
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
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #D4AF37 0%, #8B4513 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🎁 Thank You for Your Order!</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #eee;">
        <p style="font-size: 18px;">Dear <strong>${orderData.customer_name}</strong>,</p>
        <p>Your order has been confirmed and is being processed. Here are the details:</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="color: #D4AF37; margin-top: 0;">Order Details</h2>
          <p><strong>Order ID:</strong> #${orderData.id}</p>
          <p><strong>Order Date:</strong> ${new Date(orderData.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          <p><strong>Payment Method:</strong> ${orderData.payment_method === 'online' ? '💳 Online Payment' : '💵 Cash on Delivery'}</p>
          
          <h3 style="margin-top: 20px; color: #8B4513;">Items Ordered</h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="padding: 12px; text-align: left;">Item</th>
                <th style="padding: 12px; text-align: center;">Qty</th>
                <th style="padding: 12px; text-align: right;">Price</th>
                <th style="padding: 12px; text-align: right;">Total</th>
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
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #8B4513; margin-top: 0;">📦 Shipping Address</h3>
          <p style="margin: 5px 0;"><strong>${orderData.customer_name}</strong></p>
          <p style="margin: 5px 0;">${orderData.shipping_address}</p>
          <p style="margin: 5px 0;">${orderData.shipping_city}, ${orderData.shipping_state} - ${orderData.shipping_pincode}</p>
          <p style="margin: 5px 0;">📞 ${orderData.customer_phone}</p>
        </div>
        
        ${orderData.special_requests ? `
        <div style="background: #fff9e6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #D4AF37;">
          <h3 style="color: #8B4513; margin-top: 0;">✨ Special Requests</h3>
          <p style="margin: 0;">${orderData.special_requests}</p>
        </div>
        ` : ''}
        
        <div style="background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
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

export const getOrderConfirmationEmailText = (orderData: any) => {
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
Order ID: #${orderData.id}
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