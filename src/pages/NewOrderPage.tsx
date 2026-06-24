import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { DoorItemRow } from '../components/DoorItemRow.tsx';
import { ChaukhatItemRow } from '../components/ChaukhatItemRow.tsx';
import { OrderSummary } from '../components/OrderSummary.tsx';
import { calculateDoorItemValue, calculateChaukhatItemValue } from '../lib/calculations.ts';

interface Client {
  id: number;
  name: string;
  phone: string;
}

interface ItemState {
  tempId: string;
  item_type: 'door_window' | 'chaukhat';
  label: string;
  height: number | '';
  width: number | '';
  quantity: number;
}

export function NewOrderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [doorUnit, setDoorUnit] = useState<'inches' | 'feet'>('inches');
  const [chaukhatUnit, setChaukhatUnit] = useState<'inches' | 'feet'>('inches');
  const [items, setItems] = useState<ItemState[]>([]);
  const [doorRate, setDoorRate] = useState<number | ''>('');
  const [chaukhatRate, setChaukhatRate] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTempIds, setSelectedTempIds] = useState<string[]>([]);

  useEffect(() => {
    const initPage = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const clientId = parseInt(id, 10);
        const clientData = await window.api.getClient(clientId);
        if (!clientData) {
          navigate('/');
          return;
        }
        setClient(clientData);

        // Fetch settings for defaults
        const settings = await window.api.getAllSettings();
        if (settings) {
          const defUnit = (settings.default_unit as 'inches' | 'feet') || 'inches';
          setDoorUnit(defUnit);
          setChaukhatUnit(defUnit);
          setDoorRate(settings.default_door_rate ? parseFloat(settings.default_door_rate) || 0 : 0);
          setChaukhatRate(settings.default_chaukhat_rate ? parseFloat(settings.default_chaukhat_rate) || 0 : 0);
        }
      } catch (err) {
        console.error('Failed to initialize new order page:', err);
      } finally {
        setLoading(false);
      }
    };

    initPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Keyboard listeners for New Order page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Esc: Back to client page
      if (e.key === 'Escape') {
        e.preventDefault();
        if (client) {
          navigate(`/client/${client.id}`);
        }
      }

      // 2. Ctrl+S: Save Order
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const mockEvent = { preventDefault: () => {} } as React.FormEvent;
        handleSaveOrder(mockEvent);
      }

      // 3. Alt+D: Add Door Row
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        addDoorRow();
      }

      // 4. Alt+C: Add Chaukhat Row
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        addChaukhatRow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, items, doorRate, chaukhatRate, notes, doorUnit, chaukhatUnit, navigate]);

  const addDoorRow = () => {
    setItems((prev) => [
      ...prev,
      {
        tempId: Math.random().toString(),
        item_type: 'door_window',
        label: '',
        height: '',
        width: '',
        quantity: 1
      }
    ]);
  };

  const addChaukhatRow = () => {
    setItems((prev) => [
      ...prev,
      {
        tempId: Math.random().toString(),
        item_type: 'chaukhat',
        label: '',
        height: '',
        width: '',
        quantity: 1
      }
    ]);
  };

  const handleUpdateItem = useCallback((tempId: string | number, fields: Partial<ItemState>) => {
    setItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, ...fields } : item))
    );
  }, []);

  const handleDeleteItem = useCallback((tempId: string | number) => {
    setItems((prev) => prev.filter((item) => item.tempId !== tempId));
    setSelectedTempIds((prev) => prev.filter((id) => id !== tempId));
  }, []);

  const handleSelectRow = useCallback((tempId: string | number, checked: boolean) => {
    const idStr = String(tempId);
    setSelectedTempIds((prev) => {
      if (checked) {
        return prev.includes(idStr) ? prev : [...prev, idStr];
      } else {
        return prev.filter((id) => id !== idStr);
      }
    });
  }, []);

  const handleDeleteSelected = (type: 'door_window' | 'chaukhat') => {
    const idsToDelete = selectedTempIds.filter(tempId => 
      items.some(i => i.tempId === tempId && i.item_type === type)
    );
    if (idsToDelete.length === 0) return;
    
    const confirmDelete = window.confirm(`Remove the ${idsToDelete.length} selected items?`);
    if (confirmDelete) {
      setItems((prev) => prev.filter((item) => !idsToDelete.includes(item.tempId)));
      setSelectedTempIds((prev) => prev.filter((tempId) => !idsToDelete.includes(tempId)));
    }
  };

  // Calculations for live previews
  const doorItems = items.filter((i) => i.item_type === 'door_window');
  const chaukhatItems = items.filter((i) => i.item_type === 'chaukhat');

  const doorsSubtotal = useMemo(() => {
    return items
      .filter((i) => i.item_type === 'door_window')
      .reduce((sum, item) => {
        const h = typeof item.height === 'number' ? item.height : 0;
        const w = typeof item.width === 'number' ? item.width : 0;
        return sum + calculateDoorItemValue({ height: h, width: w, quantity: item.quantity, unit: doorUnit });
      }, 0);
  }, [items, doorUnit]);

  const chaukhatSubtotal = useMemo(() => {
    return items
      .filter((i) => i.item_type === 'chaukhat')
      .reduce((sum, item) => {
        const h = typeof item.height === 'number' ? item.height : 0;
        const w = typeof item.width === 'number' ? item.width : 0;
        return sum + calculateChaukhatItemValue({ height: h, width: w, quantity: item.quantity, unit: chaukhatUnit });
      }, 0);
  }, [items, chaukhatUnit]);

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    // Validate that there is at least one item and height/width are filled
    if (items.length === 0) {
      alert('Please add at least one door/window or chaukhat item to the order.');
      return;
    }

    for (const item of items) {
      if (item.height === '' || item.width === '' || item.height <= 0 || item.width <= 0) {
        alert('Please fill out positive height and width for all items.');
        return;
      }
    }

    setSubmitting(true);

    try {
      // 1. Create order
      const orderResult = await window.api.createOrder({
        clientId: client.id,
        notes: notes,
        doorUnit,
        chaukhatUnit
      });
      const orderId = orderResult.id;

      // 2. Add order items
      for (const item of items) {
        await window.api.addOrderItem(orderId, {
          item_type: item.item_type,
          label: item.label,
          height: item.height as number,
          width: item.width as number,
          quantity: item.quantity
        });
      }

      // 3. Update rates (which forces subtotal and total recalculations)
      await window.api.updateOrderRates(orderId, {
        doorRate: typeof doorRate === 'number' ? doorRate : 0,
        chaukhatRate: typeof chaukhatRate === 'number' ? chaukhatRate : 0
      });

      // 4. Redirect to order details
      navigate(`/order/${orderId}`);
    } catch (err) {
      console.error('Failed to save order:', err);
      alert('An error occurred while saving the order.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>
        Initializing order form...
      </div>
    );
  }

  if (!client) return null;

  return (
    <form className="page-container animate-fade-in" onSubmit={handleSaveOrder}>
      <div>
        <Link to={`/client/${client.id}`} style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-text-secondary)', textDecoration: 'none', fontWeight: 700, fontSize: '0.825rem', marginBottom: '1rem', fontFamily: 'var(--font-body)', gap: '0.375rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Customer Ledger</span>
          <kbd style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-app)', color: 'var(--color-text-secondary)', fontSize: '0.65rem', padding: '0.05rem 0.25rem', marginLeft: '0.25rem' }}>Esc</kbd>
        </Link>
        <div className="page-header">
          <div className="page-title-group">
            <h1 className="page-title" style={{ fontFamily: 'var(--font-body)' }}>Create Order Sheet</h1>
            <p className="page-subtitle">Measurement log for {client.name.toUpperCase()}</p>
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            <Save size={16} />
            <span>{submitting ? 'Saving Order Sheet...' : 'Save Order Sheet'}</span>
            <kbd style={{ marginLeft: '0.375rem', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '0.65rem', padding: '0.05rem 0.25rem' }}>Ctrl+S</kbd>
          </button>
        </div>
      </div>

      <div className="card-el" style={{ gap: '1.25rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', textTransform: 'uppercase' }}>Order Settings</h3>
        <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
            <span className="form-label" style={{ padding: 0, fontWeight: 700, fontFamily: 'var(--font-body)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Doors & Windows Unit:</span>
            <div className="segmented-control">
              <button
                type="button"
                className={`segment-btn ${doorUnit === 'inches' ? 'active' : ''}`}
                onClick={() => setDoorUnit('inches')}
              >
                Inches
              </button>
              <button
                type="button"
                className={`segment-btn ${doorUnit === 'feet' ? 'active' : ''}`}
                onClick={() => setDoorUnit('feet')}
              >
                Feet
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0, flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
            <span className="form-label" style={{ padding: 0, fontWeight: 700, fontFamily: 'var(--font-body)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Chaukhats Unit:</span>
            <div className="segmented-control">
              <button
                type="button"
                className={`segment-btn ${chaukhatUnit === 'inches' ? 'active' : ''}`}
                onClick={() => setChaukhatUnit('inches')}
              >
                Inches
              </button>
              <button
                type="button"
                className={`segment-btn ${chaukhatUnit === 'feet' ? 'active' : ''}`}
                onClick={() => setChaukhatUnit('feet')}
              >
                Feet
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        {/* Left column: Line Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          
          {/* Doors & Windows Section */}
          <div className="order-items-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', textTransform: 'uppercase' }}>
                Doors & Windows
              </h3>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {selectedTempIds.filter(id => doorItems.some(i => i.tempId === id)).length > 0 && (
                  <button type="button" className="btn btn-danger" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', marginRight: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => handleDeleteSelected('door_window')}>
                    <Trash2 size={14} />
                    <span>Delete Selected ({selectedTempIds.filter(id => doorItems.some(i => i.tempId === id)).length})</span>
                  </button>
                )}
                <button type="button" className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} onClick={addDoorRow}>
                  <Plus size={14} />
                  <span>Add Door/Window</span>
                  <kbd style={{ marginLeft: '0.375rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-app)', color: 'var(--color-text-secondary)', fontSize: '0.65rem', padding: '0.05rem 0.25rem' }}>Alt+D</kbd>
                </button>
              </div>
            </div>

            {doorItems.length === 0 ? (
              <div style={{ padding: '2.5rem 2rem', textAlign: 'center', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontSize: '0.8rem', fontFamily: 'var(--font-body)', borderRadius: 'var(--border-radius)' }}>
                No door or window measurements added yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '38px 2.2fr 1fr 1fr 1fr 1.3fr auto', gap: '1rem', padding: '0 1rem', fontSize: '0.725rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-body)', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input
                      type="checkbox"
                      checked={doorItems.length > 0 && doorItems.every(i => selectedTempIds.includes(i.tempId))}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const doorIds = doorItems.map(i => i.tempId);
                        if (checked) {
                          setSelectedTempIds(prev => Array.from(new Set([...prev, ...doorIds])));
                        } else {
                          setSelectedTempIds(prev => prev.filter(id => !doorIds.includes(id)));
                        }
                      }}
                      style={{ cursor: 'pointer', accentColor: 'var(--color-accent-amber)' }}
                      aria-label="Select all doors"
                    />
                  </div>
                  <span>Item Label</span>
                  <span>Height ({doorUnit === 'inches' ? 'in' : 'ft'})</span>
                  <span>Width ({doorUnit === 'inches' ? 'in' : 'ft'})</span>
                  <span>Quantity</span>
                  <span style={{ textAlign: 'right' }}>Calculated Area</span>
                  <span></span>
                </div>
                {doorItems.map((item) => (
                  <DoorItemRow
                    key={item.tempId}
                    item={item}
                    unit={doorUnit}
                    onChange={handleUpdateItem}
                    onDelete={handleDeleteItem}
                    selected={selectedTempIds.includes(item.tempId)}
                    onSelect={handleSelectRow}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Chaukhats Section */}
          <div className="order-items-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', textTransform: 'uppercase' }}>
                Chaukhats (Frames)
              </h3>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {selectedTempIds.filter(id => chaukhatItems.some(i => i.tempId === id)).length > 0 && (
                  <button type="button" className="btn btn-danger" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', marginRight: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => handleDeleteSelected('chaukhat')}>
                    <Trash2 size={14} />
                    <span>Delete Selected ({selectedTempIds.filter(id => chaukhatItems.some(i => i.tempId === id)).length})</span>
                  </button>
                )}
                <button type="button" className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} onClick={addChaukhatRow}>
                  <Plus size={14} />
                  <span>Add Chaukhat</span>
                  <kbd style={{ marginLeft: '0.375rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-app)', color: 'var(--color-text-secondary)', fontSize: '0.65rem', padding: '0.05rem 0.25rem' }}>Alt+C</kbd>
                </button>
              </div>
            </div>

            {chaukhatItems.length === 0 ? (
              <div style={{ padding: '2.5rem 2rem', textAlign: 'center', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontSize: '0.8rem', fontFamily: 'var(--font-body)', borderRadius: 'var(--border-radius)' }}>
                No chaukhat frame measurements added yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '38px 2.2fr 1fr 1fr 1fr 1.3fr auto', gap: '1rem', padding: '0 1rem', fontSize: '0.725rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-body)', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input
                      type="checkbox"
                      checked={chaukhatItems.length > 0 && chaukhatItems.every(i => selectedTempIds.includes(i.tempId))}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const chaukhatIds = chaukhatItems.map(i => i.tempId);
                        if (checked) {
                          setSelectedTempIds(prev => Array.from(new Set([...prev, ...chaukhatIds])));
                        } else {
                          setSelectedTempIds(prev => prev.filter(id => !chaukhatIds.includes(id)));
                        }
                      }}
                      style={{ cursor: 'pointer', accentColor: 'var(--color-accent-amber)' }}
                      aria-label="Select all chaukhats"
                    />
                  </div>
                  <span>Item Label</span>
                  <span>Height ({chaukhatUnit === 'inches' ? 'in' : 'ft'})</span>
                  <span>Width ({chaukhatUnit === 'inches' ? 'in' : 'ft'})</span>
                  <span>Quantity</span>
                  <span style={{ textAlign: 'right' }}>Running Length</span>
                  <span></span>
                </div>
                {chaukhatItems.map((item) => (
                  <ChaukhatItemRow
                    key={item.tempId}
                    item={item}
                    unit={chaukhatUnit}
                    onChange={handleUpdateItem}
                    onDelete={handleDeleteItem}
                    selected={selectedTempIds.includes(item.tempId)}
                    onSelect={handleSelectRow}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div className="form-group">
            <label htmlFor="order-notes" className="form-label" style={{ fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', fontSize: '0.8rem', textTransform: 'uppercase' }}>Order Notes (e.g. wood quality, specifications)</label>
            <textarea
              id="order-notes"
              className="form-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide any additional specifications for this order sheet..."
              maxLength={1000}
            />
          </div>

        </div>

        {/* Right column: Totals Summary */}
        <div>
          <div style={{ position: 'sticky', top: '2rem' }}>
            <OrderSummary
              doorsSubtotal={doorsSubtotal}
              chaukhatSubtotal={chaukhatSubtotal}
              doorRate={doorRate}
              chaukhatRate={chaukhatRate}
              onDoorRateChange={setDoorRate}
              onChaukhatRateChange={setChaukhatRate}
            />
          </div>
        </div>
      </div>
    </form>
  );
}
