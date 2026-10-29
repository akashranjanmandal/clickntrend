import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSeo } from '../utils/seo';
import { BUSINESS, POLICY_LINKS } from '../content/business';

/** Shared shell for the help, policy and legal pages */
const PolicyLayout: React.FC<{
  title: string;
  description: string;
  intro?: React.ReactNode;
  showUpdated?: boolean;
  children: React.ReactNode;
}> = ({ title, description, intro, showUpdated = true, children }) => {
  const { pathname } = useLocation();
  useSeo({ title, description, path: pathname });

  return (
    <div className="bg-white">
      <section className="border-b border-gray-100 bg-premium-cream/40">
        <div className="container mx-auto px-4 py-12 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-premium-gold">{BUSINESS.name}</p>
          <h1 className="mt-3 font-serif text-3xl text-premium-charcoal sm:text-5xl">{title}</h1>
          {intro && <div className="mt-4 max-w-2xl text-gray-600">{intro}</div>}
          {showUpdated && <p className="mt-4 text-sm text-gray-500">Last updated: {BUSINESS.policiesUpdated}</p>}
        </div>
      </section>

      <div className="container mx-auto grid gap-10 px-4 py-10 sm:py-14 lg:grid-cols-[1fr_260px]">
        <article className="policy-content max-w-3xl">{children}</article>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <nav aria-label="Help and policies" className="rounded-2xl border border-gray-100 p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Help &amp; policies</p>
            <ul className="space-y-1">
              {POLICY_LINKS.map(link => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                      pathname === link.to ? 'bg-premium-cream font-medium text-premium-charcoal' : 'text-gray-600 hover:bg-gray-50 hover:text-premium-charcoal'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-gray-100 pt-4 text-sm text-gray-600">
              <p className="font-medium text-premium-charcoal">Need help?</p>
              <a href={`mailto:${BUSINESS.email}`} className="mt-1 block hover:text-premium-gold">{BUSINESS.email}</a>
              <a href={BUSINESS.phoneHref} className="block hover:text-premium-gold">{BUSINESS.phone}</a>
            </div>
          </nav>
        </aside>
      </div>
    </div>
  );
};

export default PolicyLayout;
