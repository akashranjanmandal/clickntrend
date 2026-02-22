import express from 'express';
import cors from 'cors';
import config from './config';
import productRoutes from './routes/products';
import adminRoutes from './routes/admin';
import comboRoutes from './routes/combos';
import paymentRoutes from './routes/payment';
import orderRoutes from './routes/orders';
import couponRoutes from './routes/coupons';
import categoryRoutes from './routes/categories';
import heroRoutes from './routes/hero';
import settingsRoutes from './routes/settings';
import reviewRoutes from './routes/reviews';
import uploadRoutes from './routes/upload';

const app = express();

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options("*", cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========== ROUTES ==========
console.log('📝 Registering routes...');

app.use("/api/products", productRoutes);
console.log('✅ /api/products registered');

app.use("/api/categories", categoryRoutes);
console.log('✅ /api/categories registered');

app.use("/api/hero", heroRoutes);
console.log('✅ /api/hero registered');

app.use("/api/settings", settingsRoutes);
console.log('✅ /api/settings registered');

app.use("/api/combos", comboRoutes);
console.log('✅ /api/combos registered');

app.use("/api/orders", orderRoutes);
console.log('✅ /api/orders registered');

app.use("/api/payment", paymentRoutes);
console.log('✅ /api/payment registered');

app.use("/api/coupons", couponRoutes);
console.log('✅ /api/coupons registered');

app.use("/api/reviews", reviewRoutes);
console.log('✅ /api/reviews registered');

app.use("/api/upload", uploadRoutes);
console.log('✅ /api/upload registered');

app.use("/api/admin", adminRoutes);
console.log('✅ /api/admin registered');

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is working!" });
});

const PORT = config.port || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📦 Products: http://localhost:${PORT}/api/products`);
  console.log(`🏷️ Categories: http://localhost:${PORT}/api/categories/public`);
  console.log(`🎬 Hero: http://localhost:${PORT}/api/hero/public`);
  console.log(`⚙️ Settings: http://localhost:${PORT}/api/settings/public?key=stats`);
  console.log(`🎁 Combos: http://localhost:${PORT}/api/combos`);
  console.log(`📸 Upload: http://localhost:${PORT}/api/upload/product-images`);
  console.log(`🔐 Admin: http://localhost:${PORT}/api/admin\n`);
});