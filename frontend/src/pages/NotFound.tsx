import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useSeo } from '../utils/seo';

const NotFound: React.FC = () => {
  useSeo({ title: 'Page not found', noindex: true });

  return (
    <section className="relative flex min-h-[70vh] items-center overflow-hidden bg-premium-cream/40">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.15),transparent_60%)]" />
      <div className="container relative mx-auto px-4 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          className="font-serif text-7xl text-premium-gold sm:text-8xl"
        >
          404
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-4 font-serif text-3xl text-premium-charcoal sm:text-4xl"
        >
          This page has been unwrapped already
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto mt-3 max-w-md text-gray-600"
        >
          The link may be old or mistyped. Let's find you the right gift instead.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link to="/" className="group inline-flex items-center gap-2 rounded-full bg-premium-charcoal px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-black">
            Back to home <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link to="/products" className="inline-flex items-center rounded-full border border-premium-charcoal/20 px-7 py-3.5 text-sm font-medium text-premium-charcoal transition-colors hover:border-premium-charcoal/40">
            Shop all gifts
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default NotFound;
