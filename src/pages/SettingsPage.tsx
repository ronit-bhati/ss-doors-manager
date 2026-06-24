import { useState, useEffect } from 'react';
import { Save, Database, ShieldAlert, HelpCircle } from 'lucide-react';

export function SettingsPage() {
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [defaultUnit, setDefaultUnit] = useState<'inches' | 'feet'>('inches');
  const [defaultDoorRate, setDefaultDoorRate] = useState<number | ''>('');
  const [defaultChaukhatRate, setDefaultChaukhatRate] = useState<number | ''>('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await window.api.getAllSettings();
      if (data) {
        setShopName(data.shop_name || '');
        setShopAddress(data.shop_address || '');
        setShopPhone(data.shop_phone || '');
        setDefaultUnit((data.default_unit as 'inches' | 'feet') || 'inches');
        setDefaultDoorRate(data.default_door_rate ? parseFloat(data.default_door_rate) || 0 : 0);
        setDefaultChaukhatRate(data.default_chaukhat_rate ? parseFloat(data.default_chaukhat_rate) || 0 : 0);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const finalDoorRate = typeof defaultDoorRate === 'number' ? Math.max(0, defaultDoorRate) : 0;
    const finalChaukhatRate = typeof defaultChaukhatRate === 'number' ? Math.max(0, defaultChaukhatRate) : 0;
    try {
      await window.api.setSetting('shop_name', shopName);
      await window.api.setSetting('shop_address', shopAddress);
      await window.api.setSetting('shop_phone', shopPhone);
      await window.api.setSetting('default_unit', defaultUnit);
      await window.api.setSetting('default_door_rate', String(finalDoorRate));
      await window.api.setSetting('default_chaukhat_rate', String(finalChaukhatRate));
      
      setDefaultDoorRate(finalDoorRate);
      setDefaultChaukhatRate(finalChaukhatRate);
      showToast('Settings saved successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleBackupDatabase = async () => {
    try {
      const result = await window.api.backupDatabase();
      if (result.success) {
        alert(`Backup created successfully at:\n${result.path}`);
      } else if (result.error !== 'Cancelled') {
        alert(`Backup failed: ${result.error}`);
      }
    } catch (err: unknown) {
      console.error(err);
      alert(`Error backing up: ${(err as Error).message}`);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>
        Loading configuration settings...
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="toast-msg" style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600 }}>
          System: {toastMessage}
        </div>
      )}

      <div className="page-header">
        <div className="page-title-group">
          <h1 className="page-title" style={{ fontFamily: 'var(--font-body)' }}>Application Settings</h1>
          <p className="page-subtitle">Configure system constants and database backups</p>
        </div>
      </div>

      <div className="detail-grid" style={{ gridTemplateColumns: '1.8fr 1fr' }}>
        {/* Left Column: Form Settings */}
        <form onSubmit={handleSaveSettings} className="card-el" style={{ gap: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', textTransform: 'uppercase' }}>
            Shop & Default Configurations
          </h2>

          <div className="form-group">
            <label htmlFor="shop-name-input" className="form-label" style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>Shop Name</label>
            <input
              id="shop-name-input"
              type="text"
              className="form-input"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              placeholder="e.g. SS Doors"
              maxLength={100}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="shop-phone-input" className="form-label" style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>Contact Phone</label>
              <input
                id="shop-phone-input"
                type="text"
                className="form-input"
                value={shopPhone}
                onChange={(e) => setShopPhone(e.target.value)}
                placeholder="e.g. +91 99999 88888"
                maxLength={50}
              />
            </div>
            <div className="form-group">
              <label htmlFor="default-unit-select" className="form-label" style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>Default Measurement Unit</label>
              <select
                id="default-unit-select"
                className="form-select"
                value={defaultUnit}
                onChange={(e) => setDefaultUnit(e.target.value as 'inches' | 'feet')}
              >
                <option value="inches">INCHES</option>
                <option value="feet">FEET</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="shop-address-textarea" className="form-label" style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>Shop Address (printed on invoices)</label>
            <textarea
              id="shop-address-textarea"
              className="form-textarea"
              value={shopAddress}
              onChange={(e) => setShopAddress(e.target.value)}
              placeholder="e.g. Plot No. 4, Industrial Area Phase II, New Delhi"
              maxLength={200}
            />
          </div>

          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem', fontFamily: 'var(--font-body)', textTransform: 'uppercase' }}>
            Default Rates
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '-0.75rem' }}>
            These rates will automatically pre-fill for all newly created orders, but can be modified per-order.
          </p>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="default-door-rate-input" className="form-label" style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>Default Door Rate (₹ / sqft)</label>
              <input
                id="default-door-rate-input"
                type="number"
                className="form-input"
                style={{ fontFamily: 'var(--font-display)' }}
                value={defaultDoorRate}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                  setDefaultDoorRate(val);
                }}
                placeholder="0.00"
                min={0}
                step="any"
              />
            </div>
            <div className="form-group">
              <label htmlFor="default-chaukhat-rate-input" className="form-label" style={{ fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                Default Chaukhat Rate (₹ / running {defaultUnit === 'inches' ? 'in' : 'ft'})
              </label>
              <input
                id="default-chaukhat-rate-input"
                type="number"
                className="form-input"
                style={{ fontFamily: 'var(--font-display)' }}
                value={defaultChaukhatRate}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                  setDefaultChaukhatRate(val);
                }}
                placeholder="0.00"
                min={0}
                step="any"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
              <Save size={16} />
              <span>{saving ? 'Saving Settings...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>

        {/* Right Column: Backup and Operations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card-el" style={{ gap: '1rem', backgroundColor: 'rgba(30, 41, 59, 0.03)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <Database size={16} />
              <span>Database Backups</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.45 }}>
              To protect your business database records from hardware failure or accidental loss, copy your offline database to a secure external folder.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}
              onClick={handleBackupDatabase}
            >
              <Database size={16} />
              <span>Backup Database</span>
            </button>
          </div>

          <div className="card-el" style={{ gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <HelpCircle size={16} />
              <span>Help & Diagnostics</span>
            </h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <p style={{ fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: '0.25rem', fontFamily: 'var(--font-body)', fontSize: '0.8rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <ShieldAlert size={14} />
                  <span>Offline Database File:</span>
                </p>
                <code style={{ fontSize: '0.75rem', backgroundColor: 'var(--color-bg-app)', padding: '0.5rem', display: 'block', border: '1px solid var(--color-border)', fontFamily: 'var(--font-display)' }}>
                  ss-doors-manager.db
                </code>
              </div>
              <p>All client metrics, doors and chaukhat specifications, and pricing multipliers are stored locally on this machine. No data is transmitted externally.</p>
            </div>
          </div>

          <div className="card-el" style={{ gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <HelpCircle size={16} />
              <span>Keyboard Shortcuts</span>
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.25rem', lineHeight: '1.45' }}>
              Accelerate your workflow with these quick key triggers:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', fontFamily: 'var(--font-body)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.25rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>New Client:</span>
                <kbd>Alt + N</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.25rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Edit Client:</span>
                <kbd>Alt + E</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.25rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>New Order:</span>
                <kbd>Alt + O</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.25rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Delete Client:</span>
                <kbd>Alt + D</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.25rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Save Order:</span>
                <kbd>Ctrl + S</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.25rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Export PDF / Print:</span>
                <kbd>Ctrl + P</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.25rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Add Door / Chaukhat:</span>
                <kbd>Alt + D / C</kbd>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.25rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>Cancel / Back:</span>
                <kbd>Escape</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
