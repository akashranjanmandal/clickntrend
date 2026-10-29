import React from 'react';
import { Link } from 'react-router-dom';
import PolicyLayout from '../../components/PolicyLayout';
import { BUSINESS } from '../../content/business';

const { freeAbove, charge, days } = BUSINESS.shipping;

const ShippingPolicy: React.FC = () => (
  <PolicyLayout
    title="Shipping & Delivery Policy"
    description={`${BUSINESS.name} ships across India. Free shipping on orders of ₹${freeAbove} or more, ₹${charge} below that; delivery in ${days}.`}
    intro={`How and when your ${BUSINESS.name} order reaches you.`}
  >
    <h2>Where we deliver</h2>
    <p>
      We deliver to addresses across India. We do not ship internationally at the moment. Delivery to remote areas may take
      1–2 business days longer than the times below.
    </p>

    <h2>Shipping charges</h2>
    <table>
      <thead><tr><th>Order value</th><th>Shipping charge</th></tr></thead>
      <tbody>
        <tr><td>₹{freeAbove} and above</td><td><strong>Free</strong></td></tr>
        <tr><td>Below ₹{freeAbove}</td><td>₹{charge}</td></tr>
      </tbody>
    </table>
    <p>
      The shipping charge is shown at checkout before you pay. If Cash on Delivery is offered for your order, any COD fee is also
      shown at checkout.
    </p>

    <h2>Processing time</h2>
    <ul>
      <li>Orders placed before 2 PM IST are processed the same day; orders placed after 2 PM IST are processed the next business day.</li>
      <li>Personalised gifts are made to order. If your photos or text need to be checked or corrected, we will contact you, and the order is processed once this is resolved.</li>
      <li>Orders are not processed or delivered on Sundays and public holidays.</li>
    </ul>

    <h2>Delivery time</h2>
    <p>
      After dispatch, orders are usually delivered within <strong>{days}</strong>. Delivery times are estimates from our courier
      partners and can be affected by weather, local restrictions, festivals or other events outside our control.
    </p>

    <h2>Tracking your order</h2>
    <p>
      When your order ships you will receive an email with your tracking details. You can also check the status at any time on our{' '}
      <Link to="/track-order">Track Order</Link> page using your order ID and phone number.
    </p>

    <h2>Delivery issues</h2>
    <ul>
      <li>Please make sure your address, pincode and phone number are correct. We are not responsible for delays caused by an incorrect or incomplete address.</li>
      <li>If a delivery attempt fails and the parcel is returned to us, we will contact you to arrange re-delivery; extra shipping charges may apply.</li>
      <li>If your parcel arrives damaged, please follow our <Link to="/refund-policy">returns policy</Link> and report it within 48 hours of delivery.</li>
    </ul>

    <h2>Questions</h2>
    <p>
      Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or call <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>.
    </p>
  </PolicyLayout>
);

export default ShippingPolicy;
