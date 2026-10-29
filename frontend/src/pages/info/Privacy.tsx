import React from 'react';
import { Link } from 'react-router-dom';
import PolicyLayout from '../../components/PolicyLayout';
import { BUSINESS, fullAddress } from '../../content/business';

const Privacy: React.FC = () => (
  <PolicyLayout
    title="Privacy Policy"
    description={`How ${BUSINESS.name} collects, uses and protects your personal information when you shop on gftd.in.`}
    intro={`This policy explains what personal information ${BUSINESS.name} collects, why, who we share it with, and the choices you have.`}
  >
    <h2>Who we are</h2>
    <p>
      {BUSINESS.name}, {fullAddress}, is responsible for the personal information described here. Contact us at{' '}
      <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.
    </p>

    <h2>Information we collect</h2>
    <ul>
      <li><strong>Order and contact details:</strong> name, email, phone number (and an optional alternative number), delivery address, and any special instructions.</li>
      <li><strong>Personalisation content:</strong> photos and text you upload to personalise a gift.</li>
      <li><strong>Order history:</strong> products ordered, amounts, payment status and delivery status.</li>
      <li><strong>Reviews:</strong> your name, email and review text if you write a product review.</li>
      <li><strong>Location (optional):</strong> if you choose "use my location" at checkout, your approximate location is used once to fill in your address.</li>
      <li><strong>Usage data:</strong> pages viewed, device and browser information, collected through cookies and similar technologies (see below).</li>
    </ul>
    <p>We do not collect or store your full card, UPI or bank details — payments are handled by our payment partner.</p>

    <h2>How we use your information</h2>
    <ul>
      <li>to make, pack and deliver your order, including printing your personalisation content;</li>
      <li>to send order confirmations, delivery updates and replies to your questions;</li>
      <li>to process payments, refunds and returns, and to prevent fraud;</li>
      <li>to measure and improve our website and advertising;</li>
      <li>to meet legal, tax and accounting obligations.</li>
    </ul>

    <h2>Who we share it with</h2>
    <p>We share only what each partner needs to provide their service:</p>
    <table>
      <thead><tr><th>Partner</th><th>Purpose</th></tr></thead>
      <tbody>
        <tr><td>Cashfree Payments</td><td>Processing online payments and refunds</td></tr>
        <tr><td>Courier and logistics partners</td><td>Delivering your order (name, phone, address)</td></tr>
        <tr><td>Cloudflare</td><td>Securely storing product images and the photos you upload</td></tr>
        <tr><td>Hostinger</td><td>Sending order and support emails</td></tr>
        <tr><td>Meta (Facebook / Instagram)</td><td>Measuring and improving our ads through the Meta Pixel</td></tr>
        <tr><td>OpenStreetMap (Nominatim)</td><td>Turning your location into an address, only if you use "use my location" at checkout</td></tr>
      </tbody>
    </table>
    <p>We do not sell your personal information. We may disclose information if required by law or to protect our rights and customers.</p>

    <h2>Cookies and similar technologies</h2>
    <ul>
      <li><strong>Essential storage</strong> on your device keeps your cart and checkout progress working.</li>
      <li><strong>Advertising measurement:</strong> we use the Meta Pixel to understand how our ads perform. You can control ad personalisation in your Facebook/Instagram ad settings and block cookies in your browser settings.</li>
    </ul>

    <h2>How long we keep it</h2>
    <p>
      We keep order records for as long as needed to fulfil the order and to meet legal and tax requirements. Photos uploaded for
      personalisation are kept only as long as needed to make the order and handle any related support or return request, after
      which they may be deleted. You can ask us to delete your information earlier where the law allows.
    </p>

    <h2>Security</h2>
    <p>
      We use secure (HTTPS) connections and trusted service providers, and limit access to personal information to people who need
      it to run the business. No system is completely secure, but we take reasonable steps to protect your data.
    </p>

    <h2>Your rights</h2>
    <p>
      Subject to applicable law, including the Digital Personal Data Protection Act, 2023, you can ask to access, correct or delete
      your personal information, or withdraw consent for optional uses. Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> and
      we will respond within a reasonable time.
    </p>

    <h2>Children</h2>
    <p>Our website is not intended for children under 18 to use on their own, and we do not knowingly collect their personal information.</p>

    <h2>Changes to this policy</h2>
    <p>We may update this policy from time to time. The latest version is always on this page with its date.</p>

    <h2>Contact and grievances</h2>
    <p>
      For privacy questions or complaints, contact {BUSINESS.name} at <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or{' '}
      <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>, {fullAddress}. See also our <Link to="/terms">Terms &amp; Conditions</Link>.
    </p>
  </PolicyLayout>
);

export default Privacy;
