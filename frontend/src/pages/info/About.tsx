import React from 'react';
import { Link } from 'react-router-dom';
import PolicyLayout from '../../components/PolicyLayout';
import { BUSINESS, fullAddress } from '../../content/business';

const About: React.FC = () => (
  <PolicyLayout
    title="About Us"
    description={`${BUSINESS.name} makes personalised gifts and gift combos in Kolkata — made with your photos and words and delivered across India.`}
    intro={`${BUSINESS.name} — ${BUSINESS.tagline}. Personalised gifts, made for the people you love.`}
    showUpdated={false}
  >
    <h2>Who we are</h2>
    <p>
      {BUSINESS.name} is a personalised gifting brand based in Kolkata. We turn your photos and words into gifts people keep —
      custom mugs, fridge magnets, cushions, frames, keepsakes and curated gift combos for birthdays, anniversaries,
      festivals and every occasion in between.
    </p>

    <h2>How it works</h2>
    <ol>
      <li><strong>Choose a gift</strong> — browse <Link to="/products">all gifts</Link> or pick a ready-made <Link to="/combos">gift combo</Link>.</li>
      <li><strong>Personalise it</strong> — add your photos and message right on the product page. For combos, you personalise each piece step by step.</li>
      <li><strong>We make it for you</strong> — every personalised gift is made to order and carefully packed.</li>
      <li><strong>Delivered to your door</strong> — we ship across India. See our <Link to="/shipping-policy">shipping policy</Link> for timelines.</li>
    </ol>

    <h2>Build your own combo</h2>
    <p>
      Want to choose every piece yourself? <Link to="/custom-combo">Build a custom combo</Link>, personalise each item, and we'll
      put it together as one gift.
    </p>

    <h2>Get in touch</h2>
    <p>
      {BUSINESS.name}, {fullAddress}. Email <a href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a> or call{' '}
      <a href={BUSINESS.phoneHref}>{BUSINESS.phone}</a>. More ways to reach us are on our <Link to="/contact">contact page</Link>.
    </p>
  </PolicyLayout>
);

export default About;
