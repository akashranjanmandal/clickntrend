import { pool } from './db';

export interface PaymentSettings {
  cod_enabled: boolean;
  cod_charge: number;
}

// Used when the row is missing (e.g. before migration 003 has run): COD stays off
const DEFAULTS: PaymentSettings = { cod_enabled: false, cod_charge: 49 };

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const result = await pool.query(`SELECT value FROM site_settings WHERE key = 'payment'`);
  const value = result.rows[0]?.value || {};
  return {
    cod_enabled: value.cod_enabled === true,
    cod_charge: Number.isFinite(Number(value.cod_charge)) ? Math.max(0, Number(value.cod_charge)) : DEFAULTS.cod_charge,
  };
}
