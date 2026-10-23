import express from 'express';
import { pool } from '../utils/db';
import { requireAuth } from '../middleware/auth';
import { getPaymentSettings } from '../utils/paymentSettings';

const router = express.Router();

console.log('✅ settings routes loaded');

router.get('/', async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return res.status(400).json({ error: 'key is required' });

    if (key === 'payment') return res.json({ value: await getPaymentSettings() });

    const result = await pool.query(
      'SELECT value FROM site_settings WHERE key = $1',
      [key]
    );

    res.json(result.rows[0] ?? { value: null });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: update payment settings (COD on/off and COD charge)
router.put('/admin/payment', requireAuth, async (req, res) => {
  try {
    const current = await getPaymentSettings();
    const { cod_enabled, cod_charge } = req.body;

    if (cod_enabled !== undefined && typeof cod_enabled !== 'boolean') {
      return res.status(400).json({ error: 'cod_enabled must be true or false' });
    }
    if (cod_charge !== undefined && (!Number.isFinite(Number(cod_charge)) || Number(cod_charge) < 0 || Number(cod_charge) > 10000)) {
      return res.status(400).json({ error: 'COD charge must be between ₹0 and ₹10,000' });
    }

    const value = {
      cod_enabled: cod_enabled ?? current.cod_enabled,
      cod_charge: cod_charge !== undefined ? Math.round(Number(cod_charge)) : current.cod_charge,
    };
    await pool.query(
      `INSERT INTO site_settings (key, value, updated_at) VALUES ('payment', $1::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify(value)]
    );
    res.json({ success: true, value });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
