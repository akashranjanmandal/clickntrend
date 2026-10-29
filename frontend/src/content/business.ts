/** Business details used on the contact, policy and legal pages (one place to update). */
export const BUSINESS = {
  name: 'GFTD',
  tagline: 'The Art of Gifting',
  website: 'https://gftd.in',
  email: 'care@gftd.in',
  phone: '+91 82403 98515',
  phoneHref: 'tel:+918240398515',
  address: {
    line1: 'Behala',
    city: 'Kolkata',
    state: 'West Bengal',
    pincode: '700060',
    country: 'India',
  },
  jurisdiction: 'the courts at Kolkata, West Bengal (including the High Court at Calcutta)',
  instagram: 'https://www.instagram.com/gftd_gifts/',
  facebook: 'https://www.facebook.com/profile.php?id=61588448025395',
  shipping: { freeAbove: 499, charge: 79, days: '3–5 business days' },
  policiesUpdated: '29 October 2026',
};

export const fullAddress = `${BUSINESS.address.line1}, ${BUSINESS.address.city}, ${BUSINESS.address.state} ${BUSINESS.address.pincode}, ${BUSINESS.address.country}`;

/** Policy & help pages, in footer order */
export const POLICY_LINKS = [
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact Us' },
  { to: '/faq', label: 'FAQ' },
  { to: '/shipping-policy', label: 'Shipping & Delivery' },
  { to: '/refund-policy', label: 'Returns, Refunds & Cancellation' },
  { to: '/terms', label: 'Terms & Conditions' },
  { to: '/privacy-policy', label: 'Privacy Policy' },
];
