import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { DoorItemRow } from '../components/DoorItemRow.tsx';
import { ChaukhatItemRow } from '../components/ChaukhatItemRow.tsx';
import { OrderSummary } from '../components/OrderSummary.tsx';
import { calculateDoorItemValue, calculateChaukhatItemValue, calculateItemValue } from '../lib/calculations.ts';

interface Client {
  id: number;
  name: string;
  phone: string;
}

interface ItemState {
  tempId: string;
  item_type: 'door_window' | 'chaukhat' | 'railing' | 'fix_gola' | 'moulding';
  label: string;
  height: number | '';
  width: number | '';
  quantity: number;
  rate: number | '';
}

export function NewOrderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [client, setClient] = useState<Client | null>(null);
  const [doorUnit, setDoorUnit] = useState<'inches' | 'feet'>('inches');
  const [chaukhatUnit, setChaukhatUnit] = useState<'inches' | 'feet'>('inches');
  const [railingUnit, setRailingUnit] = useState<'inches' | 'feet'>('inches');
  const [fixGolaUnit, setFixGolaUnit] = useState<'inches' | 'feet'>('inches');
  const [mouldingUnit, setMouldingUnit] = useState<'inches' | 'feet'>('inches');
  const [items, setItems] = useState<ItemState[]>([]);
  const [doorRate, setDoorRate] = useState<number | ''>('');
  const [chaukhatRate, setChaukhatRate] = useState<number | ''>('');
  const [railingRate, setRailingRate] = useState<number | ''>('');
  const [fixGolaRate, setFixGolaRate] = useState<number | ''>('');
  const [mouldingRate, setMouldingRate] = useState<number | ''>('');
  const [woodType, setWoodType] = useState('');
  const [notes, setNotes] = useState('');
  const [doorsExtraLabel, setDoorsExtraLabel] = useState('');
  const [doorsExtraRate, setDoorsExtraRate] = useState<number | ''>('');
  const [chaukhatExtraLabel, setChaukhatExtraLabel] = useState('');
  const [chaukhatExtraRate, setChaukhatExtraRate] = useState<number | ''>('');
  const [railingsExtraLabel, setRailingsExtraLabel] = useState('');
  const [railingsExtraRate, setRailingsExtraRate] = useState<number | ''>('');
  const [fixGolaExtraLabel, setFixGolaExtraLabel] = useState('');
  const [fixGolaExtraRate, setFixGolaExtraRate] = useState<number | ''>('');
  const [mouldingExtraLabel, setMouldingExtraLabel] = useState('');
  const [mouldingExtraRate, setMouldingExtraRate] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTempIds, setSelectedTempIds] = useState<string[]>([]);
  const [showAddRowMenu, setShowAddRowMenu] = useState(false);

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

        const settings = await window.api.getAllSettings();
        if (settings) {
          setDoorUnit((settings.default_door_unit as 'inches' | 'feet') || 'inches');
          setChaukhatUnit((settings.default_chaukhat_unit as 'inches' | 'feet') || 'inches');
          setRailingUnit((settings.default_railing_unit as 'inches' | 'feet') || 'inches');
          setFixGolaUnit((settings.default_fix_gola_unit as 'inches' | 'feet') || 'inches');
          setMouldingUnit((settings.default_moulding_unit as 'inches' | 'feet') || 'inches');
          setDoorRate(settings.default_door_rate ? parseFloat(settings.default_door_rate) || 0 : 0);
          setChaukhatRate(settings.default_chaukhat_rate ? parseFloat(settings.default_chaukhat_rate) || 0 : 0);
          setRailingRate(settings.default_railing_rate ? parseFloat(settings.default_railing_rate) || 0 : 0);
          setFixGolaRate(settings.default_fix_gola_rate ? parseFloat(settings.default_fix_gola_rate) || 0 : 0);
          setMouldingRate(settings.default_moulding_rate ? parseFloat(settings.default_moulding_rate) || 0 : 0);
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
      // If menu is open, handle key overrides first
      if (showAddRowMenu) {
        if (e.key === '1') {
          e.preventDefault();
          addDoorRow();
          setShowAddRowMenu(false);
          return;
        }
        if (e.key === '2') {
          e.preventDefault();
          addChaukhatRow();
          setShowAddRowMenu(false);
          return;
        }
        if (e.key === '3') {
          e.preventDefault();
          addRailingRow();
          setShowAddRowMenu(false);
          return;
        }
        if (e.key === '4') {
          e.preventDefault();
          addFixGolaRow();
          setShowAddRowMenu(false);
          return;
        }
        if (e.key === '5') {
          e.preventDefault();
          addMouldingRow();
          setShowAddRowMenu(false);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowAddRowMenu(false);
          return;
        }
      }

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

      // 3. Alt+N: Toggle unified add row selector
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowAddRowMenu((prev) => !prev);
      }

      // 4. Alt+D: Add Door Row
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        addDoorRow();
      }

      // 5. Alt+C: Add Chaukhat Row
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        addChaukhatRow();
      }

      // 6. Alt+R: Add Railing Row
      if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        addRailingRow();
      }

      // 7. Alt+G: Add Fix Gola Row
      if (e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        addFixGolaRow();
      }

      // 8. Alt+M: Add Moulding Row
      if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        addMouldingRow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, items, doorRate, chaukhatRate, railingRate, fixGolaRate, mouldingRate, notes, doorUnit, chaukhatUnit, railingUnit, fixGolaUnit, mouldingUnit, navigate, showAddRowMenu]);

  const addDoorRow = () => {
    const tempId = Math.random().toString();
    setItems((prev) => [
      ...prev,
      {
        tempId,
        item_type: 'door_window',
        label: '',
        height: '',
        width: '',
        quantity: 1,
        rate: doorRate || 0
      }
    ]);
    setTimeout(() => {
      document.getElementById(`label-input-${tempId}`)?.focus();
    }, 50);
  };

  const addChaukhatRow = () => {
    const tempId = Math.random().toString();
    setItems((prev) => [
      ...prev,
      {
        tempId,
        item_type: 'chaukhat',
        label: '',
        height: '',
        width: '',
        quantity: 1,
        rate: chaukhatRate || 0
      }
    ]);
    setTimeout(() => {
      document.getElementById(`label-input-${tempId}`)?.focus();
    }, 50);
  };

  const addRailingRow = () => {
    const tempId = Math.random().toString();
    setItems((prev) => [
      ...prev,
      {
        tempId,
        item_type: 'railing',
        label: '',
        height: '',
        width: '',
        quantity: 1,
        rate: railingRate || 0
      }
    ]);
    setTimeout(() => {
      document.getElementById(`label-input-${tempId}`)?.focus();
    }, 50);
  };

  const addFixGolaRow = () => {
    const tempId = Math.random().toString();
    setItems((prev) => [
      ...prev,
      {
        tempId,
        item_type: 'fix_gola',
        label: '',
        height: '',
        width: '',
        quantity: 1,
        rate: fixGolaRate || 0
      }
    ]);
    setTimeout(() => {
      document.getElementById(`label-input-${tempId}`)?.focus();
    }, 50);
  };

  const addMouldingRow = () => {
    const tempId = Math.random().toString();
    setItems((prev) => [
      ...prev,
      {
        tempId,
        item_type: 'moulding',
        label: '',
        height: '',
        width: '',
        quantity: 1,
        rate: mouldingRate || 0
      }
    ]);
    setTimeout(() => {
      document.getElementById(`label-input-${tempId}`)?.focus();
    }, 50);
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

  const handleDeleteSelected = (type: 'door_window' | 'chaukhat' | 'railing' | 'fix_gola' | 'moulding') => {
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
  const railingItems = items.filter((i) => i.item_type === 'railing');
  const fixGolaItems = items.filter((i) => i.item_type === 'fix_gola');
  const mouldingItems = items.filter((i) => i.item_type === 'moulding');

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

  const railingsSubtotal = useMemo(() => {
    return items
      .filter((i) => i.item_type === 'railing')
      .reduce((sum, item) => {
        const h = typeof item.height === 'number' ? item.height : 0;
        const w = typeof item.width === 'number' ? item.width : 0;
        return sum + calculateItemValue({ item_type: 'railing', height: h, width: w, quantity: item.quantity, unit: railingUnit });
      }, 0);
  }, [items, railingUnit]);

  const fixGolaSubtotal = useMemo(() => {
    return items
      .filter((i) => i.item_type === 'fix_gola')
      .reduce((sum, item) => {
        const h = typeof item.height === 'number' ? item.height : 0;
        const w = typeof item.width === 'number' ? item.width : 0;
        return sum + calculateItemValue({ item_type: 'fix_gola', height: h, width: w, quantity: item.quantity, unit: fixGolaUnit });
      }, 0);
  }, [items, fixGolaUnit]);

  const mouldingSubtotal = useMemo(() => {
    return items
      .filter((i) => i.item_type === 'moulding')
      .reduce((sum, item) => {
        const h = typeof item.height === 'number' ? item.height : 0;
        const w = typeof item.width === 'number' ? item.width : 0;
        return sum + calculateItemValue({ item_type: 'moulding', height: h, width: w, quantity: item.quantity, unit: mouldingUnit });
      }, 0);
  }, [items, mouldingUnit]);

  const doorsAmount = useMemo(() => {
    return items
      .filter((i) => i.item_type === 'door_window')
      .reduce((sum, item) => {
        const h = typeof item.height === 'number' ? item.height : 0;
        const w = typeof item.width === 'number' ? item.width : 0;
        const r = typeof item.rate === 'number' ? item.rate : 0;
        return sum + calculateDoorItemValue({ height: h, width: w, quantity: item.quantity, unit: doorUnit }) * r;
      }, 0);
  }, [items, doorUnit]);

  const chaukhatAmount = useMemo(() => {
    return items
      .filter((i) => i.item_type === 'chaukhat')
      .reduce((sum, item) => {
        const h = typeof item.height === 'number' ? item.height : 0;
        const w = typeof item.width === 'number' ? item.width : 0;
        const r = typeof item.rate === 'number' ? item.rate : 0;
        return sum + calculateChaukhatItemValue({ height: h, width: w, quantity: item.quantity, unit: chaukhatUnit }) * r;
      }, 0);
  }, [items, chaukhatUnit]);

  const railingsAmount = useMemo(() => {
    return items
      .filter((i) => i.item_type === 'railing')
      .reduce((sum, item) => {
        const h = typeof item.height === 'number' ? item.height : 0;
        const w = typeof item.width === 'number' ? item.width : 0;
        const r = typeof item.rate === 'number' ? item.rate : 0;
        return sum + calculateItemValue({ item_type: 'railing', height: h, width: w, quantity: item.quantity, unit: railingUnit }) * r;
      }, 0);
  }, [items, railingUnit]);

  const fixGolaAmount = useMemo(() => {
    return items
      .filter((i) => i.item_type === 'fix_gola')
      .reduce((sum, item) => {
        const h = typeof item.height === 'number' ? item.height : 0;
        const w = typeof item.width === 'number' ? item.width : 0;
        const r = typeof item.rate === 'number' ? item.rate : 0;
        return sum + calculateItemValue({ item_type: 'fix_gola', height: h, width: w, quantity: item.quantity, unit: fixGolaUnit }) * r;
      }, 0);
  }, [items, fixGolaUnit]);

  const mouldingAmount = useMemo(() => {
    return items
      .filter((i) => i.item_type === 'moulding')
      .reduce((sum, item) => {
        const h = typeof item.height === 'number' ? item.height : 0;
        const w = typeof item.width === 'number' ? item.width : 0;
        const r = typeof item.rate === 'number' ? item.rate : 0;
        return sum + calculateItemValue({ item_type: 'moulding', height: h, width: w, quantity: item.quantity, unit: mouldingUnit }) * r;
      }, 0);
  }, [items, mouldingUnit]);

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    // Validate that there is at least one item and height/width are filled
    if (items.length === 0) {
      alert('Please add at least one door/window or chaukhat item to the order.');
      return;
    }

    for (const item of items) {
      const needsWidth = item.item_type === 'door_window' || item.item_type === 'chaukhat';
      const widthVal = typeof item.width === 'number' ? item.width : 0;
      if (
        item.height === '' ||
        (needsWidth && item.width === '') ||
        !Number.isFinite(item.height) ||
        (needsWidth && !Number.isFinite(widthVal)) ||
        item.height <= 0 ||
        (needsWidth && widthVal <= 0) ||
        !Number.isFinite(item.quantity) ||
        item.quantity < 1 ||
        (typeof item.rate === 'number' && (!Number.isFinite(item.rate) || item.rate < 0))
      ) {
        alert('Please enter valid measurements, quantity, and rate for all items.');
        return;
      }
    }

    setSubmitting(true);

    try {
      const orderResult = await window.api.createOrderWithItems({
        order: {
          clientId: client.id,
          notes,
          doorUnit,
          chaukhatUnit,
          railingUnit,
          fixGolaUnit,
          mouldingUnit,
          woodType,
          doorsExtraLabel,
          doorsExtraRate: typeof doorsExtraRate === 'number' ? doorsExtraRate : 0,
          chaukhatExtraLabel,
          chaukhatExtraRate: typeof chaukhatExtraRate === 'number' ? chaukhatExtraRate : 0,
          railingsExtraLabel,
          railingsExtraRate: typeof railingsExtraRate === 'number' ? railingsExtraRate : 0,
          fixGolaExtraLabel,
          fixGolaExtraRate: typeof fixGolaExtraRate === 'number' ? fixGolaExtraRate : 0,
          mouldingExtraLabel,
          mouldingExtraRate: typeof mouldingExtraRate === 'number' ? mouldingExtraRate : 0
        },
        items: items.map((item) => {
          const needsWidth = item.item_type === 'door_window' || item.item_type === 'chaukhat';
          return {
            item_type: item.item_type,
            label: item.label,
            height: item.height as number,
            width: needsWidth ? (item.width as number) : 0,
            quantity: item.quantity,
            rate: typeof item.rate === 'number' ? item.rate : 0
          };
        })
      });
      const orderId = orderResult.id;

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

      {/* Compact Order Settings Bar */}
      <div className="card" style={{ padding: '0.6rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', width: '100%' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-primary)', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>Units:</span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', flexGrow: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Doors:</span>
              <div className="segmented-control" style={{ scale: '0.85', transformOrigin: 'left center' }}>
                <button
                  type="button"
                  className={`segment-btn ${doorUnit === 'inches' ? 'active' : ''}`}
                  onClick={() => setDoorUnit('inches')}
                >
                  In
                </button>
                <button
                  type="button"
                  className={`segment-btn ${doorUnit === 'feet' ? 'active' : ''}`}
                  onClick={() => setDoorUnit('feet')}
                >
                  Ft
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Chaukhats:</span>
              <div className="segmented-control" style={{ scale: '0.85', transformOrigin: 'left center' }}>
                <button
                  type="button"
                  className={`segment-btn ${chaukhatUnit === 'inches' ? 'active' : ''}`}
                  onClick={() => setChaukhatUnit('inches')}
                >
                  In
                </button>
                <button
                  type="button"
                  className={`segment-btn ${chaukhatUnit === 'feet' ? 'active' : ''}`}
                  onClick={() => setChaukhatUnit('feet')}
                >
                  Ft
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Railings:</span>
              <div className="segmented-control" style={{ scale: '0.85', transformOrigin: 'left center' }}>
                <button
                  type="button"
                  className={`segment-btn ${railingUnit === 'inches' ? 'active' : ''}`}
                  onClick={() => setRailingUnit('inches')}
                >
                  In
                </button>
                <button
                  type="button"
                  className={`segment-btn ${railingUnit === 'feet' ? 'active' : ''}`}
                  onClick={() => setRailingUnit('feet')}
                >
                  Ft
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Fix Gola:</span>
              <div className="segmented-control" style={{ scale: '0.85', transformOrigin: 'left center' }}>
                <button
                  type="button"
                  className={`segment-btn ${fixGolaUnit === 'inches' ? 'active' : ''}`}
                  onClick={() => setFixGolaUnit('inches')}
                >
                  In
                </button>
                <button
                  type="button"
                  className={`segment-btn ${fixGolaUnit === 'feet' ? 'active' : ''}`}
                  onClick={() => setFixGolaUnit('feet')}
                >
                  Ft
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Moulding:</span>
              <div className="segmented-control" style={{ scale: '0.85', transformOrigin: 'left center' }}>
                <button
                  type="button"
                  className={`segment-btn ${mouldingUnit === 'inches' ? 'active' : ''}`}
                  onClick={() => setMouldingUnit('inches')}
                >
                  In
                </button>
                <button
                  type="button"
                  className={`segment-btn ${mouldingUnit === 'feet' ? 'active' : ''}`}
                  onClick={() => setMouldingUnit('feet')}
                >
                  Ft
                </button>
              </div>
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
              <div className="card-el" style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '38px 2.2fr 0.8fr 0.8fr 0.8fr 1fr 1.5fr auto', gap: '0.75rem', padding: '0.65rem 1rem', fontSize: '0.725rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-body)', alignItems: 'center', backgroundColor: 'var(--color-bg-app)', borderBottom: '1px solid var(--color-border)' }}>
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
                  <span>Rate (₹)</span>
                  <span style={{ textAlign: 'right' }}>Calculated Area & Cost</span>
                  <span></span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--color-bg-app)', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Polish / Paint Add-on:</span>
                  <input
                    type="text"
                    placeholder="Add-on Name (e.g. Polish)"
                    value={doorsExtraLabel}
                    onChange={(e) => setDoorsExtraLabel(e.target.value)}
                    className="form-input"
                    style={{ width: '200px', height: '30px', minHeight: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  />
                  <input
                    type="number"
                    placeholder="Price (₹ / sqft)"
                    value={doorsExtraRate}
                    onChange={(e) => setDoorsExtraRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="form-input"
                    style={{ width: '130px', height: '30px', minHeight: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    min={0}
                    step="any"
                  />
                  {doorsExtraLabel && typeof doorsExtraRate === 'number' && doorsExtraRate > 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-emerald)', fontWeight: 700, marginLeft: 'auto' }}>
                      Add-on Cost: ₹{(doorsSubtotal * doorsExtraRate).toFixed(2)}
                    </span>
                  )}
                </div>
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
              <div className="card-el" style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '38px 2.2fr 0.8fr 0.8fr 0.8fr 1fr 1.5fr auto', gap: '0.75rem', padding: '0.65rem 1rem', fontSize: '0.725rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-body)', alignItems: 'center', backgroundColor: 'var(--color-bg-app)', borderBottom: '1px solid var(--color-border)' }}>
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
                  <span>Rate (₹)</span>
                  <span style={{ textAlign: 'right' }}>Calculated Length & Cost</span>
                  <span></span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
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
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--color-bg-app)', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Polish / Paint Add-on:</span>
                  <input
                    type="text"
                    placeholder="Add-on Name (e.g. Polish)"
                    value={chaukhatExtraLabel}
                    onChange={(e) => setChaukhatExtraLabel(e.target.value)}
                    className="form-input"
                    style={{ width: '200px', height: '30px', minHeight: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  />
                  <input
                    type="number"
                    placeholder="Price (₹ / ft)"
                    value={chaukhatExtraRate}
                    onChange={(e) => setChaukhatExtraRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="form-input"
                    style={{ width: '130px', height: '30px', minHeight: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    min={0}
                    step="any"
                  />
                  {chaukhatExtraLabel && typeof chaukhatExtraRate === 'number' && chaukhatExtraRate > 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-emerald)', fontWeight: 700, marginLeft: 'auto' }}>
                      Add-on Cost: ₹{(chaukhatSubtotal * chaukhatExtraRate).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Railings Section */}
          <div className="order-items-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', textTransform: 'uppercase' }}>
                Railings
              </h3>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {selectedTempIds.filter(id => railingItems.some(i => i.tempId === id)).length > 0 && (
                  <button type="button" className="btn btn-danger" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', marginRight: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => handleDeleteSelected('railing')}>
                    <Trash2 size={14} />
                    <span>Delete Selected ({selectedTempIds.filter(id => railingItems.some(i => i.tempId === id)).length})</span>
                  </button>
                )}
                <button type="button" className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} onClick={addRailingRow}>
                  <Plus size={14} />
                  <span>Add Railing</span>
                  <kbd style={{ marginLeft: '0.375rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-app)', color: 'var(--color-text-secondary)', fontSize: '0.65rem', padding: '0.05rem 0.25rem' }}>Alt+R</kbd>
                </button>
              </div>
            </div>

            {railingItems.length === 0 ? (
              <div style={{ padding: '2.5rem 2rem', textAlign: 'center', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontSize: '0.8rem', fontFamily: 'var(--font-body)', borderRadius: 'var(--border-radius)' }}>
                No railing measurements added yet.
              </div>
            ) : (
              <div className="card-el" style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '38px 2.2fr 0.8fr 0.8fr 1fr 1.5fr auto', gap: '0.75rem', padding: '0.65rem 1rem', fontSize: '0.725rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-body)', alignItems: 'center', backgroundColor: 'var(--color-bg-app)', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input
                      type="checkbox"
                      checked={railingItems.length > 0 && railingItems.every(i => selectedTempIds.includes(i.tempId))}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const railingIds = railingItems.map(i => i.tempId);
                        if (checked) {
                          setSelectedTempIds(prev => Array.from(new Set([...prev, ...railingIds])));
                        } else {
                          setSelectedTempIds(prev => prev.filter(id => !railingIds.includes(id)));
                        }
                      }}
                      style={{ cursor: 'pointer', accentColor: 'var(--color-accent-amber)' }}
                      aria-label="Select all railings"
                    />
                  </div>
                  <span>Item Label</span>
                  <span>Height ({railingUnit === 'inches' ? 'in' : 'ft'})</span>
                  <span>Quantity</span>
                  <span>Rate (₹)</span>
                  <span style={{ textAlign: 'right' }}>Calculated Length & Cost</span>
                  <span></span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {railingItems.map((item) => (
                    <ChaukhatItemRow
                      key={item.tempId}
                      item={item}
                      unit={railingUnit}
                      onChange={handleUpdateItem}
                      onDelete={handleDeleteItem}
                      selected={selectedTempIds.includes(item.tempId)}
                      onSelect={handleSelectRow}
                      valueLabel="LENGTH"
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--color-bg-app)', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Polish / Paint Add-on:</span>
                  <input
                    type="text"
                    placeholder="Add-on Name (e.g. Polish)"
                    value={railingsExtraLabel}
                    onChange={(e) => setRailingsExtraLabel(e.target.value)}
                    className="form-input"
                    style={{ width: '200px', height: '30px', minHeight: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  />
                  <input
                    type="number"
                    placeholder="Price (₹ / ft)"
                    value={railingsExtraRate}
                    onChange={(e) => setRailingsExtraRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="form-input"
                    style={{ width: '130px', height: '30px', minHeight: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    min={0}
                    step="any"
                  />
                  {railingsExtraLabel && typeof railingsExtraRate === 'number' && railingsExtraRate > 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-emerald)', fontWeight: 700, marginLeft: 'auto' }}>
                      Add-on Cost: ₹{(railingsSubtotal * railingsExtraRate).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Fix Gola Section */}
          <div className="order-items-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', textTransform: 'uppercase' }}>
                Fix Gola
              </h3>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {selectedTempIds.filter(id => fixGolaItems.some(i => i.tempId === id)).length > 0 && (
                  <button type="button" className="btn btn-danger" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', marginRight: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => handleDeleteSelected('fix_gola')}>
                    <Trash2 size={14} />
                    <span>Delete Selected ({selectedTempIds.filter(id => fixGolaItems.some(i => i.tempId === id)).length})</span>
                  </button>
                )}
                <button type="button" className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} onClick={addFixGolaRow}>
                  <Plus size={14} />
                  <span>Add Fix Gola</span>
                  <kbd style={{ marginLeft: '0.375rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-app)', color: 'var(--color-text-secondary)', fontSize: '0.65rem', padding: '0.05rem 0.25rem' }}>Alt+G</kbd>
                </button>
              </div>
            </div>

            {fixGolaItems.length === 0 ? (
              <div style={{ padding: '2.5rem 2rem', textAlign: 'center', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontSize: '0.8rem', fontFamily: 'var(--font-body)', borderRadius: 'var(--border-radius)' }}>
                No fix gola measurements added yet.
              </div>
            ) : (
              <div className="card-el" style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '38px 2.2fr 0.8fr 0.8fr 1fr 1.5fr auto', gap: '0.75rem', padding: '0.65rem 1rem', fontSize: '0.725rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-body)', alignItems: 'center', backgroundColor: 'var(--color-bg-app)', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input
                      type="checkbox"
                      checked={fixGolaItems.length > 0 && fixGolaItems.every(i => selectedTempIds.includes(i.tempId))}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const fixGolaIds = fixGolaItems.map(i => i.tempId);
                        if (checked) {
                          setSelectedTempIds(prev => Array.from(new Set([...prev, ...fixGolaIds])));
                        } else {
                          setSelectedTempIds(prev => prev.filter(id => !fixGolaIds.includes(id)));
                        }
                      }}
                      style={{ cursor: 'pointer', accentColor: 'var(--color-accent-amber)' }}
                      aria-label="Select all fix golas"
                    />
                  </div>
                  <span>Item Label</span>
                  <span>Height ({fixGolaUnit === 'inches' ? 'in' : 'ft'})</span>
                  <span>Quantity</span>
                  <span>Rate (₹)</span>
                  <span style={{ textAlign: 'right' }}>Calculated Length & Cost</span>
                  <span></span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {fixGolaItems.map((item) => (
                    <ChaukhatItemRow
                      key={item.tempId}
                      item={item}
                      unit={fixGolaUnit}
                      onChange={handleUpdateItem}
                      onDelete={handleDeleteItem}
                      selected={selectedTempIds.includes(item.tempId)}
                      onSelect={handleSelectRow}
                      valueLabel="LENGTH"
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--color-bg-app)', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Polish / Paint Add-on:</span>
                  <input
                    type="text"
                    placeholder="Add-on Name (e.g. Polish)"
                    value={fixGolaExtraLabel}
                    onChange={(e) => setFixGolaExtraLabel(e.target.value)}
                    className="form-input"
                    style={{ width: '200px', height: '30px', minHeight: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  />
                  <input
                    type="number"
                    placeholder="Price (₹ / ft)"
                    value={fixGolaExtraRate}
                    onChange={(e) => setFixGolaExtraRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="form-input"
                    style={{ width: '130px', height: '30px', minHeight: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    min={0}
                    step="any"
                  />
                  {fixGolaExtraLabel && typeof fixGolaExtraRate === 'number' && fixGolaExtraRate > 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-emerald)', fontWeight: 700, marginLeft: 'auto' }}>
                      Add-on Cost: ₹{(fixGolaSubtotal * fixGolaExtraRate).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Moulding Section */}
          <div className="order-items-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', textTransform: 'uppercase' }}>
                Moulding
              </h3>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {selectedTempIds.filter(id => mouldingItems.some(i => i.tempId === id)).length > 0 && (
                  <button type="button" className="btn btn-danger" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', marginRight: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => handleDeleteSelected('moulding')}>
                    <Trash2 size={14} />
                    <span>Delete Selected ({selectedTempIds.filter(id => mouldingItems.some(i => i.tempId === id)).length})</span>
                  </button>
                )}
                <button type="button" className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} onClick={addMouldingRow}>
                  <Plus size={14} />
                  <span>Add Moulding</span>
                  <kbd style={{ marginLeft: '0.375rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-app)', color: 'var(--color-text-secondary)', fontSize: '0.65rem', padding: '0.05rem 0.25rem' }}>Alt+M</kbd>
                </button>
              </div>
            </div>

            {mouldingItems.length === 0 ? (
              <div style={{ padding: '2.5rem 2rem', textAlign: 'center', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontSize: '0.8rem', fontFamily: 'var(--font-body)', borderRadius: 'var(--border-radius)' }}>
                No moulding measurements added yet.
              </div>
            ) : (
              <div className="card-el" style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '38px 2.2fr 0.8fr 0.8fr 1fr 1.5fr auto', gap: '0.75rem', padding: '0.65rem 1rem', fontSize: '0.725rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-body)', alignItems: 'center', backgroundColor: 'var(--color-bg-app)', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input
                      type="checkbox"
                      checked={mouldingItems.length > 0 && mouldingItems.every(i => selectedTempIds.includes(i.tempId))}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const mouldingIds = mouldingItems.map(i => i.tempId);
                        if (checked) {
                          setSelectedTempIds(prev => Array.from(new Set([...prev, ...mouldingIds])));
                        } else {
                          setSelectedTempIds(prev => prev.filter(id => !mouldingIds.includes(id)));
                        }
                      }}
                      style={{ cursor: 'pointer', accentColor: 'var(--color-accent-amber)' }}
                      aria-label="Select all mouldings"
                    />
                  </div>
                  <span>Item Label</span>
                  <span>Height ({mouldingUnit === 'inches' ? 'in' : 'ft'})</span>
                  <span>Quantity</span>
                  <span>Rate (₹)</span>
                  <span style={{ textAlign: 'right' }}>Calculated Length & Cost</span>
                  <span></span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {mouldingItems.map((item) => (
                    <ChaukhatItemRow
                      key={item.tempId}
                      item={item}
                      unit={mouldingUnit}
                      onChange={handleUpdateItem}
                      onDelete={handleDeleteItem}
                      selected={selectedTempIds.includes(item.tempId)}
                      onSelect={handleSelectRow}
                      valueLabel="LENGTH"
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--color-bg-app)', borderTop: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Polish / Paint Add-on:</span>
                  <input
                    type="text"
                    placeholder="Add-on Name (e.g. Polish)"
                    value={mouldingExtraLabel}
                    onChange={(e) => setMouldingExtraLabel(e.target.value)}
                    className="form-input"
                    style={{ width: '200px', height: '30px', minHeight: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  />
                  <input
                    type="number"
                    placeholder="Price (₹ / ft)"
                    value={mouldingExtraRate}
                    onChange={(e) => setMouldingExtraRate(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="form-input"
                    style={{ width: '130px', height: '30px', minHeight: 'auto', fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                    min={0}
                    step="any"
                  />
                  {mouldingExtraLabel && typeof mouldingExtraRate === 'number' && mouldingExtraRate > 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-emerald)', fontWeight: 700, marginLeft: 'auto' }}>
                      Add-on Cost: ₹{(mouldingSubtotal * mouldingExtraRate).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right column: Totals Summary */}
        <div>
          <div style={{ position: 'sticky', top: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Unified Side Panel Order Info */}
            <div className="card" style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 'var(--border-radius)', backgroundColor: 'var(--color-bg-surface)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.375rem', margin: 0 }}>
                Order Info
              </h3>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="order-wood-type" className="form-label" style={{ fontWeight: 800, fontSize: '0.75rem', color: 'var(--color-text-primary)' }}>
                  Wood Type
                </label>
                <input
                  id="order-wood-type"
                  type="text"
                  className="form-input"
                  style={{ textTransform: 'uppercase', height: '36px', minHeight: 'auto' }}
                  value={woodType}
                  onChange={(e) => setWoodType(e.target.value)}
                  placeholder="e.g. Teak Wood"
                  maxLength={100}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="order-notes" className="form-label" style={{ fontWeight: 800, fontSize: '0.75rem', color: 'var(--color-text-primary)' }}>
                  Order Notes
                </label>
                <textarea
                  id="order-notes"
                  className="form-textarea"
                  style={{ minHeight: '100px' }}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Provide any additional specifications..."
                  maxLength={1000}
                />
              </div>
            </div>

            <OrderSummary
              doorsSubtotal={doorsSubtotal}
              chaukhatSubtotal={chaukhatSubtotal}
              railingsSubtotal={railingsSubtotal}
              fixGolaSubtotal={fixGolaSubtotal}
              mouldingSubtotal={mouldingSubtotal}
              doorsAmount={doorsAmount}
              chaukhatAmount={chaukhatAmount}
              railingsAmount={railingsAmount}
              fixGolaAmount={fixGolaAmount}
              mouldingAmount={mouldingAmount}
              doorsExtraLabel={doorsExtraLabel}
              doorsExtraRate={typeof doorsExtraRate === 'number' ? doorsExtraRate : 0}
              chaukhatExtraLabel={chaukhatExtraLabel}
              chaukhatExtraRate={typeof chaukhatExtraRate === 'number' ? chaukhatExtraRate : 0}
              railingsExtraLabel={railingsExtraLabel}
              railingsExtraRate={typeof railingsExtraRate === 'number' ? railingsExtraRate : 0}
              fixGolaExtraLabel={fixGolaExtraLabel}
              fixGolaExtraRate={typeof fixGolaExtraRate === 'number' ? fixGolaExtraRate : 0}
              mouldingExtraLabel={mouldingExtraLabel}
              mouldingExtraRate={typeof mouldingExtraRate === 'number' ? mouldingExtraRate : 0}
            />
          </div>
        </div>
      </div>

      {showAddRowMenu && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--border-radius-lg, 8px)',
          boxShadow: 'var(--shadow-lg, 0 10px 25px rgba(0,0,0,0.15))',
          padding: '1rem',
          zIndex: 1000,
          width: '320px',
          animation: 'fade-in 0.15s ease-out',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          fontFamily: 'var(--font-body)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.675rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
              Add Product Category
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Press number key</span>
          </div>

          {[
            { key: '1', name: 'Doors & Windows' },
            { key: '2', name: 'Chaukhats (Frames)' },
            { key: '3', name: 'Railings' },
            { key: '4', name: 'Fix Gola' },
            { key: '5', name: 'Moulding' }
          ].map((cat) => (
            <button
              key={cat.key}
              type="button"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'none',
                border: 'none',
                padding: '0.375rem 0.5rem',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                transition: 'background-color 0.15s'
              }}
              onClick={() => {
                if (cat.key === '1') addDoorRow();
                else if (cat.key === '2') addChaukhatRow();
                else if (cat.key === '3') addRailingRow();
                else if (cat.key === '4') addFixGolaRow();
                else if (cat.key === '5') addMouldingRow();
                setShowAddRowMenu(false);
              }}
            >
              <span>{cat.name}</span>
              <kbd style={{ fontSize: '0.65rem', padding: '0.05rem 0.25rem' }}>{cat.key}</kbd>
            </button>
          ))}
          
          <div style={{ display: 'flex', justifyContent: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setShowAddRowMenu(false)}
              style={{
                padding: '0.25rem 0.75rem',
                fontSize: '0.725rem',
                fontWeight: 700
              }}
            >
              Cancel (Esc)
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
