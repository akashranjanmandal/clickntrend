import express from 'express';
import { pool } from '../utils/db';

const router = express.Router();

const SITE_URL = (process.env.CLIENT_URL || 'https://gftd.in').replace(/\/+$/, '');

const xmlEscape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

// GET /api/sitemap.xml — static pages plus every active product and combo
router.get('/sitemap.xml', async (_req, res) => {
  try {
    const [products, combos] = await Promise.all([
      pool.query('SELECT id, updated_at FROM products WHERE is_active = true ORDER BY updated_at DESC'),
      pool.query('SELECT id, updated_at FROM combos WHERE is_active = true ORDER BY updated_at DESC'),
    ]);

    const urls: { loc: string; lastmod?: string; priority: string }[] = [
      { loc: '/', priority: '1.0' },
      { loc: '/products', priority: '0.9' },
      { loc: '/combos', priority: '0.8' },
      { loc: '/custom-combo', priority: '0.7' },
      ...products.rows.map((p: any) => ({ loc: `/product/${p.id}`, lastmod: p.updated_at, priority: '0.8' })),
      ...combos.rows.map((c: any) => ({ loc: `/combo/${c.id}`, lastmod: c.updated_at, priority: '0.7' })),
    ];

    const body = urls.map(u => [
      '  <url>',
      `    <loc>${xmlEscape(SITE_URL + u.loc)}</loc>`,
      u.lastmod ? `    <lastmod>${new Date(u.lastmod).toISOString().slice(0, 10)}</lastmod>` : '',
      `    <priority>${u.priority}</priority>`,
      '  </url>',
    ].filter(Boolean).join('\n')).join('\n');

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
  } catch (error: any) {
    console.error('Error building sitemap:', error);
    res.status(500).send('Sitemap unavailable');
  }
});

export default router;
