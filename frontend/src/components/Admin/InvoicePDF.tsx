import React from 'react';
import { formatCurrency } from '../../utils/helpers';
import { Order } from '../../types';

interface InvoicePDFProps {
  order: Order;
}

const InvoicePDF: React.FC<InvoicePDFProps> = ({ order }) => {
  const invoiceDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="invoice-container p-8 bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Print-only styles */}
      <style>
        {`
          @media print {
            @page {
              margin: 0;
              size: A4;
            }
            body {
              margin: 0;
              padding: 20px;
              -webkit-print-color-adjust: exact;
            }
            .no-print {
              display: none !important;
            }
            .print-only {
              display: block !important;
            }
            .invoice-container {
              box-shadow: none !important;
              border: none !important;
            }
          }
          .print-only {
            display: none;
          }
        `}
      </style>

      {/* Print header */}
      <div className="print-only text-center mb-8">
        <h1 className="text-3xl font-bold text-premium-gold">LUXE GIFTS</h1>
        <p className="text-gray-600">Premium Gift Shop</p>
        <p className="text-sm text-gray-500">Invoice</p>
      </div>

      {/* Invoice Header */}
      <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-premium-gold">
        <div>
          <h1 className="text-3xl font-serif font-bold text-premium-charcoal mb-2">GFTD</h1>
          <p className="text-gray-600">Premium Gift Shop</p>
          <p className="text-gray-600">support@clickntrend.com</p>
          <p className="text-gray-600">+91 9876543210</p>
        </div>
        
        <div className="text-right">
          <h2 className="text-2xl font-bold text-premium-gold mb-2">INVOICE</h2>
          <p className="text-gray-600">Invoice #: INV-{order.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-gray-600">Date: {invoiceDate}</p>
          <p className="text-gray-600">Status: <span className="font-bold text-green-600">PAID</span></p>
        </div>
      </div>

      {/* Customer & Order Info */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-lg font-bold text-premium-charcoal mb-3">Bill To</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="font-bold text-lg">{order.customer_name}</p>
            <p className="text-gray-600">{order.customer_email}</p>
            <p className="text-gray-600">{order.customer_phone || 'N/A'}</p>
            <p className="text-gray-600 mt-2">{order.shipping_address || 'Address not provided'}</p>
            <p className="text-gray-600">{order.shipping_city}, {order.shipping_state} - {order.shipping_pincode}</p>
            <p className="text-gray-600">{order.shipping_country || 'India'}</p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-bold text-premium-charcoal mb-3">Order Details</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-bold">{order.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Order Date:</span>
              <span className="font-bold">{orderDate}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Payment ID:</span>
              <span className="font-bold">{order.razorpay_payment_id?.slice(0, 8) || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tracking #:</span>
              <span className="font-bold">{order.tracking_number || 'To be assigned'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-premium-charcoal mb-3">Order Items</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-premium-gold text-white">
              <th className="text-left p-3">Item</th>
              <th className="text-left p-3">Category</th>
              <th className="text-left p-3">Quantity</th>
              <th className="text-left p-3">Unit Price</th>
              <th className="text-left p-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(order.items) ? (
              order.items.map((item: any, index: number) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.type || 'Product'}</p>
                    </div>
                  </td>
                  <td className="p-3">{item.category || 'Gift'}</td>
                  <td className="p-3">{item.quantity}</td>
                  <td className="p-3">{formatCurrency(item.price)}</td>
                  <td className="p-3 font-bold">{formatCurrency(item.price * item.quantity)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-3 text-center text-gray-500">
                  No items data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Special Requests */}
      {order.special_requests && (
        <div className="mb-8 p-4 bg-yellow-50 border-l-4 border-yellow-500">
          <h4 className="font-bold text-yellow-700 mb-2">Special Requests:</h4>
          <p className="text-gray-700">{order.special_requests}</p>
        </div>
      )}

      {/* Total Section */}
      <div className="flex justify-end">
        <div className="w-64">
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex justify-between mb-3">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-bold">{formatCurrency(order.total_amount)}</span>
            </div>
            <div className="flex justify-between mb-3">
              <span className="text-gray-600">Shipping:</span>
              <span className="font-bold text-green-600">FREE</span>
            </div>
            <div className="flex justify-between mb-3">
              <span className="text-gray-600">Tax (18%):</span>
              <span className="font-bold">{formatCurrency(order.total_amount * 0.18)}</span>
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between text-xl font-bold">
                <span>Grand Total:</span>
                <span className="text-premium-gold">
                  {formatCurrency(order.total_amount * 1.18)}
                </span>
              </div>
              <p className="text-sm text-gray-500 text-right mt-1">(Inclusive of all taxes)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t text-center text-gray-600">
        <div className="mb-4">
          <p className="font-bold text-premium-charcoal">Thank you for your order!</p>
          <p className="text-sm">We appreciate your business and hope you enjoy your premium gifts.</p>
        </div>
        <div className="text-xs">
          <p>GFTD • support@clickntrend.com • +91 9876543210</p>
          <p className="mt-1">This is a computer-generated invoice and does not require a physical signature.</p>
          <p className="mt-1">Invoice generated on {invoiceDate} at {new Date().toLocaleTimeString()}</p>
        </div>
        
        {/* Print watermark */}
        <div className="print-only fixed bottom-10 left-0 right-0 text-center opacity-10">
          <h1 className="text-6xl font-bold text-premium-gold">GFTD</h1>
          <p className="text-2xl text-gray-500 mt-2">Fashion & Gifts</p>
        </div>
      </div>

      {/* Print Button */}
      <div className="no-print mt-8 text-center">
        <button
          onClick={() => window.print()}
          className="px-8 py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy transition-colors font-medium"
        >
          🖨️ Print Invoice
        </button>
        <p className="text-sm text-gray-500 mt-2">
          For best results, use "Save as PDF" in print dialog
        </p>
      </div>
    </div>
  );
};

export default InvoicePDF;