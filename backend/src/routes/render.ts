import fs from 'fs';
import path from 'path';
import express from 'express';
import { pool } from '../utils/db';

/**
 * Server-rendered HTML for the main shop pages.
 *
 * The site is a React single-page app: without this, every URL returns the same empty
 * shell (same title/description, no H1, no text, no links), which is what SEO crawlers,
 * Facebook/Instagram and AI bots that don't run JavaScript see. These routes return the
 * built index.html with the page's own <head> tags and real content inside #root.
 * React replaces that content when it starts, so visitors see the normal site.
 *
 * nginx must send these paths to the backend (see deploy notes): / /products /combos
 * /custom-combo /product/:id /combo/:id
 */
const router = express.Router();
const SITE = (process.env.CLIENT_URL || 'https://gftd.in').replace(/\/+$/, '');
const BRAND = 'GFTD';

// ── Template (the built frontend index.html), re-read when a new build is deployed ─────────
const TEMPLATE_CANDIDATES = [
  process.env.FRONTEND_INDEX_HTML,
  '/usr/share/nginx/html/index.html',
  path.join(__dirname, '../../../frontend/dist/index.html'),
].filter(Boolean) as string[];

let cached: { file: string; mtime: number; html: string } | null = null;
function template(): string | null {
  for (const file of TEMPLATE_CANDIDATES) {
    try {
      const { mtimeMs } = fs.statSync(file);
      if (cached && cached.file === file && cached.mtime === mtimeMs) return cached.html;
      const html = fs.readFileSync(file, 'utf8');
      cached = { file, mtime: mtimeMs, html };
      return html;
    } catch { /* try the next location */ }
  }
  return null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────────────
const esc = (s: any) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const plain = (s: any) => String(s ?? '').replace(/\*/g, '').replace(/\s+/g, ' ').trim();
const clip = (s: string, max = 158) => {
  const t = plain(s);
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};
const abs = (url?: string | null) =>
  !url ? `${SITE}/logo.png` : /^https?:\/\//i.test(url) ? url : `${SITE}${url.startsWith('/') ? '' : '/'}${url}`;
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

interface PageData {
  path: string;
  title: string;          // full <title>
  description: string;
  image?: string;
  type?: 'website' | 'product';
  jsonLd?: object | object[];
  body: string;           // HTML placed inside #root
  status?: number;
  noindex?: boolean;
}

function renderPage(p: PageData): string | null {
  const html = template();
  if (!html) return null;
  const url = `${SITE}${p.path}`;
  const description = clip(p.description);
  const image = abs(p.image);
  const head = [
    `<title>${esc(p.title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    p.noindex ? '' : `<link rel="canonical" href="${esc(url)}" />`,
    `<meta name="robots" content="${p.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'}" />`,
    `<meta property="og:type" content="${p.type || 'website'}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(p.title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta name="twitter:title" content="${esc(p.title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    p.jsonLd ? `<script type="application/ld+json" data-seo="page">${JSON.stringify(p.jsonLd).replace(/</g, '\\u003c')}</script>` : '',
  ].filter(Boolean).join('\n    ');

  return html
    // drop the generic tags the template ships with; the page-specific ones replace them
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/i, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/gi, '')
    .replace(/<meta\s+name="robots"[^>]*>\s*/gi, '')
    .replace(/<meta\s+(property|name)="(og:type|og:url|og:title|og:description|og:image|twitter:title|twitter:description|twitter:image)"[^>]*>\s*/gi, '')
    .replace('</head>', `    ${head}\n  </head>`)
    .replace(/<div id="root">\s*<\/div>/, `<div id="root">${p.body}</div>`);
}

function send(res: express.Response, next: express.NextFunction, page: PageData) {
  const html = renderPage(page);
  if (!html) return next(); // no built frontend found: let nginx/static handling take over
  res.status(page.status || 200);
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=300');
  res.send(html);
}

// ── Shared page chrome (plain links so crawlers can follow the whole site) ──────────────
const NAV = `<header style="padding:16px 24px;border-bottom:1px solid #eee">
  <nav aria-label="Main"><a href="/"><strong>${BRAND}</strong></a> ·
    <a href="/products">Shop all gifts</a> · <a href="/combos">Gift combos</a> ·
    <a href="/custom-combo">Build a combo</a> · <a href="/track-order">Track order</a></nav>
</header>`;
const FOOTER = `<footer style="padding:24px;border-top:1px solid #eee;color:#666">
  <p>${BRAND} — The Art of Gifting. Personalised gifts and curated gift combos, made with your photos and words and delivered across India.</p>
  <p>Contact: <a href="mailto:care@gftd.in">care@gftd.in</a> · +91 82403 98515</p>
</footer>`;
const wrap = (inner: string) => `${NAV}<main style="max-width:1100px;margin:0 auto;padding:24px">${inner}</main>${FOOTER}`;

const productItem = (p: any) =>
  `<li><a href="/product/${p.id}">${esc(p.name)}</a> — ${inr(Number(p.price))}${p.description ? `<br /><small>${esc(clip(p.description, 140))}</small>` : ''}</li>`;
const comboItem = (c: any) =>
  `<li><a href="/combo/${c.id}">${esc(c.name)}</a>${c.price ? ` — ${inr(c.price)}` : ''}${c.description ? `<br /><small>${esc(clip(c.description, 140))}</small>` : ''}</li>`;

// ── Data ───────────────────────────────────────────────────────────────────────────────
async function activeProducts(limit = 200) {
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.description, p.price, p.image_url, p.gender,
            COALESCE(STRING_AGG(DISTINCT c.name, ', '), '') AS categories
     FROM products p
     LEFT JOIN product_categories pc ON pc.product_id = p.id
     LEFT JOIN categories c ON c.id = pc.category_id
     WHERE p.is_active = true
     GROUP BY p.id ORDER BY p.created_at DESC LIMIT $1`, [limit]);
  return rows;
}
async function activeCombos(limit = 100) {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.description, c.image_url,
            COALESCE(c.discount_price, SUM(p.price * cp.quantity)) AS price
     FROM combos c
     LEFT JOIN combo_products cp ON cp.combo_id = c.id
     LEFT JOIN products p ON p.id = cp.product_id
     WHERE c.is_active = true
     GROUP BY c.id ORDER BY c.created_at DESC LIMIT $1`, [limit]);
  return rows.map(r => ({ ...r, price: r.price != null ? Number(r.price) : null }));
}
async function activeCategories() {
  const { rows } = await pool.query(
    `SELECT name, description FROM categories WHERE is_active = true ORDER BY display_order, name`);
  return rows;
}

// Unknown/switched-off product or combo: 404 + noindex, but still the app (it shows "not available")
const unavailable = (path: string, kind: 'product' | 'combo'): PageData => ({
  path, status: 404, noindex: true,
  title: `This ${kind} isn't available | ${BRAND}`,
  description: `This ${kind} is no longer available. Browse other personalised gifts at ${BRAND}.`,
  body: wrap(`<h1>This ${kind} isn't available right now</h1>
    <p>It may have sold out or been taken down. <a href="/products">Shop all gifts</a> or <a href="/combos">see gift combos</a>.</p>`),
});

// ── Pages ──────────────────────────────────────────────────────────────────────────────
router.get('/', async (_req, res, next) => {
  try {
    const [products, combos, categories] = await Promise.all([activeProducts(40), activeCombos(12), activeCategories()]);
    send(res, next, {
      path: '/',
      title: `${BRAND} — Personalised Gifts & Gift Combos Online in India`,
      description: 'Shop personalised gifts and curated gift combos at GFTD — custom photo mugs, magnets, cushions, frames and more, made with your photos and words and delivered across India.',
      body: wrap(`
        <h1>Personalised Gifts &amp; Gift Combos, made for the people you love</h1>
        <p>${BRAND} makes personalised gifts with your photos and words — custom mugs, fridge magnets, cushions, frames and keepsakes — plus curated gift combos for birthdays, anniversaries, festivals and every occasion. Every gift is made to order and delivered across India.</p>
        ${categories.length ? `<h2>Shop by category</h2><ul>${categories.map(c => `<li><a href="/products?category=${encodeURIComponent(c.name)}">${esc(c.name)}</a>${c.description ? ` — ${esc(clip(c.description, 120))}` : ''}</li>`).join('')}</ul>` : ''}
        ${products.length ? `<h2>Featured personalised gifts</h2><ul>${products.map(productItem).join('')}</ul><p><a href="/products">See all gifts</a></p>` : ''}
        ${combos.length ? `<h2>Gift combos</h2><ul>${combos.map(comboItem).join('')}</ul><p><a href="/combos">See all gift combos</a></p>` : ''}
        <h2>How personalisation works</h2>
        <p>Pick a gift, add your photos and your message, and we make it for you. Prefer a bundle? Build your own combo and personalise each piece in one simple step-by-step flow.</p>`),
      jsonLd: { '@context': 'https://schema.org', '@type': 'WebPage', name: `${BRAND} — Personalised Gifts & Gift Combos`, url: `${SITE}/` },
    });
  } catch (e) { next(e); }
});

router.get('/products', async (req, res, next) => {
  try {
    const [products, categories] = await Promise.all([activeProducts(), activeCategories()]);
    const category = typeof req.query.category === 'string' ? req.query.category : '';
    const list = category ? products.filter(p => p.categories.split(', ').includes(category)) : products;
    const cat = categories.find(c => c.name === category);
    send(res, next, {
      path: category ? `/products?category=${encodeURIComponent(category)}` : '/products',
      title: category ? `${category} — Personalised ${category} | ${BRAND}` : `Shop All Personalised Gifts | ${BRAND}`,
      description: cat?.description || (category
        ? `Shop personalised ${category.toLowerCase()} at ${BRAND} — made with your photos and words, delivered across India.`
        : `Browse all personalised gifts at ${BRAND}: custom photo mugs, magnets, cushions, frames and more. Made to order and delivered across India.`),
      body: wrap(`
        <h1>${category ? `Personalised ${esc(category)}` : 'All personalised gifts'}</h1>
        <p>${esc(cat?.description || 'Every gift can be personalised with your own photos and words, then made to order and delivered across India.')}</p>
        <ul>${list.map(productItem).join('')}</ul>
        ${categories.length ? `<h2>Categories</h2><ul>${categories.map(c => `<li><a href="/products?category=${encodeURIComponent(c.name)}">${esc(c.name)}</a></li>`).join('')}</ul>` : ''}`),
      jsonLd: {
        '@context': 'https://schema.org', '@type': 'ItemList',
        itemListElement: list.slice(0, 50).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/product/${p.id}`, name: p.name })),
      },
    });
  } catch (e) { next(e); }
});

router.get('/combos', async (_req, res, next) => {
  try {
    const combos = await activeCombos();
    send(res, next, {
      path: '/combos',
      title: `Gift Combos & Hampers | ${BRAND}`,
      description: `Curated gift combos and hampers from ${BRAND} that you can personalise with photos and messages — thoughtfully packed and delivered across India.`,
      body: wrap(`
        <h1>Gift combos &amp; hampers</h1>
        <p>Ready-made gift sets you can personalise piece by piece. Choose a combo, add your photos and words, and we'll pack it into one thoughtful gift.</p>
        <ul>${combos.map(comboItem).join('')}</ul>
        <p>Want to choose every piece yourself? <a href="/custom-combo">Build your own combo</a>.</p>`),
      jsonLd: {
        '@context': 'https://schema.org', '@type': 'ItemList',
        itemListElement: combos.slice(0, 50).map((c, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE}/combo/${c.id}`, name: c.name })),
      },
    });
  } catch (e) { next(e); }
});

