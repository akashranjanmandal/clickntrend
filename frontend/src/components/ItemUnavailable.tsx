import React from 'react';
import { PackageX, ArrowRight } from 'lucide-react';
import { useSeo } from '../utils/seo';

/**
 * Shown when a product/combo link can't be loaded (removed, switched off, or a bad link).
 * Visitors stay on the link they clicked — important for ad and share traffic — and get
 * a clear way to keep shopping instead of being silently sent to the home page.
 */
const ItemUnavailable: React.FC<{ kind: 'product' | 'combo'; onShop: () => void; onHome: () => void }> = ({ kind, onShop, onHome }) => {
  useSeo({ title: `This ${kind} isn't available`, noindex: true });

  return (
    <section className="flex min-h-[70vh] items-center bg-premium-cream/40 px-4">
      <div className="mx-auto max-w-md text-center">
        <PackageX className="mx-auto mb-5 h-12 w-12 text-premium-gold" strokeWidth={1.5} />
        <h1 className="font-serif text-3xl text-premium-charcoal">This {kind} isn't available right now</h1>
        <p className="mt-3 text-gray-600">
          It may have sold out or been taken down. Have a look at our other gifts — there's plenty more to personalise.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={onShop}
            className="group inline-flex items-center gap-2 rounded-full bg-premium-charcoal px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-black"
          >
            {kind === 'combo' ? 'See all combos' : 'Shop all gifts'}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
          <button
            onClick={onHome}
            className="inline-flex items-center rounded-full border border-premium-charcoal/20 px-7 py-3.5 text-sm font-medium text-premium-charcoal transition-colors hover:border-premium-charcoal/40"
          >
            Go to home page
          </button>
        </div>
      </div>
    </section>
  );
};

export default ItemUnavailable;
