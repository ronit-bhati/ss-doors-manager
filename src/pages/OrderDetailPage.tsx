import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Trash2, Plus } from 'lucide-react';
import { DoorItemRow } from '../components/DoorItemRow.tsx';
import { ChaukhatItemRow } from '../components/ChaukhatItemRow.tsx';
import { OrderSummary } from '../components/OrderSummary.tsx';

interface Client {
  id: number;
  name: string;
  phone: string;
  address: string;
}

interface OrderItem {
  id: number;
  order_id: number;
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

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const previewDialogRef = useRef<HTMLDialogElement>(null);

  const [order, setOrder] = useState<Order | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [woodType, setWoodType] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('pending');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [advancePaid, setAdvancePaid] = useState<number | ''>(0);
  const [loading, setLoading] = useState(true);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showAddRowMenu, setShowAddRowMenu] = useState(false);
  const [focusItemId, setFocusItemId] = useState<number | null>(null);

  const fetchOrderDetails = useCallback(async () => {
    if (!id) return;
    try {
      const orderId = parseInt(id, 10);
      const orderData = await window.api.getOrder(orderId);
      if (!orderData) {
        navigate('/');
        return;
      }
      setOrder(orderData);
      setNotes(orderData.notes || '');
      setWoodType(orderData.wood_type || '');
      setStatus(orderData.order_status);
      setPaymentStatus(orderData.payment_status);
      setAdvancePaid(orderData.advance_paid ?? 0);

      // Fetch client
      const clientData = await window.api.getClient(orderData.client_id);
      setClient(clientData);
    } catch (err) {
      console.error('Failed to fetch order details:', err);
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchOrderDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (focusItemId !== null) {
      const el = document.getElementById(`label-input-${focusItemId}`);
      if (el) {
        el.focus();
        setFocusItemId(null);
      }
    }
  }, [order, focusItemId]);

  // Keyboard listeners for Order Detail page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If menu is open, handle key overrides first
      if (showAddRowMenu) {
        if (e.key === '1') {
          e.preventDefault();
          handleAddDoorItem();
          setShowAddRowMenu(false);
          return;
        }
        if (e.key === '2') {
          e.preventDefault();
          handleAddChaukhatItem();
          setShowAddRowMenu(false);
          return;
        }
        if (e.key === '3') {
          e.preventDefault();
          handleAddRailingItem();
          setShowAddRowMenu(false);
          return;
        }
        if (e.key === '4') {
          e.preventDefault();
          handleAddFixGolaItem();
          setShowAddRowMenu(false);
          return;
        }
        if (e.key === '5') {
          e.preventDefault();
          handleAddMouldingItem();
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

      // 2. Ctrl+P: Export PDF
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handleExportPDF();
      }

      // 3. Alt+N: Toggle unified add row selector
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setShowAddRowMenu((prev) => !prev);
      }

      // 4. Alt+D: Add Door item inline
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleAddDoorItem();
      }

      // 5. Alt+C: Add Chaukhat item inline
      if (e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleAddChaukhatItem();
      }

      // 6. Alt+R: Add Railing item inline
      if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleAddRailingItem();
      }

      // 7. Alt+G: Add Fix Gola item inline
      if (e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        handleAddFixGolaItem();
      }

      // 8. Alt+M: Add Moulding item inline
      if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleAddMouldingItem();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, order, navigate, showAddRowMenu]);

  const handleStatusChange = async (newStatus: string) => {
    if (!order) return;
    try {
      setStatus(newStatus);
      await window.api.updateOrderStatus(order.id, newStatus);
      showToast(`Status updated to: ${newStatus.replace('_', ' ')}`);
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

  const handlePaymentStatusChange = async (newPayStatus: string) => {
    if (!order) return;
    setPaymentStatus(newPayStatus);
    const finalAdvance = typeof advancePaid === 'number' ? advancePaid : 0;
    try {
      await window.api.updateOrderPaymentDetails(order.id, {
        paymentStatus: newPayStatus,
        advancePaid: finalAdvance
      });
      const updated = await window.api.getOrder(order.id);
      setOrder(updated);
      showToast(`Payment status: ${newPayStatus.toUpperCase()}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdvancePaidBlur = async () => {
    if (!order) return;
    const finalAdvance = typeof advancePaid === 'number' ? advancePaid : 0;
    try {
      await window.api.updateOrderPaymentDetails(order.id, {
        paymentStatus,
        advancePaid: finalAdvance
      });
      const updated = await window.api.getOrder(order.id);
      setOrder(updated);
      showToast('Advance paid updated.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleWoodTypeBlur = async () => {
    if (!order) return;
    try {
      await window.api.updateOrderWoodType(order.id, woodType);
      showToast('Wood type saved.');
    } catch (err) {
      console.error(err);
      alert('Failed to save wood type.');
    }
  };

  const handleNotesBlur = async () => {
    if (!order) return;
    try {
      await window.api.updateOrderNotes(order.id, notes);
      showToast('Notes saved.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDoorItem = async () => {
    if (!order) return;
    try {
      const settings = await window.api.getAllSettings();
      const defRate = settings?.default_door_rate ? parseFloat(settings.default_door_rate) || 0 : 0;
      const res = await window.api.addOrderItem(order.id, {
        item_type: 'door_window',
        label: '',
        height: 0,
        width: 0,
        quantity: 1,
        rate: defRate
      });
      if (res && res.id) {
        setFocusItemId(Number(res.id));
      }
      fetchOrderDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddChaukhatItem = async () => {
    if (!order) return;
    try {
      const settings = await window.api.getAllSettings();
      const defRate = settings?.default_chaukhat_rate ? parseFloat(settings.default_chaukhat_rate) || 0 : 0;
      const res = await window.api.addOrderItem(order.id, {
        item_type: 'chaukhat',
        label: '',
        height: 0,
        width: 0,
        quantity: 1,
        rate: defRate
      });
      if (res && res.id) {
        setFocusItemId(Number(res.id));
      }
      fetchOrderDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRailingItem = async () => {
    if (!order) return;
    try {
      const settings = await window.api.getAllSettings();
      const defRate = settings?.default_railing_rate ? parseFloat(settings.default_railing_rate) || 0 : 0;
      const res = await window.api.addOrderItem(order.id, {
        item_type: 'railing',
        label: '',
        height: 0,
        width: 0,
        quantity: 1,
        rate: defRate
      });
      if (res && res.id) {
        setFocusItemId(Number(res.id));
      }
      fetchOrderDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFixGolaItem = async () => {
    if (!order) return;
    try {
      const settings = await window.api.getAllSettings();
      const defRate = settings?.default_fix_gola_rate ? parseFloat(settings.default_fix_gola_rate) || 0 : 0;
      const res = await window.api.addOrderItem(order.id, {
        item_type: 'fix_gola',
        label: '',
        height: 0,
        width: 0,
        quantity: 1,
        rate: defRate
      });
      if (res && res.id) {
        setFocusItemId(Number(res.id));
      }
      fetchOrderDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMouldingItem = async () => {
    if (!order) return;
    try {
      const settings = await window.api.getAllSettings();
      const defRate = settings?.default_moulding_rate ? parseFloat(settings.default_moulding_rate) || 0 : 0;
      const res = await window.api.addOrderItem(order.id, {
        item_type: 'moulding',
        label: '',
        height: 0,
        width: 0,
        quantity: 1,
        rate: defRate
      });
      if (res && res.id) {
        setFocusItemId(Number(res.id));
      }
      fetchOrderDetails();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateItem = useCallback(async (
    itemId: string | number,
    fields: { label?: string; height?: number | ''; width?: number | ''; quantity?: number; rate?: number | '' }
  ) => {
    if (!id) return;
    const orderId = parseInt(id, 10);
    const idNum = typeof itemId === 'string' ? parseInt(itemId, 10) : itemId;
    try {
      const cleanFields: { label?: string; height?: number; width?: number; quantity?: number; rate?: number } = {};
      if (fields.label !== undefined) cleanFields.label = fields.label;
      if (fields.quantity !== undefined) cleanFields.quantity = fields.quantity;
      if (typeof fields.height === 'number') cleanFields.height = fields.height;
      if (typeof fields.width === 'number') cleanFields.width = fields.width;
      if (fields.rate !== undefined) {
        cleanFields.rate = typeof fields.rate === 'number' ? fields.rate : 0;
      }

      await window.api.updateOrderItem(idNum, cleanFields);
      // Wait, let's refresh to get updated calculations from DB
      const updated = await window.api.getOrder(orderId);
      setOrder(updated);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const handleDeleteSelected = async (type: 'door_window' | 'chaukhat' | 'railing' | 'fix_gola' | 'moulding') => {
    const idsToDelete = selectedIds.filter(idNum => {
      const item = order?.items.find(i => i.id === idNum);
      return item && item.item_type === type;
    });
    if (idsToDelete.length === 0) return;

    const confirmDelete = window.confirm(`Remove the ${idsToDelete.length} selected items?`);
    if (confirmDelete) {
      try {
        for (const idNum of idsToDelete) {
          await window.api.deleteOrderItem(idNum);
        }
        setSelectedIds(prev => prev.filter(idNum => !idsToDelete.includes(idNum)));
        fetchOrderDetails();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDeleteItem = useCallback(async (itemId: string | number) => {
    if (!id) return;
    const idNum = typeof itemId === 'string' ? parseInt(itemId, 10) : itemId;
    const confirmDelete = window.confirm('Remove this item from the order sheet?');
    if (confirmDelete) {
      try {
        await window.api.deleteOrderItem(idNum);
        setSelectedIds(prev => prev.filter(idVal => idVal !== idNum));
        fetchOrderDetails();
      } catch (err) {
        console.error(err);
      }
    }
  }, [id, fetchOrderDetails]);

  const handleSelectRow = useCallback((itemId: string | number, checked: boolean) => {
    const idNum = typeof itemId === 'string' ? parseInt(itemId, 10) : itemId;
    setSelectedIds((prev) => {
      if (checked) {
        return prev.includes(idNum) ? prev : [...prev, idNum];
      } else {
        return prev.filter((id) => id !== idNum);
      }
    });
  }, []);

  const handleDeleteOrder = async () => {
    if (!order || !client) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete Order #${order.id}? This action cannot be undone.`
    );
    if (confirmDelete) {
      try {
        await window.api.deleteOrder(order.id);
        navigate(`/client/${client.id}`);
      } catch (err) {
        console.error(err);
        alert('Failed to delete order.');
      }
    }
  };

  const handleExportPDF = () => {
    previewDialogRef.current?.showModal();
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
        Loading order details...
      </div>
    );
  }

  if (!order || !client) return null;

  const doorItems = order.items.filter((i) => i.item_type === 'door_window');
  const chaukhatItems = order.items.filter((i) => i.item_type === 'chaukhat');
  const railingItems = order.items.filter((i) => i.item_type === 'railing');
  const fixGolaItems = order.items.filter((i) => i.item_type === 'fix_gola');
  const mouldingItems = order.items.filter((i) => i.item_type === 'moulding');

  return (
    <div className="page-container animate-fade-in">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="toast-msg" style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 600 }}>
          System: {toastMessage}
        </div>
      )}

      <div>
        <Link to={`/client/${client.id}`} style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--color-text-secondary)', textDecoration: 'none', fontWeight: 700, fontSize: '0.825rem', marginBottom: '1rem', fontFamily: 'var(--font-body)', gap: '0.375rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Customer Ledger</span>
          <kbd style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-app)', color: 'var(--color-text-secondary)', fontSize: '0.65rem', padding: '0.05rem 0.25rem', marginLeft: '0.25rem' }}>Esc</kbd>
        </Link>
        <div className="page-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="page-title-group">
            <h1 className="page-title" style={{ fontFamily: 'var(--font-body)' }}>Order Sheet #{order.id}</h1>
            <p className="page-subtitle" style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem' }}>
              CLIENT: <span style={{ fontWeight: 800, color: 'var(--color-text-primary)' }}>{client.name.toUpperCase()}</span> | DATE: {new Date(order.order_date).toLocaleDateString()} | DOORS: {order.door_unit.toUpperCase()} | CHAUKHATS: {order.chaukhat_unit.toUpperCase()}
            </p>
          </div>
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ marginBottom: 0, flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="status-select" className="form-label" style={{ whiteSpace: 'nowrap', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '0.8rem' }}>ORDER STATUS:</label>
              <select
                id="status-select"
                className="form-select"
                style={{ height: '38px', minHeight: 'auto', padding: '0.375rem 2rem 0.375rem 0.75rem', fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 700 }}
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                <option value="pending">PENDING</option>
                <option value="in_progress">IN PROGRESS</option>
                <option value="completed">COMPLETED</option>
                <option value="delivered">DELIVERED</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0, flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="payment-status-select" className="form-label" style={{ whiteSpace: 'nowrap', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '0.8rem' }}>PAYMENT STATUS:</label>
              <select
                id="payment-status-select"
                className="form-select"
                style={{ height: '38px', minHeight: 'auto', padding: '0.375rem 2rem 0.375rem 0.75rem', fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 700 }}
                value={paymentStatus}
                onChange={(e) => handlePaymentStatusChange(e.target.value)}
              >
                <option value="pending">PENDING</option>
                <option value="paid">PAID</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0, flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="advance-paid-input" className="form-label" style={{ whiteSpace: 'nowrap', fontFamily: 'var(--font-body)', fontWeight: 800, fontSize: '0.8rem' }}>ADVANCE PAID (₹):</label>
              <input
                id="advance-paid-input"
                type="number"
                className="form-input"
                style={{ width: '130px', height: '38px', minHeight: 'auto', fontFamily: 'var(--font-display)', fontWeight: 700 }}
                value={advancePaid}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                  setAdvancePaid(val);
                }}
                onBlur={handleAdvancePaidBlur}
                disabled={paymentStatus === 'paid'}
                min={0}
                step="any"
              />
            </div>
            
            <button className="btn btn-outline" onClick={handleExportPDF} disabled={pdfGenerating} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
              <FileText size={16} />
              <span>{pdfGenerating ? 'Exporting PDF...' : 'Export PDF Invoice'}</span>
              <kbd style={{ marginLeft: '0.375rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-app)', color: 'var(--color-text-secondary)', fontSize: '0.65rem', padding: '0.05rem 0.25rem' }}>Ctrl+P</kbd>
            </button>
            
            <button className="btn btn-danger" onClick={handleDeleteOrder} aria-label="Delete order sheet" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
              <Trash2 size={16} />
              <span>Delete Sheet</span>
            </button>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        {/* Left Column: Editable Items Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* Doors Section */}
          <div className="order-items-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-body)', textTransform: 'uppercase' }}>
                Doors & Windows
              </h3>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {selectedIds.filter(id => doorItems.some(i => i.id === id)).length > 0 && (
                  <button type="button" className="btn btn-danger" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.5rem' }} onClick={() => handleDeleteSelected('door_window')}>
                    <Trash2 size={14} />
                    <span>Delete Selected ({selectedIds.filter(id => doorItems.some(i => i.id === id)).length})</span>
                  </button>
                )}
                <button type="button" className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} onClick={handleAddDoorItem}>
                  <Plus size={14} />
                  <span>Add Door/Window</span>
                  <kbd style={{ marginLeft: '0.375rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-app)', color: 'var(--color-text-secondary)', fontSize: '0.65rem', padding: '0.05rem 0.25rem' }}>Alt+D</kbd>
                </button>
              </div>
            </div>

            {doorItems.length === 0 ? (
              <div style={{ padding: '2.5rem 2rem', textAlign: 'center', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', fontSize: '0.8rem', fontFamily: 'var(--font-body)', borderRadius: 'var(--border-radius)' }}>
                No door or window measurements on this sheet.
              </div>
            ) : (
              <div className="card-el" style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '38px 2.2fr 0.8fr 0.8fr 0.8fr 1fr 1.5fr auto', gap: '0.75rem', padding: '0.65rem 1rem', fontSize: '0.725rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-body)', alignItems: 'center', backgroundColor: 'var(--color-bg-app)', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input
                      type="checkbox"
                      checked={doorItems.length > 0 && doorItems.every(i => selectedIds.includes(i.id))}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const doorIds = doorItems.map(i => i.id);
                        if (checked) {
                          setSelectedIds(prev => Array.from(new Set([...prev, ...doorIds])));
                        } else {
                          setSelectedIds(prev => prev.filter(id => !doorIds.includes(id)));
                        }
                      }}
                      style={{ cursor: 'pointer', accentColor: 'var(--color-accent-amber)' }}
                      aria-label="Select all doors"
                    />
                  </div>
                  <span>Item Label</span>
                  <span>Height ({order.door_unit === 'inches' ? 'in' : 'ft'})</span>
                  <span>Width ({order.door_unit === 'inches' ? 'in' : 'ft'})</span>
                  <span>Quantity</span>
                  <span>Rate (₹)</span>
                  <span style={{ textAlign: 'right' }}>Calculated Area & Cost</span>
                  <span></span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {doorItems.map((item) => (
                    <DoorItemRow
                      key={item.id}
                      item={item}
                      unit={order.door_unit}
                      onChange={handleUpdateItem}
                      onDelete={handleDeleteItem}
                      selected={selectedIds.includes(item.id)}
                      onSelect={handleSelectRow}
                    />
                  ))}
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
                {selectedIds.filter(id => chaukhatItems.some(i => i.id === id)).length > 0 && (
                  <button type="button" className="btn btn-danger" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginRight: '0.5rem' }} onClick={() => handleDeleteSelected('chaukhat')}>
                    <Trash2 size={14} />
                    <span>Delete Selected ({selectedIds.filter(id => chaukhatItems.some(i => i.id === id)).length})</span>
                  </button>
                )}
                <button type="button" className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} onClick={handleAddChaukhatItem}>
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
                      checked={chaukhatItems.length > 0 && chaukhatItems.every(i => selectedIds.includes(i.id))}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const chaukhatIds = chaukhatItems.map(i => i.id);
                        if (checked) {
                          setSelectedIds(prev => Array.from(new Set([...prev, ...chaukhatIds])));
                        } else {
                          setSelectedIds(prev => prev.filter(id => !chaukhatIds.includes(id)));
                        }
                      }}
                      style={{ cursor: 'pointer', accentColor: 'var(--color-accent-amber)' }}
                      aria-label="Select all chaukhats"
                    />
                  </div>
                  <span>Item Label</span>
                  <span>Height ({order.chaukhat_unit === 'inches' ? 'in' : 'ft'})</span>
                  <span>Width ({order.chaukhat_unit === 'inches' ? 'in' : 'ft'})</span>
                  <span>Quantity</span>
                  <span>Rate (₹)</span>
                  <span style={{ textAlign: 'right' }}>Calculated Length & Cost</span>
                  <span></span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {chaukhatItems.map((item) => (
                    <ChaukhatItemRow
                      key={item.id}
                      item={item}
                      unit={order.chaukhat_unit}
                      onChange={handleUpdateItem}
                      onDelete={handleDeleteItem}
                      selected={selectedIds.includes(item.id)}
                      onSelect={handleSelectRow}
                    />
                  ))}
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
                {selectedIds.filter(id => railingItems.some(i => i.id === id)).length > 0 && (
                  <button type="button" className="btn btn-danger" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', marginRight: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => handleDeleteSelected('railing')}>
                    <Trash2 size={14} />
                    <span>Delete Selected ({selectedIds.filter(id => railingItems.some(i => i.id === id)).length})</span>
                  </button>
                )}
                <button type="button" className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} onClick={handleAddRailingItem}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '38px 2.2fr 0.8fr 0.8fr 0.8fr 1fr 1.5fr auto', gap: '0.75rem', padding: '0.65rem 1rem', fontSize: '0.725rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-body)', alignItems: 'center', backgroundColor: 'var(--color-bg-app)', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input
                      type="checkbox"
                      checked={railingItems.length > 0 && railingItems.every(i => selectedIds.includes(i.id))}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const railingIds = railingItems.map(i => i.id);
                        if (checked) {
                          setSelectedIds(prev => Array.from(new Set([...prev, ...railingIds])));
                        } else {
                          setSelectedIds(prev => prev.filter(id => !railingIds.includes(id)));
                        }
                      }}
                      style={{ cursor: 'pointer', accentColor: 'var(--color-accent-amber)' }}
                      aria-label="Select all railings"
                    />
                  </div>
                  <span>Item Label</span>
                  <span>Height ({order.railing_unit === 'inches' ? 'in' : 'ft'})</span>
                  <span>Width ({order.railing_unit === 'inches' ? 'in' : 'ft'})</span>
                  <span>Quantity</span>
                  <span>Rate (₹)</span>
                  <span style={{ textAlign: 'right' }}>Calculated Length & Cost</span>
                  <span></span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {railingItems.map((item) => (
                    <ChaukhatItemRow
                      key={item.id}
                      item={item}
                      unit={order.railing_unit}
                      onChange={handleUpdateItem}
                      onDelete={handleDeleteItem}
                      selected={selectedIds.includes(item.id)}
                      onSelect={handleSelectRow}
                      valueLabel="LENGTH"
                    />
                  ))}
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
                {selectedIds.filter(id => fixGolaItems.some(i => i.id === id)).length > 0 && (
                  <button type="button" className="btn btn-danger" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', marginRight: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => handleDeleteSelected('fix_gola')}>
                    <Trash2 size={14} />
                    <span>Delete Selected ({selectedIds.filter(id => fixGolaItems.some(i => i.id === id)).length})</span>
                  </button>
                )}
                <button type="button" className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} onClick={handleAddFixGolaItem}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '38px 2.2fr 0.8fr 0.8fr 0.8fr 1fr 1.5fr auto', gap: '0.75rem', padding: '0.65rem 1rem', fontSize: '0.725rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-body)', alignItems: 'center', backgroundColor: 'var(--color-bg-app)', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input
                      type="checkbox"
                      checked={fixGolaItems.length > 0 && fixGolaItems.every(i => selectedIds.includes(i.id))}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const fixGolaIds = fixGolaItems.map(i => i.id);
                        if (checked) {
                          setSelectedIds(prev => Array.from(new Set([...prev, ...fixGolaIds])));
                        } else {
                          setSelectedIds(prev => prev.filter(id => !fixGolaIds.includes(id)));
                        }
                      }}
                      style={{ cursor: 'pointer', accentColor: 'var(--color-accent-amber)' }}
                      aria-label="Select all fix golas"
                    />
                  </div>
                  <span>Item Label</span>
                  <span>Height ({order.fix_gola_unit === 'inches' ? 'in' : 'ft'})</span>
                  <span>Width ({order.fix_gola_unit === 'inches' ? 'in' : 'ft'})</span>
                  <span>Quantity</span>
                  <span>Rate (₹)</span>
                  <span style={{ textAlign: 'right' }}>Calculated Length & Cost</span>
                  <span></span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {fixGolaItems.map((item) => (
                    <ChaukhatItemRow
                      key={item.id}
                      item={item}
                      unit={order.fix_gola_unit}
                      onChange={handleUpdateItem}
                      onDelete={handleDeleteItem}
                      selected={selectedIds.includes(item.id)}
                      onSelect={handleSelectRow}
                      valueLabel="LENGTH"
                    />
                  ))}
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
                {selectedIds.filter(id => mouldingItems.some(i => i.id === id)).length > 0 && (
                  <button type="button" className="btn btn-danger" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', marginRight: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => handleDeleteSelected('moulding')}>
                    <Trash2 size={14} />
                    <span>Delete Selected ({selectedIds.filter(id => mouldingItems.some(i => i.id === id)).length})</span>
                  </button>
                )}
                <button type="button" className="btn btn-secondary" style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }} onClick={handleAddMouldingItem}>
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
                <div style={{ display: 'grid', gridTemplateColumns: '38px 2.2fr 0.8fr 0.8fr 0.8fr 1fr 1.5fr auto', gap: '0.75rem', padding: '0.65rem 1rem', fontSize: '0.725rem', fontWeight: 800, color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontFamily: 'var(--font-body)', alignItems: 'center', backgroundColor: 'var(--color-bg-app)', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input
                      type="checkbox"
                      checked={mouldingItems.length > 0 && mouldingItems.every(i => selectedIds.includes(i.id))}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const mouldingIds = mouldingItems.map(i => i.id);
                        if (checked) {
                          setSelectedIds(prev => Array.from(new Set([...prev, ...mouldingIds])));
                        } else {
                          setSelectedIds(prev => prev.filter(id => !mouldingIds.includes(id)));
                        }
                      }}
                      style={{ cursor: 'pointer', accentColor: 'var(--color-accent-amber)' }}
                      aria-label="Select all mouldings"
                    />
                  </div>
                  <span>Item Label</span>
                  <span>Height ({order.moulding_unit === 'inches' ? 'in' : 'ft'})</span>
                  <span>Width ({order.moulding_unit === 'inches' ? 'in' : 'ft'})</span>
                  <span>Quantity</span>
                  <span>Rate (₹)</span>
                  <span style={{ textAlign: 'right' }}>Calculated Length & Cost</span>
                  <span></span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {mouldingItems.map((item) => (
                    <ChaukhatItemRow
                      key={item.id}
                      item={item}
                      unit={order.moulding_unit}
                      onChange={handleUpdateItem}
                      onDelete={handleDeleteItem}
                      selected={selectedIds.includes(item.id)}
                      onSelect={handleSelectRow}
                      valueLabel="LENGTH"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order totals summary */}
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
                  onBlur={handleWoodTypeBlur}
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
                  onBlur={handleNotesBlur}
                  placeholder="Provide any additional specifications..."
                  maxLength={1000}
                />
              </div>
            </div>

            <OrderSummary
              doorsSubtotal={order.doors_subtotal}
              chaukhatSubtotal={order.chaukhat_subtotal}
              railingsSubtotal={order.railings_subtotal}
              fixGolaSubtotal={order.fix_gola_subtotal}
              mouldingSubtotal={order.moulding_subtotal}
              doorsAmount={order.doors_amount}
              chaukhatAmount={order.chaukhat_amount}
              railingsAmount={order.railings_amount}
              fixGolaAmount={order.fix_gola_amount}
              mouldingAmount={order.moulding_amount}
              advancePaid={order.advance_paid}
              paymentStatus={order.payment_status}
            />
          </div>
        </div>
      </div>

      {/* Modal Dialog for PDF Print Preview */}
      <dialog 
        ref={previewDialogRef} 
        style={{
          width: '90vw',
          maxWidth: '900px',
          padding: 0,
          border: 'none',
          borderRadius: 'var(--border-radius-lg, 8px)',
          overflow: 'hidden',
          backgroundColor: '#ffffff'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '85vh', overflow: 'hidden' }}>
          {/* Header */}
          <div className="dialog-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-app)' }}>
            <h3 className="dialog-title" style={{ margin: 0, fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
              Invoice Print Preview
            </h3>
            <button
              type="button"
              className="dialog-close"
              onClick={() => previewDialogRef.current?.close()}
              style={{ padding: '0.25rem', fontSize: '1.25rem', cursor: 'pointer' }}
              aria-label="Close preview"
            >
              &times;
            </button>
          </div>

          {/* Body */}
          <div style={{ flexGrow: 1, padding: '1.5rem', overflowY: 'auto', backgroundColor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <div style={{
              width: '100%',
              backgroundColor: '#ffffff',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--border-radius)',
              overflow: 'hidden',
              padding: '1.5rem'
            }}>
              {order && client && (
                <div className="print-invoice" style={{ boxShadow: 'none', border: 'none', margin: 0, padding: 0 }}>
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
                      <table className="print-table" style={{ border: '1px solid var(--color-print-border)', width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '30%', textAlign: 'left', padding: '0.5rem' }}>Description / Label</th>
                            <th style={{ textAlign: 'center', padding: '0.5rem' }}>Height ({order.door_unit === 'inches' ? 'in' : 'ft'})</th>
                            <th style={{ textAlign: 'center', padding: '0.5rem' }}>Width ({order.door_unit === 'inches' ? 'in' : 'ft'})</th>
                            <th style={{ textAlign: 'center', padding: '0.5rem' }}>Qty</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Total Area (sqft)</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Rate (₹ / sqft)</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Total Cost (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {doorItems.map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--color-print-border)' }}>
                              <td style={{ padding: '0.5rem' }}>{item.label}</td>
                              <td style={{ textAlign: 'center', padding: '0.5rem' }}>{item.height}</td>
                              <td style={{ textAlign: 'center', padding: '0.5rem' }}>{item.width}</td>
                              <td style={{ textAlign: 'center', padding: '0.5rem' }}>{item.quantity}</td>
                              <td style={{ textAlign: 'right', padding: '0.5rem' }}>{item.calculated_value.toFixed(2)} sqft</td>
                              <td style={{ textAlign: 'right', padding: '0.5rem' }}>₹{item.rate.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600, padding: '0.5rem' }}>
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
                      <table className="print-table" style={{ border: '1px solid var(--color-print-border)', width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '30%', textAlign: 'left', padding: '0.5rem' }}>Description / Label</th>
                            <th style={{ textAlign: 'center', padding: '0.5rem' }}>Height ({order.chaukhat_unit === 'inches' ? 'in' : 'ft'})</th>
                            <th style={{ textAlign: 'center', padding: '0.5rem' }}>Width ({order.chaukhat_unit === 'inches' ? 'in' : 'ft'})</th>
                            <th style={{ textAlign: 'center', padding: '0.5rem' }}>Qty</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Running Length (ft)</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Rate (₹ / ft)</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Total Cost (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {chaukhatItems.map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--color-print-border)' }}>
                              <td style={{ padding: '0.5rem' }}>{item.label}</td>
                              <td style={{ textAlign: 'center', padding: '0.5rem' }}>{item.height}</td>
                              <td style={{ textAlign: 'center', padding: '0.5rem' }}>{item.width}</td>
                              <td style={{ textAlign: 'center', padding: '0.5rem' }}>{item.quantity}</td>
                              <td style={{ textAlign: 'right', padding: '0.5rem' }}>{item.calculated_value.toFixed(2)} ft</td>
                              <td style={{ textAlign: 'right', padding: '0.5rem' }}>₹{item.rate.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600, padding: '0.5rem' }}>
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
                      <table className="print-table" style={{ border: '1px solid var(--color-print-border)', width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '30%', textAlign: 'left', padding: '0.5rem' }}>Description / Label</th>
                            <th style={{ textAlign: 'center', padding: '0.5rem' }}>Height ({order.railing_unit === 'inches' ? 'in' : 'ft'})</th>
                            <th style={{ textAlign: 'center', padding: '0.5rem' }}>Width ({order.railing_unit === 'inches' ? 'in' : 'ft'})</th>
                            <th style={{ textAlign: 'center', padding: '0.5rem' }}>Qty</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Running Length (ft)</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Rate (₹ / ft)</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Total Cost (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {railingItems.map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--color-print-border)' }}>
                              <td style={{ padding: '0.5rem' }}>{item.label}</td>
                              <td style={{ textAlign: 'center', padding: '0.5rem' }}>{item.height}</td>
                              <td style={{ textAlign: 'center', padding: '0.5rem' }}>{item.width}</td>
                              <td style={{ textAlign: 'center', padding: '0.5rem' }}>{item.quantity}</td>
                              <td style={{ textAlign: 'right', padding: '0.5rem' }}>{item.calculated_value.toFixed(2)} ft</td>
                              <td style={{ textAlign: 'right', padding: '0.5rem' }}>₹{item.rate.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600, padding: '0.5rem' }}>
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
                      <table className="print-table" style={{ border: '1px solid var(--color-print-border)', width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '30%', textAlign: 'left', padding: '0.5rem' }}>Description / Label</th>
                            <th style={{ textAlign: 'center', padding: '0.5rem' }}>Height ({order.fix_gola_unit === 'inches' ? 'in' : 'ft'})</th>
                            <th style={{ textAlign: 'center', padding: '0.5rem' }}>Width ({order.fix_gola_unit === 'inches' ? 'in' : 'ft'})</th>
                            <th style={{ textAlign: 'center', padding: '0.5rem' }}>Qty</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Running Length (ft)</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Rate (₹ / ft)</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Total Cost (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fixGolaItems.map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--color-print-border)' }}>
                              <td style={{ padding: '0.5rem' }}>{item.label}</td>
                              <td style={{ textAlign: 'center', padding: '0.5rem' }}>{item.height}</td>
                              <td style={{ textAlign: 'center', padding: '0.5rem' }}>{item.width}</td>
                              <td style={{ textAlign: 'center', padding: '0.5rem' }}>{item.quantity}</td>
                              <td style={{ textAlign: 'right', padding: '0.5rem' }}>{item.calculated_value.toFixed(2)} ft</td>
                              <td style={{ textAlign: 'right', padding: '0.5rem' }}>₹{item.rate.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600, padding: '0.5rem' }}>
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
                      <table className="print-table" style={{ border: '1px solid var(--color-print-border)', width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ width: '30%', textAlign: 'left', padding: '0.5rem' }}>Description / Label</th>
                            <th style={{ textAlign: 'center', padding: '0.5rem' }}>Height ({order.moulding_unit === 'inches' ? 'in' : 'ft'})</th>
                            <th style={{ textAlign: 'center', padding: '0.5rem' }}>Width ({order.moulding_unit === 'inches' ? 'in' : 'ft'})</th>
                            <th style={{ textAlign: 'center', padding: '0.5rem' }}>Qty</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Running Length (ft)</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Rate (₹ / ft)</th>
                            <th style={{ textAlign: 'right', padding: '0.5rem' }}>Total Cost (₹)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mouldingItems.map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--color-print-border)' }}>
                              <td style={{ padding: '0.5rem' }}>{item.label}</td>
                              <td style={{ textAlign: 'center', padding: '0.5rem' }}>{item.height}</td>
                              <td style={{ textAlign: 'center', padding: '0.5rem' }}>{item.width}</td>
                              <td style={{ textAlign: 'center', padding: '0.5rem' }}>{item.quantity}</td>
                              <td style={{ textAlign: 'right', padding: '0.5rem' }}>{item.calculated_value.toFixed(2)} ft</td>
                              <td style={{ textAlign: 'right', padding: '0.5rem' }}>₹{item.rate.toFixed(2)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 600, padding: '0.5rem' }}>
                                ₹{(item.calculated_value * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Calculations & Totals Summary */}
                  <div className="print-summary-box" style={{ marginLeft: 'auto', width: '320px', marginTop: '1.5rem' }}>
                    {doorItems.length > 0 && order.doors_amount > 0 && (
                      <>
                        <div className="print-summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span>Doors Area Subtotal:</span>
                          <span>{order.doors_subtotal.toFixed(2)} sqft</span>
                        </div>
                        <div className="print-summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span><strong>Doors Total Cost:</strong></span>
                          <span><strong>₹{order.doors_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                        </div>
                        <div style={{ width: '320px', height: '1px', backgroundColor: 'var(--color-print-border)', margin: '0.4rem 0' }} />
                      </>
                    )}

                    {chaukhatItems.length > 0 && order.chaukhat_amount > 0 && (
                      <>
                        <div className="print-summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span>Chaukhats Length Subtotal:</span>
                          <span>{order.chaukhat_subtotal.toFixed(2)} ft</span>
                        </div>
                        <div className="print-summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span><strong>Chaukhats Total Cost:</strong></span>
                          <span><strong>₹{order.chaukhat_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                        </div>
                        <div style={{ width: '320px', height: '1px', backgroundColor: 'var(--color-print-border)', margin: '0.4rem 0' }} />
                      </>
                    )}

                    {railingItems.length > 0 && order.railings_amount > 0 && (
                      <>
                        <div className="print-summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span>Railings Length Subtotal:</span>
                          <span>{order.railings_subtotal.toFixed(2)} ft</span>
                        </div>
                        <div className="print-summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span><strong>Railings Total Cost:</strong></span>
                          <span><strong>₹{order.railings_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                        </div>
                        <div style={{ width: '320px', height: '1px', backgroundColor: 'var(--color-print-border)', margin: '0.4rem 0' }} />
                      </>
                    )}

                    {fixGolaItems.length > 0 && order.fix_gola_amount > 0 && (
                      <>
                        <div className="print-summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span>Fix Gola Length Subtotal:</span>
                          <span>{order.fix_gola_subtotal.toFixed(2)} ft</span>
                        </div>
                        <div className="print-summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span><strong>Fix Gola Total Cost:</strong></span>
                          <span><strong>₹{order.fix_gola_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                        </div>
                        <div style={{ width: '320px', height: '1px', backgroundColor: 'var(--color-print-border)', margin: '0.4rem 0' }} />
                      </>
                    )}

                    {mouldingItems.length > 0 && order.moulding_amount > 0 && (
                      <>
                        <div className="print-summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span>Moulding Length Subtotal:</span>
                          <span>{order.moulding_subtotal.toFixed(2)} ft</span>
                        </div>
                        <div className="print-summary-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span><strong>Moulding Total Cost:</strong></span>
                          <span><strong>₹{order.moulding_amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                        </div>
                        <div style={{ width: '320px', height: '1px', backgroundColor: 'var(--color-print-border)', margin: '0.4rem 0' }} />
                      </>
                    )}

                    <div className="print-summary-row grand-total" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                      <span>GRAND TOTAL:</span>
                      <span>₹{order.total_value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div style={{ width: '320px', height: '1px', backgroundColor: 'var(--color-print-text)', margin: '0.4rem 0' }} />

                    {order.payment_status === 'paid' ? (
                      <div className="print-summary-row" style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: 800, fontSize: '0.9rem' }}>
                        <span>PAYMENT STATUS:</span>
                        <span>PAID</span>
                      </div>
                    ) : (
                      <>
                        {order.advance_paid > 0 && (
                          <div className="print-summary-row" style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginBottom: '0.25rem' }}>
                            <span>Advance Paid:</span>
                            <span>₹{order.advance_paid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        )}
                        <div className="print-summary-row" style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', fontWeight: 800, fontSize: '0.9rem', borderTop: '1px dashed var(--color-print-border)', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
                          <span>BALANCE DUE:</span>
                          <span>₹{Math.max(0, order.total_value - order.advance_paid).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Notes Block */}
                  {order.notes && (
                    <div className="print-notes" style={{ marginTop: '2rem', borderTop: '1px solid var(--color-print-border)', paddingTop: '1rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0' }}>Order Specifications / Notes</h4>
                      <p style={{ margin: 0 }}>{order.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', backgroundColor: 'var(--color-bg-app)' }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => previewDialogRef.current?.close()}
            >
              Close
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                if (!order) return;
                setPdfGenerating(true);
                setToastMessage('Generating PDF Invoice...');
                try {
                  const result = await window.api.exportOrderPDF(order.id);
                  if (result.success) {
                    showToast(`PDF exported successfully: ${result.path}`);
                    previewDialogRef.current?.close();
                  } else if (result.error !== 'Cancelled') {
                    showToast(`Failed to export PDF: ${result.error}`);
                  } else {
                    setToastMessage('');
                  }
                } catch (err: unknown) {
                  console.error(err);
                  showToast(`Error: ${(err as Error).message}`);
                } finally {
                  setPdfGenerating(false);
                }
              }}
              disabled={pdfGenerating}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
            >
              <FileText size={16} />
              <span>{pdfGenerating ? 'Generating PDF...' : 'Download & Save PDF'}</span>
            </button>
          </div>
        </div>
      </dialog>

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
                if (cat.key === '1') handleAddDoorItem();
                else if (cat.key === '2') handleAddChaukhatItem();
                else if (cat.key === '3') handleAddRailingItem();
                else if (cat.key === '4') handleAddFixGolaItem();
                else if (cat.key === '5') handleAddMouldingItem();
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
    </div>
  );
}
