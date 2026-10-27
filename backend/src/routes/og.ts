import express from 'express';
import { pool } from '../utils/db';

/**
 * Link-preview pages for social crawlers (Facebook/Instagram/WhatsApp/X…), which don't run
 * JavaScript. nginx sends crawler requests for /product/:id and /combo/:id here (see
 * deploy note in the commit); people always get the normal app.
 */
const router = express.Router();
const SITE = (process.env.CLIENT_URL || 'https://gftd.in').replace(/\/+$/, '');

const esc = (s: any) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const clip = (s: string, max = 200) => {
  const t = (s || '').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};
const absolute = (url?: string | null) =>
  !url ? `${SITE}/logo.png` : /^https?:\/\//i.test(url) ? url : `${SITE}${url.startsWith('/') ? '' : '/'}${url}`;

function page(p: { url: string; title: string; description: string; image: string; price?: number }) {
  const price = p.price != null && Number.isFinite(p.price) ? Number(p.price).toFixed(2) : null;
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8" />
<title>${esc(p.title)} | GFTD</title>
<meta name="description" content="${esc(p.description)}" />
<link rel="canonical" href="${esc(p.url)}" />
<meta property="og:site_name" content="GFTD" />
<meta property="og:type" content="product" />
<meta property="og:url" content="${esc(p.url)}" />
<meta property="og:title" content="${esc(p.title)}" />
<meta property="og:description" content="${esc(p.description)}" />
<meta property="og:image" content="${esc(p.image)}" />
<meta property="og:locale" content="en_IN" />
${price ? `<meta property="product:price:amount" content="${price}" />
<meta property="product:price:currency" content="INR" />
<meta property="og:price:amount" content="${price}" />
<meta property="og:price:currency" content="INR" />` : ''}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(p.title)}" />
<meta name="twitter:description" content="${esc(p.description)}" />
<meta name="twitter:image" content="${esc(p.image)}" />
</head>
<body>
<h1>${esc(p.title)}</h1>
<p>${esc(p.description)}</p>
<p><a href="${esc(p.url)}">View on GFTD</a></p>
</body>
</html>`;
}

const send = (res: express.Response, html: string) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=600');
  res.send(html);
};

router.get('/product/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, description, image_url, price FROM products WHERE id::text = $1 AND is_active = true',
      [req.params.id]
    );
    const p = rows[0];
    if (!p) return res.redirect(302, SITE + '/');
    send(res, page({
      url: `${SITE}/product/${p.id}`,
      title: p.name,
      description: clip(p.description || `Personalised ${p.name} from GFTD — delivered across India.`),
      image: absolute(p.image_url),
      price: Number(p.price),
    }));
  } catch (error: any) {
    console.error('OG product error:', error);
    res.redirect(302, SITE + '/');
  }
});

router.get('/combo/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.description, c.image_url, c.discount_price,
              COALESCE(SUM(p.price * cp.quantity), 0) AS mrp,
              STRING_AGG(p.name, ', ') AS product_names
       FROM combos c
       LEFT JOIN combo_products cp ON cp.combo_id = c.id
       LEFT JOIN products p ON p.id = cp.product_id
       WHERE c.id::text = $1 AND c.is_active = true
       GROUP BY c.id`,
      [req.params.id]
    );
    const c = rows[0];
    if (!c) return res.redirect(302, SITE + '/combos');
    send(res, page({
      url: `${SITE}/combo/${c.id}`,
      title: c.name,
      description: clip(c.description || `A GFTD gift combo${c.product_names ? ` with ${c.product_names}` : ''}.`),
      image: absolute(c.image_url),
      price: c.discount_price != null ? Number(c.discount_price) : Number(c.mrp),
    }));
  } catch (error: any) {
    console.error('OG combo error:', error);
    res.redirect(302, SITE + '/combos');
  }
});

export default router;
