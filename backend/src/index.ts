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

// CORS configuration
const allowedOrigins: string[] = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://clickntrend.vercel.app",
  "https://api.gftd.in",
  "https://www.gftd.in",
];

// Add FRONTEND_URL if it exists
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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