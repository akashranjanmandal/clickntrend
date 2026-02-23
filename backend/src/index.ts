import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import config from './config';

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

// ===== ADMIN ROUTES (IMPORTANT) =====
import adminRoutes from './routes/admin';
import adminHeroRoutes from './routes/adminHero';
import adminPopupRoutes from './routes/popups';
import adminCategoryRoutes from './routes/categories';

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

app.use('/api/categories', categoryRoutes);
console.log('✅ /api/categories');

app.use('/api/hero', heroRoutes);
console.log('✅ /api/hero');

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

/* ===================== ADMIN APIs ===================== */
app.use('/api/admin', adminRoutes);
console.log('✅ /api/admin');


/* ===================== HEALTH ===================== */
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', time: new Date().toISOString() });
});

app.get('/api/test', (_req, res) => {
  res.json({ message: 'Backend is working 🚀' });
});

/* ===================== SERVER ===================== */
const PORT = config.port || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`🔎 Health: http://localhost:${PORT}/health`);
  console.log(`🔐 Admin Hero: http://localhost:${PORT}/api/admin/hero`);
  console.log(`🎯 Admin Popups: http://localhost:${PORT}/api/admin/popups`);
  console.log(`📦 Products: http://localhost:${PORT}/api/products\n`);
});