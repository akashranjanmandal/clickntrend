import React from 'react';
import { Link } from 'react-router-dom';
import PolicyLayout from '../../components/PolicyLayout';
import { BUSINESS } from '../../content/business';

const RefundPolicy: React.FC = () => (
  <PolicyLayout
    title="Returns, Refunds & Cancellation Policy"
    description={`${BUSINESS.name} cancellation, return and refund policy: cancel by phone within 2 hours; damaged or wrong items reported within 48 hours are replaced or refunded.`}
    intro="Most of our gifts are personalised and made just for you, so please read how cancellations, returns and refunds work."
  >
    <h2>Cancelling an order</h2>
    <ul>
      <li>You can cancel an order <strong>within 2 hours of placing it</strong> by calling us on <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>. Please have your order ID ready.</li>
      <li>After 2 hours, personalised items may already be in production and the order usually cannot be cancelled. Call us and we will check what is possible.</li>
      <li>If your cancellation is accepted for a prepaid order, the full amount is refunded to your original payment method.</li>
      <li>We may cancel an order if an item is unavailable, the uploaded photos or text cannot be printed, or the payment cannot be verified. In that case you receive a full refund.</li>
    </ul>

    <h2>Personalised items</h2>
    <p>
      Personalised gifts are made to order with your photos and words, so they <strong>cannot be returned or exchanged</strong> for
      a change of mind, a different design choice, or spelling or photo issues in the content you supplied. Please check your
      text and images carefully before placing the order.
    </p>
    <p>We will replace or refund a personalised item if:</p>
    <ul>
      <li>it arrives <strong>damaged</strong> or <strong>defective</strong>, or</li>
      <li>you receive the <strong>wrong item</strong>, or it was made with content different from what you uploaded,</li>
    </ul>
    <p>and you report it within <strong>48 hours of delivery</strong>.</p>

    <h2>Non-personalised items</h2>
    <ul>
      <li>Non-personalised items can be returned within <strong>7 days of delivery</strong>.</li>
      <li>Items must be unused, in their original condition and packaging, with all tags attached.</li>
      <li>For change-of-mind returns, the customer pays for return shipping. Items on sale are final and cannot be returned.</li>
    </ul>

    <h2>How to report a problem or request a return</h2>
    <ol>
      <li>Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> with your order ID, a short description and clear photos of the item and packaging (an unboxing video helps for damage claims).</li>
      <li>We review your request and reply with approval and next steps, usually within 2 business days.</li>
      <li>If a return is needed, we share the return address and instructions. Please don't send items back without approval.</li>
      <li>Once we receive and check the item — or approve a damage claim from photos — we arrange a replacement or refund.</li>
    </ol>

    <h2>Refunds</h2>
    <table>
      <tbody>
        <tr><th>Where the refund goes</th><td>Your original payment method (card, UPI, net banking or wallet)</td></tr>
        <tr><th>Time to process</th><td>Initiated within 5–7 business days of approval; your bank may take a few more days to show it</td></tr>
        <tr><th>Shipping charges</th><td>Non-refundable, except when the item was damaged, defective or wrong, or the order was cancelled by us</td></tr>
      </tbody>
    </table>
    <p>
      For Cash on Delivery orders (when offered), refunds are made by bank transfer or UPI to an account you share with us.
    </p>

    <h2>Questions</h2>
    <p>
      Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or call <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>.
      See also our <Link to="/shipping-policy">shipping policy</Link> and <Link to="/terms">terms &amp; conditions</Link>.
    </p>
  </PolicyLayout>
);

export default RefundPolicy;
