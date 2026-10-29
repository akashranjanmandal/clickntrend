import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Package } from 'lucide-react';
import PolicyLayout from '../../components/PolicyLayout';
import { BUSINESS, fullAddress } from '../../content/business';

const Contact: React.FC = () => (
  <PolicyLayout
    title="Contact Us"
    description={`Contact ${BUSINESS.name} — email ${BUSINESS.email}, call ${BUSINESS.phone}. ${fullAddress}.`}
    intro="Questions about an order, a personalised gift or a return? We're happy to help."
    showUpdated={false}
  >
    <div className="not-prose mb-10 grid gap-4 sm:grid-cols-2">
      {[
        { icon: Mail, label: 'Email', value: BUSINESS.email, href: `mailto:${BUSINESS.email}` },
        { icon: Phone, label: 'Phone', value: BUSINESS.phone, href: BUSINESS.phoneHref },
        { icon: MapPin, label: 'Address', value: fullAddress },
        { icon: Package, label: 'Order status', value: 'Track your order', to: '/track-order' },
      ].map(item => {
        const Icon = item.icon;
        const body = (
          <>
            <Icon className="h-5 w-5 text-premium-gold" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{item.label}</p>
            <p className="mt-1 font-medium text-premium-charcoal">{item.value}</p>
          </>
        );
        const cls = 'block rounded-2xl border border-gray-100 p-5 transition-colors hover:border-premium-gold/50';
        if (item.to) return <Link key={item.label} to={item.to} className={cls}>{body}</Link>;
        if (item.href) return <a key={item.label} href={item.href} className={cls}>{body}</a>;
        return <div key={item.label} className="rounded-2xl border border-gray-100 p-5">{body}</div>;
      })}
    </div>

    <h2>Business details</h2>
    <table>
      <tbody>
        <tr><th>Business name</th><td>{BUSINESS.name}</td></tr>
        <tr><th>Address</th><td>{fullAddress}</td></tr>
        <tr><th>Email</th><td><a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a></td></tr>
        <tr><th>Phone</th><td><a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a></td></tr>
        <tr><th>Website</th><td><a href={BUSINESS.website}>{BUSINESS.website.replace('https://', '')}</a></td></tr>
      </tbody>
    </table>

    <h2>Before you get in touch</h2>
    <ul>
      <li>Have your <strong>order ID</strong> (for example GFTD#123) and the phone number used at checkout ready.</li>
      <li>To <strong>cancel an order</strong>, please call us within 2 hours of placing it — see our <Link to="/refund-policy">cancellation policy</Link>.</li>
      <li>For a <strong>damaged or incorrect item</strong>, email photos within 48 hours of delivery — see our <Link to="/refund-policy">returns policy</Link>.</li>
      <li>Delivery times and charges are explained in our <Link to="/shipping-policy">shipping policy</Link>.</li>
    </ul>
  </PolicyLayout>
);

export default Contact;
