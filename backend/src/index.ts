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

const app = express();

// CORS configuration - Allow all origins for now (you can restrict later)
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options("*", cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/products", productRoutes);
app.use("/api/combos", comboRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/hero", heroRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/reviews", reviewRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is working!" });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Error:", err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const PORT = config.port || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📦 Products: http://localhost:${PORT}/api/products`);
  console.log(`🏷️ Categories: http://localhost:${PORT}/api/categories`);
  console.log(`🎬 Hero: http://localhost:${PORT}/api/hero`);
  console.log(`⚙️ Settings: http://localhost:${PORT}/api/settings`);
  console.log(`📝 Reviews: http://localhost:${PORT}/api/reviews`);
});