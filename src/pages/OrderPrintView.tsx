import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface Client {
  name: string;
  phone: string;
  address: string;
}

interface OrderItem {
  id: number;
  item_type: 'door_window' | 'chaukhat' | 'railing' | 'fix_gola' | 'moulding';
  label: string;
  height: number;
  width: number;
  quantity: number;
  rate: number;
  calculated_value: number;
}

interface Order {
  id: number;
  client_id: number;
  order_date: string;
  order_status: string;
  payment_status: string;
  advance_paid: number;
  notes: string;
  door_unit: 'inches' | 'feet';
  chaukhat_unit: 'inches' | 'feet';
  railing_unit: 'inches' | 'feet';
  fix_gola_unit: 'inches' | 'feet';
  moulding_unit: 'inches' | 'feet';
  wood_type: string;
  doors_subtotal: number;
  chaukhat_subtotal: number;
  railings_subtotal: number;
  fix_gola_subtotal: number;
  moulding_subtotal: number;
  doors_amount: number;
  chaukhat_amount: number;
  railings_amount: number;
  fix_gola_amount: number;
  moulding_amount: number;
  total_value: number;
  items: OrderItem[];
}

export function OrderPrintView() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!id) return;
      try {
        const orderId = parseInt(id, 10);

        // 1. Fetch order
        const orderData = await window.api.getOrder(orderId);
        if (orderData) {
          setOrder(orderData);
          
          // 2. Fetch client
          const clientData = await window.api.getClient(orderData.client_id);
          setClient(clientData);
        }
      } catch (err) {
        console.error('Failed to print order details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [id]);

  useEffect(() => {
    if (loading || !id) return;

    const orderId = parseInt(id, 10);
    if (Number.isFinite(orderId)) {
      window.api.notifyPrintReady(orderId).catch((err) => {
        console.error('Failed to notify print readiness:', err);
      });
    }
  }, [loading, id]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Preparing invoice print layout...</div>;
  }

  if (!order || !client) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>Error: Order details not found.</div>;
  }

  const doorItems = order.items.filter((i) => i.item_type === 'door_window');
  const chaukhatItems = order.items.filter((i) => i.item_type === 'chaukhat');
  const railingItems = order.items.filter((i) => i.item_type === 'railing');
  const fixGolaItems = order.items.filter((i) => i.item_type === 'fix_gola');
  const mouldingItems = order.items.filter((i) => i.item_type === 'moulding');

  return (
    <div className="print-invoice">
      {/* Shop Header */}
      <div className="print-header">
        <div className="print-shop-details">
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '1px', margin: 0 }}>ESTIMATE</h1>
        </div>
        <div className="print-invoice-meta">
          <p><strong>Sheet ID:</strong> <span className="print-number">#{order.id}</span></p>
          <p><strong>Date:</strong> <span className="print-number">{new Date(order.order_date).toLocaleDateString()}</span></p>
        </div>
      </div>

      {/* Customer Billing Info */}
      <div className="print-billing-grid">
        <div className="print-bill-to">
          <h3>Customer Details</h3>
          <p><strong>Name:</strong> {client.name}</p>
          {client.phone && <p><strong>Phone:</strong> <span className="print-number">{client.phone}</span></p>}
          {client.address && <p><strong>Address:</strong> {client.address}</p>}
        </div>
        <div className="print-order-details">
          <h3>Specification Info</h3>
          {order.wood_type && (
            <p><strong>Wood Type:</strong> <span className="print-number" style={{ textTransform: 'uppercase' }}>{order.wood_type}</span></p>
          )}
        </div>
      </div>

      {/* Doors Table */}
      {doorItems.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--color-print-border)', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>
            DOORS & WINDOWS MEASUREMENTS
          </h3>
          <table className="print-table" style={{ border: '1px solid var(--color-print-border)' }}>
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Description / Label</th>
                <th style={{ textAlign: 'center' }}>Height ({order.door_unit === 'inches' ? 'in' : 'ft'})</th>
                <th style={{ textAlign: 'center' }}>Width ({order.door_unit === 'inches' ? 'in' : 'ft'})</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Total Area (sqft)</th>
                <th style={{ textAlign: 'right' }}>Rate (₹ / sqft)</th>
                <th style={{ textAlign: 'right' }}>Total Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {doorItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.label}</td>
                  <td style={{ textAlign: 'center' }}>{item.height}</td>
                  <td style={{ textAlign: 'center' }}>{item.width}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{item.calculated_value.toFixed(2)} sqft</td>
                  <td style={{ textAlign: 'right' }}>₹{item.rate.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    ₹{(item.calculated_value * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Chaukhats Table */}
      {chaukhatItems.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--color-print-border)', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>
            CHAUKHATS (FRAMES) MEASUREMENTS
          </h3>
          <table className="print-table" style={{ border: '1px solid var(--color-print-border)' }}>
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Description / Label</th>
                <th style={{ textAlign: 'center' }}>Height ({order.chaukhat_unit === 'inches' ? 'in' : 'ft'})</th>
                <th style={{ textAlign: 'center' }}>Width ({order.chaukhat_unit === 'inches' ? 'in' : 'ft'})</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Running Length (ft)</th>
                <th style={{ textAlign: 'right' }}>Rate (₹ / ft)</th>
                <th style={{ textAlign: 'right' }}>Total Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {chaukhatItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.label}</td>
                  <td style={{ textAlign: 'center' }}>{item.height}</td>
                  <td style={{ textAlign: 'center' }}>{item.width}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{item.calculated_value.toFixed(2)} ft</td>
                  <td style={{ textAlign: 'right' }}>₹{item.rate.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    ₹{(item.calculated_value * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Railings Table */}
      {railingItems.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--color-print-border)', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>
            RAILINGS MEASUREMENTS
          </h3>
          <table className="print-table" style={{ border: '1px solid var(--color-print-border)' }}>
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Description / Label</th>
                <th style={{ textAlign: 'center' }}>Height ({order.railing_unit === 'inches' ? 'in' : 'ft'})</th>
                <th style={{ textAlign: 'center' }}>Width ({order.railing_unit === 'inches' ? 'in' : 'ft'})</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Running Length (ft)</th>
                <th style={{ textAlign: 'right' }}>Rate (₹ / ft)</th>
                <th style={{ textAlign: 'right' }}>Total Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {railingItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.label}</td>
                  <td style={{ textAlign: 'center' }}>{item.height}</td>
                  <td style={{ textAlign: 'center' }}>{item.width}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{item.calculated_value.toFixed(2)} ft</td>
                  <td style={{ textAlign: 'right' }}>₹{item.rate.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    ₹{(item.calculated_value * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Fix Gola Table */}
      {fixGolaItems.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--color-print-border)', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>
            FIX GOLA MEASUREMENTS
          </h3>
          <table className="print-table" style={{ border: '1px solid var(--color-print-border)' }}>
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Description / Label</th>
                <th style={{ textAlign: 'center' }}>Height ({order.fix_gola_unit === 'inches' ? 'in' : 'ft'})</th>
                <th style={{ textAlign: 'center' }}>Width ({order.fix_gola_unit === 'inches' ? 'in' : 'ft'})</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Running Length (ft)</th>
                <th style={{ textAlign: 'right' }}>Rate (₹ / ft)</th>
                <th style={{ textAlign: 'right' }}>Total Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {fixGolaItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.label}</td>
                  <td style={{ textAlign: 'center' }}>{item.height}</td>
                  <td style={{ textAlign: 'center' }}>{item.width}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{item.calculated_value.toFixed(2)} ft</td>
                  <td style={{ textAlign: 'right' }}>₹{item.rate.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    ₹{(item.calculated_value * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Moulding Table */}
      {mouldingItems.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--color-print-border)', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>
            MOULDING MEASUREMENTS
          </h3>
          <table className="print-table" style={{ border: '1px solid var(--color-print-border)' }}>
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Description / Label</th>
                <th style={{ textAlign: 'center' }}>Height ({order.moulding_unit === 'inches' ? 'in' : 'ft'})</th>
                <th style={{ textAlign: 'center' }}>Width ({order.moulding_unit === 'inches' ? 'in' : 'ft'})</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Running Length (ft)</th>
                <th style={{ textAlign: 'right' }}>Rate (₹ / ft)</th>
                <th style={{ textAlign: 'right' }}>Total Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {mouldingItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.label}</td>
                  <td style={{ textAlign: 'center' }}>{item.height}</td>
                  <td style={{ textAlign: 'center' }}>{item.width}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right' }}>{item.calculated_value.toFixed(2)} ft</td>
                  <td style={{ textAlign: 'right' }}>₹{item.rate.toFixed(2)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    ₹{(item.calculated_value * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Calculations & Totals Summary */}
      <div className="print-summary-box">
        {doorItems.length > 0 && order.doors_amount > 0 && (
          <>
            <div className="print-summary-row">
              <span>Doors Area Subtotal:</span>
              <span>{order.doors_subtotal.toFixed(2)} sqft</span>
            </div>
            <div className="print-summary-row">
              <span><strong>Doors Total Cost:</strong></span>
              <span><strong>₹{order.doors_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            </div>
            <div style={{ width: '320px', height: '1px', backgroundColor: 'var(--color-print-border)', margin: '0.4rem 0' }} />
          </>
        )}

        {chaukhatItems.length > 0 && order.chaukhat_amount > 0 && (
          <>
            <div className="print-summary-row">
              <span>Chaukhats Length Subtotal:</span>
              <span>{order.chaukhat_subtotal.toFixed(2)} ft</span>
            </div>
            <div className="print-summary-row">
              <span><strong>Chaukhats Total Cost:</strong></span>
              <span><strong>₹{order.chaukhat_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            </div>
            <div style={{ width: '320px', height: '1px', backgroundColor: 'var(--color-print-border)', margin: '0.4rem 0' }} />
          </>
        )}

        {railingItems.length > 0 && order.railings_amount > 0 && (
          <>
            <div className="print-summary-row">
              <span>Railings Length Subtotal:</span>
              <span>{order.railings_subtotal.toFixed(2)} ft</span>
            </div>
            <div className="print-summary-row">
              <span><strong>Railings Total Cost:</strong></span>
              <span><strong>₹{order.railings_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            </div>
            <div style={{ width: '320px', height: '1px', backgroundColor: 'var(--color-print-border)', margin: '0.4rem 0' }} />
          </>
        )}

        {fixGolaItems.length > 0 && order.fix_gola_amount > 0 && (
          <>
            <div className="print-summary-row">
              <span>Fix Gola Length Subtotal:</span>
              <span>{order.fix_gola_subtotal.toFixed(2)} ft</span>
            </div>
            <div className="print-summary-row">
              <span><strong>Fix Gola Total Cost:</strong></span>
              <span><strong>₹{order.fix_gola_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            </div>
            <div style={{ width: '320px', height: '1px', backgroundColor: 'var(--color-print-border)', margin: '0.4rem 0' }} />
          </>
        )}

        {mouldingItems.length > 0 && order.moulding_amount > 0 && (
          <>
            <div className="print-summary-row">
              <span>Moulding Length Subtotal:</span>
              <span>{order.moulding_subtotal.toFixed(2)} ft</span>
            </div>
            <div className="print-summary-row">
              <span><strong>Moulding Total Cost:</strong></span>
              <span><strong>₹{order.moulding_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
            </div>
            <div style={{ width: '320px', height: '1px', backgroundColor: 'var(--color-print-border)', margin: '0.4rem 0' }} />
          </>
        )}

        <div className="print-summary-row grand-total">
          <span>GRAND TOTAL:</span>
          <span>₹{order.total_value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <div style={{ width: '320px', height: '1px', backgroundColor: 'var(--color-print-text)', margin: '0.4rem 0' }} />

        {order.payment_status === 'paid' ? (
          <div className="print-summary-row" style={{ color: '#10b981', fontWeight: 800, fontSize: '0.9rem' }}>
            <span>PAYMENT STATUS:</span>
            <span>PAID</span>
          </div>
        ) : (
          <>
            {order.advance_paid > 0 && (
              <div className="print-summary-row" style={{ fontWeight: 600 }}>
                <span>Advance Paid:</span>
                <span>₹{order.advance_paid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="print-summary-row" style={{ color: '#b45309', fontWeight: 800, fontSize: '0.9rem', borderTop: '1px dashed var(--color-print-border)', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
              <span>BALANCE DUE:</span>
              <span>₹{Math.max(0, order.total_value - order.advance_paid).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </>
        )}
      </div>

      {/* Notes Block */}
      {order.notes && (
        <div className="print-notes">
          <h4>Order Specifications / Notes</h4>
          <p>{order.notes}</p>
        </div>
      )}
    </div>
  );
}
