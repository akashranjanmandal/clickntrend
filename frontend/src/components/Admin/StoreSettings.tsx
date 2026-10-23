import React, { useEffect, useState } from 'react';
import { Settings, Wallet, RefreshCw, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../utils/api';

interface PaymentSettings {
  cod_enabled: boolean;
  cod_charge: number;
}

const StoreSettings: React.FC = () => {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [chargeInput, setChargeInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch('/api/settings?key=payment')
      .then((res: any) => {
        setSettings(res.value);
        setChargeInput(String(res.value.cod_charge));
      })
      .catch((err: any) => toast.error(`Failed to load settings: ${err.message}`));
  }, []);

  const save = async (update: Partial<PaymentSettings>, message: string) => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/settings/admin/payment', {
        method: 'PUT',
        body: JSON.stringify(update),
      });
      setSettings(res.value);
      setChargeInput(String(res.value.cod_charge));
      toast.success(message);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return (
    <div className="bg-white rounded-xl p-8 text-center">
      <RefreshCw className="h-8 w-8 animate-spin text-premium-gold mx-auto" />
    </div>
  );

  const chargeChanged = chargeInput !== String(settings.cod_charge);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-2xl font-serif font-semibold flex items-center gap-2">
            <Settings className="h-6 w-6 text-premium-gold" />
            Store Settings
          </h2>
          <p className="text-sm text-gray-600">Changes apply to the live checkout immediately.</p>
        </div>

        <div className="p-6">
          <h3 className="font-semibold flex items-center gap-2 mb-4">
            <Wallet className="h-5 w-5 text-premium-gold" /> Payments
          </h3>

          <div className="flex items-start justify-between gap-6 p-4 rounded-xl border">
            <div>
              <p className="font-medium">Cash on Delivery</p>
              <p className="text-sm text-gray-600 mt-1">
                {settings.cod_enabled
                  ? 'Customers can choose to pay when the order arrives.'
                  : 'Hidden at checkout — customers can only pay online. COD orders are also refused by the server.'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.cod_enabled}
              disabled={saving}
              onClick={() => save({ cod_enabled: !settings.cod_enabled }, settings.cod_enabled ? 'Cash on Delivery turned off' : 'Cash on Delivery turned on')}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                settings.cod_enabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                settings.cod_enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          <div className={`mt-4 p-4 rounded-xl border ${settings.cod_enabled ? '' : 'opacity-60'}`}>
            <label className="font-medium block">COD charge</label>
            <p className="text-sm text-gray-600 mt-1 mb-3">Extra fee added to orders paid on delivery. Use 0 for no fee.</p>
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={chargeInput}
                  onChange={e => setChargeInput(e.target.value)}
                  className="w-32 pl-7 pr-3 py-2 border rounded-lg focus:outline-none focus:border-premium-gold"
                />
              </div>
              <button
                type="button"
                disabled={!chargeChanged || saving || chargeInput === ''}
                onClick={() => save({ cod_charge: Number(chargeInput) }, 'COD charge updated')}
                className="flex items-center gap-2 px-4 py-2 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy disabled:opacity-40"
              >
                <Save className="h-4 w-4" /> Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreSettings;