router.get('/custom-combo', async (_req, res, next) => {
  try {
    const products = await activeProducts(60);
    send(res, next, {
      path: '/custom-combo',
      title: `Build a Custom Gift Combo | ${BRAND}`,
      description: `Mix and match personalised gifts into your own combo at ${BRAND}. Add photos and messages to each piece and we'll wrap it into one gift.`,
      body: wrap(`
        <h1>Build your own personalised gift combo</h1>
        <p>Pick the pieces you love, personalise each one with your photos and words, and we'll put them together into one gift box delivered across India.</p>
        <h2>Gifts you can add</h2><ul>${products.map(productItem).join('')}</ul>`),
    });
  } catch (e) { next(e); }
});

router.get('/product/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, COALESCE(STRING_AGG(DISTINCT c.name, ', '), '') AS categories
       FROM products p
       LEFT JOIN product_categories pc ON pc.product_id = p.id
       LEFT JOIN categories c ON c.id = pc.category_id
       WHERE p.id::text = $1 AND p.is_active = true GROUP BY p.id`, [String(req.params.id).toLowerCase()]);
    const p = rows[0];
    if (!p) return send(res, next, unavailable(req.path, 'product'));
    const reviews = (await pool.query(
      'SELECT rating, comment, user_name FROM reviews WHERE product_id = $1 AND is_approved = true ORDER BY created_at DESC LIMIT 10', [p.id])).rows;
    const related = (await pool.query(
      `SELECT id, name, price, description FROM products WHERE is_active = true AND id <> $1 ORDER BY random() LIMIT 8`, [p.id])).rows;
    const price = Number(p.price);
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    const images = [p.image_url, ...(p.additional_images || [])].filter(Boolean).map(abs);
    send(res, next, {
      path: `/product/${p.id}`,
      title: `${plain(p.name)} — ${inr(price)} | ${BRAND}`,
      description: p.description || `Personalised ${p.name} from ${BRAND}, made with your photos and words and delivered across India.`,
      image: p.image_url,
      type: 'product',
      body: wrap(`
        <nav aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/products">Shop</a>${p.categories ? ` › <a href="/products?category=${encodeURIComponent(p.categories.split(', ')[0])}">${esc(p.categories.split(', ')[0])}</a>` : ''}</nav>
        <h1>${esc(p.name)}</h1>
        ${p.image_url ? `<img src="${esc(abs(p.image_url))}" alt="${esc(p.name)}" width="480" style="max-width:100%;height:auto" />` : ''}
        <p><strong>${inr(price)}</strong>${p.original_price && Number(p.original_price) > price ? ` <s>${inr(Number(p.original_price))}</s>` : ''}</p>
        ${p.description ? `<h2>About this gift</h2><p>${esc(plain(p.description))}</p>` : ''}
        ${p.is_customizable ? `<h2>Personalise it</h2><p>Add ${[p.max_customization_images > 0 && `up to ${p.max_customization_images} photo${p.max_customization_images > 1 ? 's' : ''}`, p.max_customization_lines > 0 && `${p.max_customization_lines} line${p.max_customization_lines > 1 ? 's' : ''} of text`].filter(Boolean).join(' and ') || 'your own design'} — we make it to order for you.</p>` : ''}
        ${reviews.length ? `<h2>Customer reviews (${avg.toFixed(1)}/5)</h2><ul>${reviews.map(r => `<li>${'★'.repeat(r.rating)} ${esc(clip(r.comment, 200))} — ${esc(r.user_name)}</li>`).join('')}</ul>` : ''}
        ${related.length ? `<h2>You may also like</h2><ul>${related.map(productItem).join('')}</ul>` : ''}`),
      jsonLd: {
        '@context': 'https://schema.org', '@type': 'Product',
        name: plain(p.name), description: plain(p.description), image: images, sku: p.sku || p.id,
        brand: { '@type': 'Brand', name: BRAND },
        offers: {
          '@type': 'Offer', url: `${SITE}/product/${p.id}`, priceCurrency: 'INR', price: price.toFixed(2),
          availability: (p.stock_quantity ?? 1) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          itemCondition: 'https://schema.org/NewCondition',
        },
        ...(reviews.length && { aggregateRating: { '@type': 'AggregateRating', ratingValue: avg.toFixed(1), reviewCount: reviews.length } }),
      },
    });
  } catch (e) { next(e); }
});

router.get('/combo/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, COALESCE(SUM(p.price * cp.quantity), 0) AS mrp,
              COALESCE(JSON_AGG(JSON_BUILD_OBJECT('id', p.id, 'name', p.name, 'price', p.price, 'quantity', cp.quantity))
                FILTER (WHERE p.id IS NOT NULL), '[]') AS items
       FROM combos c
       LEFT JOIN combo_products cp ON cp.combo_id = c.id
       LEFT JOIN products p ON p.id = cp.product_id
       WHERE c.id::text = $1 AND c.is_active = true GROUP BY c.id`, [String(req.params.id).toLowerCase()]);
    const c = rows[0];
    if (!c) return send(res, next, unavailable(req.path, 'combo'));
    const price = c.discount_price != null ? Number(c.discount_price) : Number(c.mrp);
    send(res, next, {
      path: `/combo/${c.id}`,
      title: `${plain(c.name)} — ${inr(price)} | ${BRAND} Gift Combo`,
      description: c.description || `A ${BRAND} gift combo with ${c.items.map((i: any) => i.name).join(', ')}.`,
      image: c.image_url,
      type: 'product',
      body: wrap(`
        <nav aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/combos">Gift combos</a></nav>
        <h1>${esc(c.name)}</h1>
        ${c.image_url ? `<img src="${esc(abs(c.image_url))}" alt="${esc(c.name)}" width="480" style="max-width:100%;height:auto" />` : ''}
        <p><strong>${inr(price)}</strong>${Number(c.mrp) > price ? ` <s>${inr(Number(c.mrp))}</s>` : ''}</p>
        ${c.description ? `<p>${esc(plain(c.description))}</p>` : ''}
        <h2>What's inside</h2>
        <ul>${c.items.map((i: any) => `<li><a href="/product/${i.id}">${esc(i.name)}</a>${i.quantity > 1 ? ` × ${i.quantity}` : ''}</li>`).join('')}</ul>
        <p>Each personalised piece can carry your own photos and words. <a href="/combos">See more gift combos</a>.</p>`),
      jsonLd: {
        '@context': 'https://schema.org', '@type': 'Product', name: plain(c.name), description: plain(c.description),
        image: [c.image_url, ...(c.additional_images || [])].filter(Boolean).map(abs), brand: { '@type': 'Brand', name: BRAND },
        offers: { '@type': 'Offer', url: `${SITE}/combo/${c.id}`, priceCurrency: 'INR', price: price.toFixed(2), availability: 'https://schema.org/InStock' },
      },
    });
  } catch (e) { next(e); }
});

export default router;
