import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import config from "./config";

import productRoutes from "./routes/products";
import adminRoutes from "./routes/admin";
import comboRoutes from "./routes/combos";
import paymentRoutes from "./routes/payment";
import orderRoutes from "./routes/orders";
import couponRoutes from "./routes/coupons";

const app = express();

/* ================================
   ✅ GLOBAL CORS (FINAL & SAFE)
================================ */
const allowedOrigins = [
  "http://localhost:5173",
  "https://clickntrend.vercel.app",
  "https://api.gftd.in",
  "https://www.gftd.in",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// REQUIRED for browsers
app.options("*", cors());

/* ================================
   BODY PARSERS
================================ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================================
   ROUTES
================================ */
app.use("/api/products", productRoutes);
app.use("/api/combos", comboRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/admin", adminRoutes);

/* ================================
   HEALTH & TEST
================================ */
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is working!" });
});

/* ================================
   ERROR HANDLER (CORS SAFE)
================================ */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled Error:", err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

/* ================================
   SERVER
================================ */
const PORT = config.port || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});