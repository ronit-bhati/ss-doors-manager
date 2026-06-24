import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface Client {
  name: string;
  phone: string;
  address: string;
}

interface OrderItem {
  id: number;
  item_type: 'door_window' | 'chaukhat';
  label: string;
  height: number;
  width: number;
  quantity: number;
  calculated_value: number;
}

interface Order {
  id: number;
  client_id: number;
  order_date: string;
  status: string;
  notes: string;
  door_unit: 'inches' | 'feet';
  chaukhat_unit: 'inches' | 'feet';
  door_rate: number;
  chaukhat_rate: number;
  doors_subtotal: number;
  chaukhat_subtotal: number;
  total_value: number;
  items: OrderItem[];
}

export function OrderPrintView() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!id) return;
      try {
        const orderId = parseInt(id, 10);
        
        // 1. Fetch settings
        const settingsData = await window.api.getAllSettings();
        setSettings(settingsData);

        // 2. Fetch order
        const orderData = await window.api.getOrder(orderId);
        if (orderData) {
          setOrder(orderData);
          
          // 3. Fetch client
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

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Preparing invoice print layout...</div>;
  }

  if (!order || !client) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>Error: Order details not found.</div>;
  }

  const doorItems = order.items.filter((i) => i.item_type === 'door_window');
  const chaukhatItems = order.items.filter((i) => i.item_type === 'chaukhat');

  const doorsCost = order.doors_subtotal * order.door_rate;
  const chaukhatsCost = order.chaukhat_subtotal * order.chaukhat_rate;

  return (
    <div className="print-invoice">
      {/* Shop Header */}
      <div className="print-header">
        <div className="print-shop-details">
          <h1>{settings.shop_name || 'SS Doors'}</h1>
          {settings.shop_address && <p>{settings.shop_address}</p>}
          {settings.shop_phone && <p>Phone: {settings.shop_phone}</p>}
        </div>
        <div className="print-invoice-meta">
          <h2>MEASUREMENT SHEET</h2>
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
          <p><strong>Doors Unit:</strong> <span className="print-number">{order.door_unit.toUpperCase()}</span></p>
          <p><strong>Chaukhats Unit:</strong> <span className="print-number">{order.chaukhat_unit.toUpperCase()}</span></p>
          <p><strong>Door Rate:</strong> <span className="print-number">₹{order.door_rate.toFixed(2)}</span> / sqft</p>
          <p><strong>Chaukhat Rate:</strong> <span className="print-number">₹{order.chaukhat_rate.toFixed(2)}</span> / running foot</p>
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
                  <th style={{ width: '40%' }}>Description / Label</th>
                  <th style={{ textAlign: 'center' }}>Height ({order.door_unit === 'inches' ? 'in' : 'ft'})</th>
                  <th style={{ textAlign: 'center' }}>Width ({order.door_unit === 'inches' ? 'in' : 'ft'})</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Total Area (sqft)</th>
                </tr>
              </thead>
              <tbody>
                {doorItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.label || 'Door / Window'}</td>
                    <td style={{ textAlign: 'center' }}>{item.height}</td>
                    <td style={{ textAlign: 'center' }}>{item.width}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.calculated_value.toFixed(2)} sqft</td>
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
                  <th style={{ width: '40%' }}>Description / Label</th>
                  <th style={{ textAlign: 'center' }}>Height ({order.chaukhat_unit === 'inches' ? 'in' : 'ft'})</th>
                  <th style={{ textAlign: 'center' }}>Width ({order.chaukhat_unit === 'inches' ? 'in' : 'ft'})</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Running Length (ft)</th>
                </tr>
              </thead>
              <tbody>
                {chaukhatItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.label || 'Chaukhat / Frame'}</td>
                    <td style={{ textAlign: 'center' }}>{item.height}</td>
                    <td style={{ textAlign: 'center' }}>{item.width}</td>
                    <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {item.calculated_value.toFixed(2)} ft
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Calculations & Totals Summary */}
        <div className="print-summary-box">
          <div className="print-summary-row">
            <span>Doors Area Subtotal:</span>
            <span>{order.doors_subtotal.toFixed(2)} sqft</span>
          </div>
          <div className="print-summary-row">
            <span>Doors Rate Multiplier:</span>
            <span>₹{order.door_rate.toFixed(2)} / sqft</span>
          </div>
          <div className="print-summary-row">
            <span><strong>Doors Total Cost:</strong></span>
            <span><strong>₹{doorsCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
          </div>

          <div style={{ width: '320px', height: '1px', backgroundColor: 'var(--color-print-border)', margin: '0.5rem 0' }} />

        <div className="print-summary-row">
          <span>Chaukhats Length Subtotal:</span>
          <span>{order.chaukhat_subtotal.toFixed(2)} ft</span>
        </div>
        <div className="print-summary-row">
          <span>Chaukhats Rate Multiplier:</span>
          <span>₹{order.chaukhat_rate.toFixed(2)} / running ft</span>
        </div>
        <div className="print-summary-row">
          <span><strong>Chaukhats Total Cost:</strong></span>
          <span><strong>₹{chaukhatsCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
        </div>

        <div className="print-summary-row grand-total">
          <span>GRAND TOTAL:</span>
          <span>₹{order.total_value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
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
