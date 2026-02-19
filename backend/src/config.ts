const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
  supabaseServiceRole: process.env.SUPABASE_SERVICE_ROLE!,

  razorpayKeyId: process.env.RAZORPAY_KEY_ID!,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET!
};

export default config;