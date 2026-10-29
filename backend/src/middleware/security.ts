import type { Request, Response, NextFunction } from 'express';
import type { CorsOptions } from 'cors';
import rateLimit, { Options } from 'express-rate-limit';
import config from '../config';

// ── CORS: only the shop itself (plus local dev) may call the API from a browser ─────────────
const allowedOrigins = new Set<string>([config.clientUrl]);
try {
  const u = new URL(config.clientUrl);
  allowedOrigins.add(`${u.protocol}//${u.hostname.startsWith('www.') ? u.hostname.slice(4) : `www.${u.hostname}`}`);
} catch { /* CLIENT_URL not a URL */ }
if (config.nodeEnv !== 'production') {
  ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'].forEach(o => allowedOrigins.add(o));
}

export const corsOptions: CorsOptions = {
  // Requests without an Origin (server-to-server: Cashfree webhooks, crawlers, curl) are allowed
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.has(origin)),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// ── Rate limits (per visitor IP; nginx must forward the real IP — see deploy notes) ─────────
const limiter = (max: number, windowMinutes: number, message: string, extra: Partial<Options> = {}) => rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  limit: max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: message },
  ...extra,
});

export const limits = {
  /** Every API request — a generous ceiling against floods */
  api: limiter(600, 5, 'Too many requests. Please slow down and try again shortly.', {
    skip: req => req.path.startsWith('/payment/cashfree/webhook'),
  }),
  /** Placing orders / starting payments */
  orders: limiter(15, 15, 'Too many order attempts. Please wait a few minutes and try again.'),
  /** Confirming payments (popup + return page both call this) */
  paymentVerify: limiter(60, 15, 'Too many attempts. Please wait a few minutes and try again.'),
  /** Coupon checks (stops guessing codes) */
  coupons: limiter(30, 15, 'Too many coupon attempts. Please try again later.'),
  /** Writing reviews */
  reviews: limiter(5, 60, 'You have posted several reviews recently. Please try again later.'),
  /** Customer photo uploads */
  customerUploads: limiter(60, 15, 'Too many uploads. Please wait a few minutes and try again.'),
  /** Order tracking / confirmation lookups */
  lookups: limiter(60, 15, 'Too many lookups. Please wait a few minutes and try again.'),
  /** Popup / social-proof counters */
  tracking: limiter(120, 15, 'Too many requests.'),
};

// ── Never leak internal error details (DB errors, stack traces) to visitors ─────────────────
/**
 * For any 5xx JSON response the client gets a generic message; the original is logged.
 * A route can keep its own wording by setting `public: true` in the body.
 */
export function hideServerErrors(req: Request, res: Response, next: NextFunction) {
  const json = res.json.bind(res);
  res.json = (body: any) => {
    if (res.statusCode >= 500 && body && typeof body === 'object') {
      const { public: isPublic, details, ...rest } = body;
      if (details || !isPublic) console.error(`[${res.statusCode}] ${req.method} ${req.originalUrl}:`, body.error, details || '');
      return json(isPublic
        ? rest
        : { ...(rest.success === false ? { success: false } : {}), error: 'Something went wrong. Please try again in a moment.' });
    }
    return json(body);
  };
  next();
}
