import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { formatDate } from '../lib/calculations.ts';

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
  doors_extra_label: string;
  doors_extra_rate: number;
  chaukhat_extra_label: string;
  chaukhat_extra_rate: number;
  railings_extra_label: string;
  railings_extra_rate: number;
  fix_gola_extra_label: string;
  fix_gola_extra_rate: number;
  moulding_extra_label: string;
  moulding_extra_rate: number;
  total_value: number;
  items: OrderItem[];
  payments?: any[];
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
      <div className="print-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderBottom: '2px solid var(--color-print-border)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '1px', margin: 0, textAlign: 'center' }}>ESTIMATE</h1>
        <div className="print-invoice-meta" style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginTop: '0.25rem', fontSize: '0.85rem' }}>
          <p style={{ margin: 0 }}><strong>Sheet ID:</strong> <span className="print-number">#{order.id}</span></p>
          <p style={{ margin: 0 }}><strong>Date:</strong> <span className="print-number">{formatDate(order.order_date)}</span></p>
        </div>
      </div>

      {/* Customer Billing Info */}
      <div className="print-billing-grid" style={{ marginBottom: '0.75rem', gap: '1.5rem' }}>
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
          {order.notes && (
            <div style={{ marginTop: '0.5rem' }}>
              <p style={{ margin: 0 }}><strong>Order Notes:</strong></p>
              <p style={{ margin: '0.15rem 0 0 0', whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: '#4b5563', lineHeight: 1.3 }}>{order.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Doors Table */}
      {doorItems.length > 0 && (
        <div style={{ marginBottom: '0.85rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--color-print-border)', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>
            DOORS & WINDOWS MEASUREMENTS
          </h3>
          <table className="print-table" style={{ border: '1px solid var(--color-print-border)' }}>
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Description / Label</th>
                <th style={{ textAlign: 'center' }}>Height ({order.door_unit === 'inches' ? 'in' : 'ft'})</th>
                <th style={{ textAlign: 'center' }}>Width ({order.door_unit === 'inches' ? 'in' : 'ft'})</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Total Area (sqft)</th>
                <th style={{ textAlign: 'right' }}>Rate (₹ / sqft)</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Chaukhats Table */}
      {chaukhatItems.length > 0 && (
        <div style={{ marginBottom: '0.85rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--color-print-border)', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>
            CHAUKHATS (FRAMES) MEASUREMENTS
          </h3>
          <table className="print-table" style={{ border: '1px solid var(--color-print-border)' }}>
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Description / Label</th>
                <th style={{ textAlign: 'center' }}>Height ({order.chaukhat_unit === 'inches' ? 'in' : 'ft'})</th>
                <th style={{ textAlign: 'center' }}>Width ({order.chaukhat_unit === 'inches' ? 'in' : 'ft'})</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Running Length (ft)</th>
                <th style={{ textAlign: 'right' }}>Rate (₹ / ft)</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Railings Table */}
      {railingItems.length > 0 && (
        <div style={{ marginBottom: '0.85rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--color-print-border)', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>
            RAILINGS MEASUREMENTS
          </h3>
          <table className="print-table" style={{ border: '1px solid var(--color-print-border)' }}>
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Description / Label</th>
                <th style={{ textAlign: 'center' }}>Height ({order.railing_unit === 'inches' ? 'in' : 'ft'})</th>
                <th style={{ textAlign: 'center' }}>Width ({order.railing_unit === 'inches' ? 'in' : 'ft'})</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Running Length (ft)</th>
                <th style={{ textAlign: 'right' }}>Rate (₹ / ft)</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Fix Gola Table */}
      {fixGolaItems.length > 0 && (
        <div style={{ marginBottom: '0.85rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--color-print-border)', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>
            FIX GOLA MEASUREMENTS
          </h3>
          <table className="print-table" style={{ border: '1px solid var(--color-print-border)' }}>
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Description / Label</th>
                <th style={{ textAlign: 'center' }}>Height ({order.fix_gola_unit === 'inches' ? 'in' : 'ft'})</th>
                <th style={{ textAlign: 'center' }}>Width ({order.fix_gola_unit === 'inches' ? 'in' : 'ft'})</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Running Length (ft)</th>
                <th style={{ textAlign: 'right' }}>Rate (₹ / ft)</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Moulding Table */}
      {mouldingItems.length > 0 && (
        <div style={{ marginBottom: '0.85rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--color-print-border)', paddingBottom: '0.25rem', marginBottom: '0.75rem' }}>
            MOULDING MEASUREMENTS
          </h3>
          <table className="print-table" style={{ border: '1px solid var(--color-print-border)' }}>
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Description / Label</th>
                <th style={{ textAlign: 'center' }}>Height ({order.moulding_unit === 'inches' ? 'in' : 'ft'})</th>
                <th style={{ textAlign: 'center' }}>Width ({order.moulding_unit === 'inches' ? 'in' : 'ft'})</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Running Length (ft)</th>
                <th style={{ textAlign: 'right' }}>Rate (₹ / ft)</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Calculations & Totals Summary */}
      <div className="print-summary-box" style={{ gap: '0.25rem' }}>
        {doorItems.length > 0 && order.doors_amount > 0 && (
          <>
            <div className="print-summary-row">
              <span>Doors Area Subtotal:</span>
              <span>{order.doors_subtotal.toFixed(2)} sqft</span>
            </div>
            <div className="print-summary-row">
              <span>Doors Total Cost:</span>
              <span>₹{order.doors_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {order.doors_extra_label && order.doors_extra_rate > 0 && (
              <div className="print-summary-row">
                <span>Doors {order.doors_extra_label} (₹{order.doors_extra_rate}/sqft):</span>
                <span>₹{(order.doors_subtotal * order.doors_extra_rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div style={{ height: '4px' }} />
          </>
        )}

        {chaukhatItems.length > 0 && order.chaukhat_amount > 0 && (
          <>
            <div className="print-summary-row">
              <span>Chaukhats Length Subtotal:</span>
              <span>{order.chaukhat_subtotal.toFixed(2)} ft</span>
            </div>
            <div className="print-summary-row">
              <span>Chaukhats Total Cost:</span>
              <span>₹{order.chaukhat_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {order.chaukhat_extra_label && order.chaukhat_extra_rate > 0 && (
              <div className="print-summary-row">
                <span>Chaukhats {order.chaukhat_extra_label} (₹{order.chaukhat_extra_rate}/ft):</span>
                <span>₹{(order.chaukhat_subtotal * order.chaukhat_extra_rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div style={{ height: '4px' }} />
          </>
        )}

        {railingItems.length > 0 && order.railings_amount > 0 && (
          <>
            <div className="print-summary-row">
              <span>Railings Length Subtotal:</span>
              <span>{order.railings_subtotal.toFixed(2)} ft</span>
            </div>
            <div className="print-summary-row">
              <span>Railings Total Cost:</span>
              <span>₹{order.railings_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {order.railings_extra_label && order.railings_extra_rate > 0 && (
              <div className="print-summary-row">
                <span>Railings {order.railings_extra_label} (₹{order.railings_extra_rate}/ft):</span>
                <span>₹{(order.railings_subtotal * order.railings_extra_rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div style={{ height: '4px' }} />
          </>
        )}

        {fixGolaItems.length > 0 && order.fix_gola_amount > 0 && (
          <>
            <div className="print-summary-row">
              <span>Fix Gola Length Subtotal:</span>
              <span>{order.fix_gola_subtotal.toFixed(2)} ft</span>
            </div>
            <div className="print-summary-row">
              <span>Fix Gola Total Cost:</span>
              <span>₹{order.fix_gola_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {order.fix_gola_extra_label && order.fix_gola_extra_rate > 0 && (
              <div className="print-summary-row">
                <span>Fix Gola {order.fix_gola_extra_label} (₹{order.fix_gola_extra_rate}/ft):</span>
                <span>₹{(order.fix_gola_subtotal * order.fix_gola_extra_rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div style={{ height: '4px' }} />
          </>
        )}

        {mouldingItems.length > 0 && order.moulding_amount > 0 && (
          <>
            <div className="print-summary-row">
              <span>Moulding Length Subtotal:</span>
              <span>{order.moulding_subtotal.toFixed(2)} ft</span>
            </div>
            <div className="print-summary-row">
              <span>Moulding Total Cost:</span>
              <span>₹{order.moulding_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {order.moulding_extra_label && order.moulding_extra_rate > 0 && (
              <div className="print-summary-row">
                <span>Moulding {order.moulding_extra_label} (₹{order.moulding_extra_rate}/ft):</span>
                <span>₹{(order.moulding_subtotal * order.moulding_extra_rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <div style={{ height: '4px' }} />
          </>
        )}

        <div className="print-summary-row grand-total">
          <span>GRAND TOTAL:</span>
          <span>₹{order.total_value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        {order.payments && order.payments.length > 0 ? (
          order.payments.map((p: any) => (
            <div key={p.id} className="print-summary-row" style={{ fontSize: '0.8rem', color: '#4b5563' }}>
              <span>Payment ({formatDate(p.payment_date)}):</span>
              <span>₹{p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ))
        ) : null}

        <div className="print-summary-row" style={{ color: order.payment_status === 'paid' ? '#10b981' : '#b45309', fontWeight: 800, fontSize: '0.9rem', borderTop: '1px dashed var(--color-print-border)', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
          <span>BALANCE DUE:</span>
          <span>
            {order.payment_status === 'paid' 
              ? '₹0.00 (PAID)' 
              : `₹${Math.max(0, order.total_value - order.advance_paid).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            }
          </span>
        </div>
      </div>
    </div>
  );
}
