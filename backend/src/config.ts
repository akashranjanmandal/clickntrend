const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL || 'https://dcvqnewqhvrqwbmvcbjr.supabase.co',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdnFuZXdxaHZycXdibXZjYmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1Mzk5NjMsImV4cCI6MjA4NjExNTk2M30.fUkUENDo93QQhg8pjVeb_p8Qyn5c6tPJq2nuyWzN9Vc',
  supabaseServiceRole: process.env.SUPABASE_SERVICE_ROLE || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjdnFuZXdxaHZycXdibXZjYmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDUzOTk2MywiZXhwIjoyMDg2MTE1OTYzfQ.IATx5v019qWTD6EPSAsR6oRuLrL7LsDKy7tB8_ANVOY',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_S9LiztGfZXMOh1',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'EBJAbr1XMi6wkyKc4U2WjBsJ'
};

export default config;