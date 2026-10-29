  const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // ✅ AWS RDS PostgreSQL — replaces Supabase
  dbHost: process.env.DB_HOST!,
  dbPort: parseInt(process.env.DB_PORT || '5432'),
  dbUser: process.env.DB_USER!,
  dbPassword: process.env.DB_PASSWORD!,
  dbName: process.env.DB_NAME!,
  // Set DB_SSL=false for a local Postgres without SSL (defaults to on for production)
  dbSsl: process.env.DB_SSL !== 'false',

  emailUser: process.env.EMAIL_USER || '',
  emailPassword: process.env.EMAIL_PASSWORD || '',
  // Razorpay: kept only to refund orders paid before the switch to Cashfree
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',

  // Cashfree (all new online payments). CASHFREE_ENV: sandbox | production
  cashfreeAppId: process.env.CASHFREE_APP_ID || '',
  cashfreeSecretKey: process.env.CASHFREE_SECRET_KEY || '',
  cashfreeEnv: (process.env.CASHFREE_ENV === 'production' ? 'production' : 'sandbox') as 'production' | 'sandbox',
  clientUrl: (process.env.CLIENT_URL || 'https://gftd.in').replace(/\/+$/, ''),
};

export default config;
