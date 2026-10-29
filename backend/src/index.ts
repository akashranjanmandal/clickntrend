import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import helmet from 'helmet';
import { corsOptions, limits, hideServerErrors } from './middleware/security';
import { uploadErrorHandler } from './utils/uploads';
import config from './config';
import logoRoutes from './routes/logo';
import { runMigrations } from './utils/migrate';
import sitemapRoutes from './routes/sitemap';
import ogRoutes from './routes/og';
import renderRoutes from './routes/render';
import productSizeRoutes from './routes/product-sizes';
// ===== PUBLIC ROUTES =====
import publicColorRoutes from './routes/product-colors-public';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import heroRoutes from './routes/hero';
import settingsRoutes from './routes/settings';
import comboRoutes from './routes/combos';
import orderRoutes from './routes/orders';
import paymentRoutes from './routes/payment';
import couponRoutes from './routes/coupons';
import reviewRoutes from './routes/reviews';
import uploadRoutes from './routes/upload';
import popupRoutes from './routes/popups';
import socialProofRoutes from './routes/social-proof';
import genderRoutes from './routes/genders';
// ===== ADMIN ROUTES =====
import adminRoutes from './routes/admin';
import adminHeroRoutes from './routes/adminHero';
import adminPopupRoutes from './routes/adminPopups';
import productColorRoutes from './routes/product-colors';

const app = express();

/* ===================== SECURITY ===================== */
app.disable('x-powered-by');
// Behind nginx: trust the first proxy so req.ip is the visitor's real IP (needed for rate limits)
app.set('trust proxy', 1);
// Security headers. CSP is off because the server-rendered pages load the Meta Pixel inline script.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// JSON bodies are small (files go through the upload routes). rawBody is kept for webhook signatures.
app.use(express.json({ limit: '2mb', verify: (req: any, _res, buf) => { req.rawBody = buf.toString('utf8'); } }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Server errors never expose internal details to visitors
app.use(hideServerErrors);

// Rate limits: off unless RATE_LIMIT=on. Turn on only after nginx forwards the visitor's IP
// (X-Real-IP / X-Forwarded-For), otherwise every visitor shares one limit.
if (process.env.RATE_LIMIT === 'on') {
  app.use('/api', limits.api);
  app.post('/api/orders/cod', limits.orders);
  app.post('/api/payment/cashfree/create-order', limits.orders);
  app.post('/api/payment/cashfree/verify', limits.paymentVerify);
  app.post('/api/coupons/validate', limits.coupons);
  app.post('/api/reviews', limits.reviews);
  app.post('/api/upload/customization', limits.customerUploads);
  app.post('/api/upload/customizations', limits.customerUploads);
  app.get('/api/orders/track', limits.lookups);
  app.get('/api/orders/confirmation/:id', limits.lookups);
  app.post('/api/popups/track-view', limits.tracking);
  app.post('/api/popups/track-click', limits.tracking);
  app.post('/api/social-proof/track-view', limits.tracking);
  app.post('/api/social-proof/track-purchase', limits.tracking);
}

console.log('📝 Registering routes...');

/* ===================== PUBLIC APIs ===================== */
app.use('/api', sitemapRoutes); // /api/sitemap.xml
app.use('/api/og', ogRoutes); // link previews for social crawlers (/product/:id, /combo/:id)
app.use('/api/products', productRoutes);
console.log('✅ /api/products');

app.use('/api/genders', genderRoutes);
// Alias so admin components calling /api/admin/genders also work
app.use('/api/admin/genders', genderRoutes);

app.use('/api/categories', categoryRoutes);
console.log('✅ /api/categories');

app.use('/api/hero', heroRoutes);
console.log('✅ /api/hero');

app.use('/api/logo', logoRoutes);
console.log('✅ /api/logo');

app.use('/api/settings', settingsRoutes);
console.log('✅ /api/settings');

app.use('/api/combos', comboRoutes);
console.log('✅ /api/combos');

app.use('/api/orders', orderRoutes);
console.log('✅ /api/orders');

app.use('/api/payment', paymentRoutes);
console.log('✅ /api/payment');

app.use('/api/coupons', couponRoutes);
console.log('✅ /api/coupons');

app.use('/api/reviews', reviewRoutes);
console.log('✅ /api/reviews');

app.use('/api/upload', uploadRoutes);
console.log('✅ /api/upload');

app.use('/api/popups', popupRoutes);
console.log('✅ /api/popups');

app.use('/api/social-proof', socialProofRoutes);
console.log('✅ /api/social-proof');

app.use('/api/admin/combos', comboRoutes);
console.log('✅ /api/admin/combos');

app.use('/api/admin/hero', adminHeroRoutes);
console.log('✅ /api/admin/hero');

// Public color routes: GET /api/products/:id/colors
app.use('/api', publicColorRoutes);
console.log('✅ /api/products/:id/colors (public)');

// Public size routes: GET /api/products/:id/sizes
app.use('/api', productSizeRoutes);
console.log('✅ /api/products/:id/sizes (public)');

app.use('/api/admin/popups', adminPopupRoutes);
console.log('✅ /api/admin/popups');

// Admin color routes: /api/admin/products/:id/colors (GET all, POST, DELETE all)
app.use('/api/admin', productColorRoutes);
console.log('✅ /api/admin/products/:id/colors (admin)');

// Admin size routes: /api/admin/products/:id/sizes (POST, DELETE all, GET /all)
app.use('/api/admin', productSizeRoutes);
console.log('✅ /api/admin/products/:id/sizes (admin)');
/* ===================== ADMIN APIs ===================== */
app.use('/api/admin', adminRoutes);
console.log('✅ /api/admin');

app.use('/api/admin/hero', adminHeroRoutes);
console.log('✅ /api/admin/hero');

app.use('/api/admin/popups', adminPopupRoutes);
console.log('✅ /api/admin/popups');
/* ===================== SERVER-RENDERED PAGES (SEO) ===================== */
// / /products /combos /custom-combo /product/:id /combo/:id — nginx proxies these here
app.use(renderRoutes);

/* ===================== HEALTH ===================== */
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

app.get('/api/test', (_req, res) => {
  res.json({ message: 'Backend is working 🚀' });
});

// Clear JSON errors for oversized / wrong-type uploads (instead of an HTML error page)
app.use(uploadErrorHandler);

/* ===================== SERVER ===================== */
const PORT = config.port || 5000;

// Bring the database schema up to date before serving (migrations are idempotent)
runMigrations().catch((err) => {
  console.error('❌ Database migration failed — order status/payment updates will not work until fixed:', err.message);
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`🔎 Health: http://localhost:${PORT}/health`);
  console.log(`📦 Products: http://localhost:${PORT}/api/products`);
  console.log(`🏷️ Categories: http://localhost:${PORT}/api/categories`);
  console.log(`🎬 Hero: http://localhost:${PORT}/api/hero`);
  console.log(`🎯 Logo: http://localhost:${PORT}/api/logo/active`);
  console.log(`🎯 Admin Logo: http://localhost:${PORT}/api/logo/admin`);
  console.log(`📋 Orders: http://localhost:${PORT}/api/orders`);
  console.log(`🎫 Coupons: http://localhost:${PORT}/api/coupons`);
  console.log(`🔐 Admin: http://localhost:${PORT}/api/admin\n`);
});