import { Calculator, HelpCircle } from 'lucide-react';

interface OrderSummaryProps {
  doorsSubtotal: number;
  chaukhatSubtotal: number;
  doorRate: number | '';
  chaukhatRate: number | '';
  onDoorRateChange: (val: number | '') => void;
  onChaukhatRateChange: (val: number | '') => void;
}

export function OrderSummary({
  doorsSubtotal,
  chaukhatSubtotal,
  doorRate,
  chaukhatRate,
  onDoorRateChange,
  onChaukhatRateChange
}: OrderSummaryProps) {
  const dRate = typeof doorRate === 'number' ? doorRate : 0;
  const cRate = typeof chaukhatRate === 'number' ? chaukhatRate : 0;

  const doorsAmount = doorsSubtotal * dRate;
  const chaukhatAmount = chaukhatSubtotal * cRate;
  const totalAmount = doorsAmount + chaukhatAmount;

  return (
    <div className="summary-panel animate-fade-in">
      <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.375rem', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <Calculator size={18} style={{ color: 'var(--color-accent-amber)' }} />
          <span>Summary & Rates</span>
        </div>
        <div className="help-tooltip">
          <HelpCircle size={15} />
          <div className="tooltip-text">
            <strong>Calculation Rules:</strong>
            <div style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
              <strong>Doors:</strong> H × W × Qty (divided by 144 if inches). Output is in Square Feet (SQFT).
            </div>
            <div style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
              <strong>Chaukhats:</strong> (H + H + W) × Qty (divided by 12 if inches). Output is in Feet (FT).
            </div>
          </div>
        </div>
      </h3>

      <div className="rate-control-group">
        <div className="rate-input-container">
          <label htmlFor="door-rate-input" className="form-label" style={{ fontSize: '0.725rem', fontFamily: 'var(--font-body)' }}>
            Door Rate (₹/sqft)
          </label>
          <input
            id="door-rate-input"
            type="number"
            className="form-input"
            style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem' }}
            value={doorRate}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : parseFloat(e.target.value);
              if (typeof val === 'number') {
                onDoorRateChange(val < 0 ? 0 : val);
              } else {
                onDoorRateChange(val);
              }
            }}
            onBlur={(e) => {
              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
              onDoorRateChange(isNaN(val) || val < 0 ? 0 : val);
            }}
            placeholder="0.00"
            min={0}
            step="any"
          />
        </div>
        <div className="rate-input-container">
          <label htmlFor="chaukhat-rate-input" className="form-label" style={{ fontSize: '0.725rem', fontFamily: 'var(--font-body)' }}>
            Chaukhat Rate (₹/ft)
          </label>
          <input
            id="chaukhat-rate-input"
            type="number"
            className="form-input"
            style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem' }}
            value={chaukhatRate}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : parseFloat(e.target.value);
              if (typeof val === 'number') {
                onChaukhatRateChange(val < 0 ? 0 : val);
              } else {
                onChaukhatRateChange(val);
              }
            }}
            onBlur={(e) => {
              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
              onChaukhatRateChange(isNaN(val) || val < 0 ? 0 : val);
            }}
            placeholder="0.00"
            min={0}
            step="any"
          />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
        <div className="summary-row">
          <span style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', fontWeight: 700 }}>Doors Area Total:</span>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>{doorsSubtotal.toFixed(2)} SQFT</span>
        </div>
        <div className="summary-row">
          <span style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', fontWeight: 700 }}>Doors Total Cost:</span>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            ₹{doorsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '0.25rem 0' }} />

        <div className="summary-row">
          <span style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', fontWeight: 700 }}>Chaukhats Length Total:</span>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            {chaukhatSubtotal.toFixed(2)} FT
          </span>
        </div>
        <div className="summary-row">
          <span style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', fontWeight: 700 }}>Chaukhats Total Cost:</span>
          <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
            ₹{chaukhatAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="summary-row total" style={{ fontFamily: 'var(--font-body)' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>GRAND TOTAL:</span>
          <span style={{ color: 'var(--color-emerald)', fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800 }}>
            ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
