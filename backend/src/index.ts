import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import config from './config';
import logoRoutes from './routes/logo';
import { transporter } from './services/gmailService';
// ===== PUBLIC ROUTES =====
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

const app = express();

/* ===================== CORS ===================== */
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('📝 Registering routes...');

/* ===================== PUBLIC APIs ===================== */
app.use('/api/products', productRoutes);
console.log('✅ /api/products');

app.use('/api/genders', genderRoutes);

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
// Add this line - mount combo routes under admin as well
app.use('/api/admin/combos', comboRoutes);
console.log('✅ /api/admin/combos');

app.use('/api/admin/hero', adminHeroRoutes);
console.log('✅ /api/admin/hero');

app.use('/api/admin/popups', adminPopupRoutes);
console.log('✅ /api/admin/popups');
/* ===================== ADMIN APIs ===================== */
app.use('/api/admin', adminRoutes);
console.log('✅ /api/admin');

app.use('/api/admin/hero', adminHeroRoutes);
console.log('✅ /api/admin/hero');

app.use('/api/admin/popups', adminPopupRoutes);
console.log('✅ /api/admin/popups');

// Admin logo routes are already handled by logoRoutes under /api/logo/admin
// So no need to duplicate

/* ===================== HEALTH ===================== */
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

app.get('/api/test', (_req, res) => {
  res.json({ message: 'Backend is working 🚀' });
});
app.get('/smtp-test', async (_req, res) => {
  try {
    await transporter.verify();
    res.json({ status: "SMTP working ✅" });
  } catch (err) {
    console.error("SMTP test failed:", err);
    res.status(500).json({ status: "SMTP failed ❌", error: err });
  }
});
/* ===================== SERVER ===================== */
const PORT = config.port || 5000;

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