import { Calculator, HelpCircle } from 'lucide-react';

interface OrderSummaryProps {
  doorsSubtotal: number;
  chaukhatSubtotal: number;
  railingsSubtotal?: number;
  fixGolaSubtotal?: number;
  mouldingSubtotal?: number;
  doorsAmount: number;
  chaukhatAmount: number;
  railingsAmount?: number;
  fixGolaAmount?: number;
  mouldingAmount?: number;
  doorsExtraLabel?: string;
  doorsExtraRate?: number;
  chaukhatExtraLabel?: string;
  chaukhatExtraRate?: number;
  railingsExtraLabel?: string;
  railingsExtraRate?: number;
  fixGolaExtraLabel?: string;
  fixGolaExtraRate?: number;
  mouldingExtraLabel?: string;
  mouldingExtraRate?: number;
  advancePaid?: number;
  paymentStatus?: string;
}

export function OrderSummary({
  doorsSubtotal,
  chaukhatSubtotal,
  railingsSubtotal = 0,
  fixGolaSubtotal = 0,
  mouldingSubtotal = 0,
  doorsAmount,
  chaukhatAmount,
  railingsAmount = 0,
  fixGolaAmount = 0,
  mouldingAmount = 0,
  doorsExtraLabel = '',
  doorsExtraRate = 0,
  chaukhatExtraLabel = '',
  chaukhatExtraRate = 0,
  railingsExtraLabel = '',
  railingsExtraRate = 0,
  fixGolaExtraLabel = '',
  fixGolaExtraRate = 0,
  mouldingExtraLabel = '',
  mouldingExtraRate = 0,
  advancePaid = 0,
  paymentStatus = 'pending'
}: OrderSummaryProps) {
  const doorsExtraAmount = doorsSubtotal * doorsExtraRate;
  const chaukhatExtraAmount = chaukhatSubtotal * chaukhatExtraRate;
  const railingsExtraAmount = railingsSubtotal * railingsExtraRate;
  const fixGolaExtraAmount = fixGolaSubtotal * fixGolaExtraRate;
  const mouldingExtraAmount = mouldingSubtotal * mouldingExtraRate;

  const totalAmount =
    doorsAmount + doorsExtraAmount +
    chaukhatAmount + chaukhatExtraAmount +
    railingsAmount + railingsExtraAmount +
    fixGolaAmount + fixGolaExtraAmount +
    mouldingAmount + mouldingExtraAmount;

  return (
    <div className="summary-panel animate-fade-in">
      <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.375rem', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <Calculator size={18} style={{ color: 'var(--color-accent-amber)' }} />
          <span>Summary & Totals</span>
        </div>
        <div className="help-tooltip">
          <HelpCircle size={15} />
          <div className="tooltip-text">
            <strong>Calculation Rules:</strong>
            <div style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
              <strong>Doors:</strong> H × W × Qty (divided by 144 if inches). Output in Square Feet (SQFT).
            </div>
            <div style={{ marginTop: '0.25rem', fontSize: '0.7rem' }}>
              <strong>Others:</strong> (H + H + W) × Qty (divided by 12 if inches). Output in Running Feet (FT).
            </div>
          </div>
        </div>
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
        {doorsSubtotal > 0 && (
          <>
            <div className="summary-row">
              <span style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', fontWeight: 700 }}>Doors Area Total:</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>{doorsSubtotal.toFixed(2)} SQFT</span>
            </div>
            <div className="summary-row">
              <span style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', fontWeight: 700 }}>
                Doors Total Cost:
              </span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                ₹{doorsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {doorsExtraLabel && doorsExtraRate > 0 && (
              <div className="summary-row">
                <span style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', fontWeight: 700 }}>
                  Doors {doorsExtraLabel} (₹{doorsExtraRate}/sqft):
                </span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  ₹{doorsExtraAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '0.25rem 0' }} />
          </>
        )}

        {chaukhatSubtotal > 0 && (
          <>
            <div className="summary-row">
              <span style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', fontWeight: 700 }}>Chaukhats Length Total:</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>{chaukhatSubtotal.toFixed(2)} FT</span>
            </div>
            <div className="summary-row">
              <span style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', fontWeight: 700 }}>
                Chaukhats Total Cost:
              </span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                ₹{chaukhatAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {chaukhatExtraLabel && chaukhatExtraRate > 0 && (
              <div className="summary-row">
                <span style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', fontWeight: 700 }}>
                  Chaukhats {chaukhatExtraLabel} (₹{chaukhatExtraRate}/ft):
                </span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  ₹{chaukhatExtraAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '0.25rem 0' }} />
          </>
        )}

        {railingsSubtotal > 0 && (
          <>
            <div className="summary-row">
              <span style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', fontWeight: 700 }}>Railings Length Total:</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>{railingsSubtotal.toFixed(2)} FT</span>
            </div>
            <div className="summary-row">
              <span style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', fontWeight: 700 }}>
                Railings Total Cost:
              </span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                ₹{railingsAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {railingsExtraLabel && railingsExtraRate > 0 && (
              <div className="summary-row">
                <span style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', fontWeight: 700 }}>
                  Railings {railingsExtraLabel} (₹{railingsExtraRate}/ft):
                </span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  ₹{railingsExtraAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '0.25rem 0' }} />
          </>
        )}

        {fixGolaSubtotal > 0 && (
          <>
            <div className="summary-row">
              <span style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', fontWeight: 700 }}>Fix Gola Length Total:</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>{fixGolaSubtotal.toFixed(2)} FT</span>
            </div>
            <div className="summary-row">
              <span style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', fontWeight: 700 }}>
                Fix Gola Total Cost:
              </span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                ₹{fixGolaAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {fixGolaExtraLabel && fixGolaExtraRate > 0 && (
              <div className="summary-row">
                <span style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', fontWeight: 700 }}>
                  Fix Gola {fixGolaExtraLabel} (₹{fixGolaExtraRate}/ft):
                </span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  ₹{fixGolaExtraAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '0.25rem 0' }} />
          </>
        )}

        {mouldingSubtotal > 0 && (
          <>
            <div className="summary-row">
              <span style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', fontWeight: 700 }}>Moulding Length Total:</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>{mouldingSubtotal.toFixed(2)} FT</span>
            </div>
            <div className="summary-row">
              <span style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', fontWeight: 700 }}>
                Moulding Total Cost:
              </span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                ₹{mouldingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {mouldingExtraLabel && mouldingExtraRate > 0 && (
              <div className="summary-row">
                <span style={{ color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontSize: '0.725rem', fontWeight: 700 }}>
                  Moulding {mouldingExtraLabel} (₹{mouldingExtraRate}/ft):
                </span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  ₹{mouldingExtraAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '0.25rem 0' }} />
          </>
        )}

        <div className="summary-row total" style={{ fontFamily: 'var(--font-body)' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>GRAND TOTAL:</span>
          <span style={{ color: 'var(--color-emerald)', fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 800 }}>
            ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {paymentStatus === 'paid' ? (
          <div className="summary-row" style={{ marginTop: '0.25rem' }}>
            <span style={{ fontSize: '0.725rem', fontWeight: 800, color: 'var(--color-emerald)', textTransform: 'uppercase' }}>PAYMENT STATUS:</span>
            <span style={{ color: 'var(--color-emerald)', fontWeight: 800, fontSize: '0.85rem' }}>PAID</span>
          </div>
        ) : (
          <>
            {advancePaid > 0 && (
              <div className="summary-row" style={{ marginTop: '0.25rem' }}>
                <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>TOTAL PAID:</span>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                  ₹{advancePaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="summary-row" style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 800, color: 'var(--color-text-primary)', textTransform: 'uppercase' }}>BALANCE DUE:</span>
              <span style={{ color: 'var(--color-accent-amber)', fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 800 }}>
                ₹{Math.max(0, totalAmount - advancePaid).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
