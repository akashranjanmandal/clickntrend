import React from 'react';
import { Link } from 'react-router-dom';
import PolicyLayout from '../../components/PolicyLayout';
import { BUSINESS, fullAddress } from '../../content/business';

const Terms: React.FC = () => (
  <PolicyLayout
    title="Terms & Conditions"
    description={`Terms and conditions for using gftd.in and buying personalised gifts from ${BUSINESS.name}.`}
    intro={`These terms apply when you use ${BUSINESS.website.replace('https://', '')} or buy from ${BUSINESS.name}. By placing an order you agree to them.`}
  >
    <h2>1. About us</h2>
    <p>
      This website is operated by {BUSINESS.name} ("we", "us"), {fullAddress}. Contact: <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>,{' '}
      <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>.
    </p>

    <h2>2. Using this website</h2>
    <ul>
      <li>You must be at least 18 years old, or use the website with the involvement of a parent or guardian, to place an order.</li>
      <li>You agree to give accurate information (name, contact details and delivery address) and not to misuse the website, attempt to disrupt it, or access it in unauthorised ways.</li>
    </ul>

    <h2>3. Products and prices</h2>
    <ul>
      <li>Prices are shown in Indian Rupees (₹). Shipping charges and any Cash on Delivery fee are shown at checkout before you pay.</li>
      <li>We try to show products accurately, but colours, sizes and finishes may vary slightly from photos and screens. Personalised items are made individually, so small variations in placement and printing are normal.</li>
      <li>If a product is listed at an obviously wrong price because of an error, we may cancel the order and refund you in full.</li>
    </ul>

    <h2>4. Orders</h2>
    <ul>
      <li>An order is confirmed once payment is successful (or, for Cash on Delivery orders when offered, once we confirm the order). You receive a confirmation email with your order ID.</li>
      <li>We may refuse or cancel an order — for example if an item is unavailable, the payment cannot be verified, or the personalisation content breaks these terms. You receive a full refund if we cancel a paid order.</li>
      <li>Cancellations, returns and refunds are covered by our <Link to="/refund-policy">Returns, Refunds &amp; Cancellation Policy</Link>.</li>
    </ul>

    <h2>5. Personalisation content</h2>
    <p>When you upload photos or enter text for a personalised gift, you confirm that:</p>
    <ul>
      <li>you own the content or have permission to use it, and it does not infringe anyone's copyright, trademark or privacy;</li>
      <li>it is not unlawful, obscene, hateful, defamatory or otherwise offensive.</li>
    </ul>
    <p>
      We may decline to print content that breaks these rules, or that cannot be printed at good quality, and will contact you if
      so. We print your content as supplied, so please check spelling and photos carefully — errors in supplied content are not
      grounds for a return. You keep ownership of your content and allow us to use it only to make and deliver your order.
    </p>

    <h2>6. Payments</h2>
    <p>
      Online payments are processed securely by our payment partner, Cashfree Payments. We do not see or store your full card,
      UPI or bank details. Your payment is subject to the payment partner's and your bank's terms.
    </p>

    <h2>7. Shipping and delivery</h2>
    <p>
      Delivery timelines and charges are described in our <Link to="/shipping-policy">Shipping &amp; Delivery Policy</Link>. Delivery
      dates are estimates and may be affected by events outside our control.
    </p>

    <h2>8. Intellectual property</h2>
    <p>
      The {BUSINESS.name} name, logo, website design, product photos and text on this website belong to {BUSINESS.name} and may not be
      copied or used without our written permission.
    </p>

    <h2>9. Limitation of liability</h2>
    <p>
      To the extent permitted by law, our total liability for any order is limited to the amount you paid for that order. We are not
      liable for indirect or consequential losses, or for delays or failures caused by events beyond our reasonable control. Nothing
      in these terms limits your rights under the Consumer Protection Act, 2019 or other applicable law.
    </p>

    <h2>10. Privacy</h2>
    <p>How we handle your personal information is explained in our <Link to="/privacy-policy">Privacy Policy</Link>.</p>

    <h2>11. Governing law and jurisdiction</h2>
    <p>
      These terms are governed by the laws of India. Any dispute is subject to the exclusive jurisdiction of {BUSINESS.jurisdiction}.
    </p>

    <h2>12. Changes to these terms</h2>
    <p>
      We may update these terms from time to time. The version on this page at the time of your order applies to that order.
    </p>

    <h2>13. Contact and grievances</h2>
    <p>
      For questions or complaints, email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or call{' '}
      <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>. We aim to acknowledge complaints within 48 hours and resolve them within 30 days.
    </p>
  </PolicyLayout>
);

export default Terms;
