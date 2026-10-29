import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import PolicyLayout from '../../components/PolicyLayout';
import { BUSINESS } from '../../content/business';
import { apiFetch } from '../../utils/api';

interface FAQItem { q: string; a: React.ReactNode; text: string; category: string }

const FAQ: React.FC = () => {
  // COD answers follow the admin's payment settings
  const [cod, setCod] = useState<{ cod_enabled: boolean; cod_charge: number } | null>(null);
  useEffect(() => {
    apiFetch('/api/settings?key=payment').then((res: any) => setCod(res?.value || null)).catch(() => {});
  }, []);
  const codOn = cod?.cod_enabled === true;
  const { freeAbove, charge, days } = BUSINESS.shipping;

  const faqs: FAQItem[] = [
    { category: 'Ordering', q: 'How do I place an order?',
      text: 'Browse our gifts, personalise them if you like, add them to your cart and check out.',
      a: <>Browse our <Link to="/products">gifts</Link>, personalise them with your photos and text if you like, add them to your cart and check out. You'll get a confirmation email with your order ID.</> },
    { category: 'Ordering', q: 'Can I cancel my order?',
      text: `Yes, within 2 hours of placing it, by calling us on ${BUSINESS.phone}.`,
      a: <>Yes — call us on <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a> within <strong>2 hours</strong> of placing your order. After that, personalised items may already be in production. See our <Link to="/refund-policy">cancellation policy</Link>.</> },
    { category: 'Payment', q: 'What payment methods do you accept?',
      text: 'Cards, UPI and net banking through our secure payment partner Cashfree.',
      a: <>All major credit and debit cards, UPI (Google Pay, PhonePe, Paytm and others) and net banking, processed securely by Cashfree Payments{codOn ? ', plus Cash on Delivery' : ''}.</> },
    { category: 'Payment', q: 'Is Cash on Delivery available?',
      text: codOn ? 'Yes, Cash on Delivery is available.' : 'Cash on Delivery is not available at the moment.',
      a: codOn
        ? <>Yes, Cash on Delivery is available.{cod!.cod_charge > 0 ? ` A fee of ₹${cod!.cod_charge} applies to COD orders.` : ''}</>
        : <>Cash on Delivery is not available at the moment. Please pay securely online with a card, UPI or net banking.</> },
    { category: 'Shipping', q: 'How long does delivery take?',
      text: `Usually ${days} after dispatch.`,
      a: <>Orders are usually delivered within <strong>{days}</strong> after dispatch; remote areas may take 1–2 days longer. Details are in our <Link to="/shipping-policy">shipping policy</Link>.</> },
    { category: 'Shipping', q: 'How much does shipping cost?',
      text: `Free on orders of ₹${freeAbove} or more, ₹${charge} below that.`,
      a: <>Shipping is <strong>free on orders of ₹{freeAbove} or more</strong>, and ₹{charge} for orders below ₹{freeAbove}.</> },
    { category: 'Shipping', q: 'Can I track my order?',
      text: 'Yes, by email and on the Track Order page.',
      a: <>Yes. When your order ships you'll get an email with tracking details, and you can check it any time on the <Link to="/track-order">Track Order</Link> page with your order ID and phone number.</> },
    { category: 'Shipping', q: 'Do you ship internationally?',
      text: 'Currently we only ship within India.',
      a: <>Currently we only ship within India.</> },
    { category: 'Returns', q: 'Can I return a personalised gift?',
      text: 'Personalised gifts cannot be returned unless damaged, defective or wrong, reported within 48 hours.',
      a: <>Personalised gifts are made just for you, so they can't be returned for a change of mind. If one arrives <strong>damaged, defective or wrong</strong>, email us photos within <strong>48 hours</strong> of delivery and we'll replace or refund it. See the <Link to="/refund-policy">returns policy</Link>.</> },
    { category: 'Returns', q: 'What about non-personalised items?',
      text: 'They can be returned within 7 days of delivery, unused and in original packaging.',
      a: <>Non-personalised items can be returned within <strong>7 days</strong> of delivery if unused and in their original packaging. Refunds go to your original payment method within 5–7 business days of approval.</> },
    { category: 'General', q: 'How do I contact you?',
      text: `Email ${BUSINESS.email} or call ${BUSINESS.phone}.`,
      a: <>Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or call <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>. Our support team is available 24/7. More details are on our <Link to="/contact">contact page</Link>.</> },
  ];

  const [open, setOpen] = useState<number | null>(0);
  const categories = Array.from(new Set(faqs.map(f => f.category)));

  // FAQ structured data so search engines can show answers directly
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.seo = 'faq';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.text } })),
    });
    document.head.appendChild(script);
    return () => script.remove();
  }, [codOn]);

  return (
    <PolicyLayout
      title="Frequently Asked Questions"
      description={`Answers about ordering, personalisation, payment, shipping and returns at ${BUSINESS.name}.`}
      intro="Quick answers about ordering, payment, delivery and returns."
      showUpdated={false}
    >
      {categories.map(category => (
        <section key={category} className="mb-8">
          <h2>{category}</h2>
          <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100">
            {faqs.map((f, i) => f.category !== category ? null : (
              <div key={f.q}>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  aria-expanded={open === i}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium text-premium-charcoal"
                >
                  {f.q}
                  <ChevronDown className={`h-4 w-4 flex-shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
                </button>
                {open === i && <div className="px-5 pb-5 text-gray-700 [&_a]:underline">{f.a}</div>}
              </div>
            ))}
          </div>
        </section>
      ))}
    </PolicyLayout>
  );
};

export default FAQ;
