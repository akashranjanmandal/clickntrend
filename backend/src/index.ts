import express, { Request, Response, NextFunction } from "express";
import cors from 'cors';
import config from './config';
import productRoutes from './routes/products';
import adminRoutes from './routes/admin';
import comboRoutes from './routes/combos';
import paymentRoutes from './routes/payment';
import orderRoutes from './routes/orders';
import couponRoutes from './routes/coupons';

const app = express();


app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      const allowedOrigins = [
        "http://localhost:5173",
        "https://clickntrend.vercel.app",
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// IMPORTANT: Mount routes with proper paths
app.use('/api/products', productRoutes);      // All product routes
app.use('/api/combos', comboRoutes);          // All combo routes
app.use('/api/orders', orderRoutes);           // All order routes (COD, etc.)
app.use('/api/payment', paymentRoutes);        // All payment routes
app.use('/api/coupons', couponRoutes);         // All coupon routes (validate, etc.)
app.use('/api/admin', adminRoutes);             // All admin routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = config.port || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Supabase URL: ${config.supabaseUrl}`);
  console.log(`🌐 CORS enabled for: http://localhost:5173`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🛠️  API Test: http://localhost:${PORT}/api/test`);
});