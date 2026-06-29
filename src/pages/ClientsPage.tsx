import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, ChevronRight, User, FolderOpen } from 'lucide-react';
import { ClientForm } from '../components/ClientForm.tsx';

interface Client {
  id: number;
  name: string;
  phone: string;
  address: string;
  created_at: string;
  order_statuses?: string;
  payment_statuses?: string;
}

interface Order {
  id: number;
  client_id: number;
  order_date: string;
  order_status: string;
  payment_status: string;
  advance_paid: number;
  notes: string;
  door_unit: string;
  chaukhat_unit: string;
  railing_unit: string;
  fix_gola_unit: string;
  moulding_unit: string;
  doors_subtotal: number;
  chaukhat_subtotal: number;
  railings_subtotal: number;
  fix_gola_subtotal: number;
  moulding_subtotal: number;
  total_value: number;
}

export function ClientsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingList, setLoadingList] = useState(true);

  // Selected Client details on the right pane
  const [client, setClient] = useState<Client | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [selectedOrderStatus, setSelectedOrderStatus] = useState<string>('all');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('all');

  // Form Modal controls
  const [isEditing, setIsEditing] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  // Fetch client list
  const fetchClients = async () => {
    setLoadingList(true);
    try {
      const data = await window.api.getClients();
      setClients(data);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setLoadingList(false);
    }
  };

  // Fetch selected client detail & orders
  const fetchClientDetails = async (clientIdStr: string) => {
    setLoadingDetail(true);
    try {
      const clientId = parseInt(clientIdStr, 10);
      const clientData = await window.api.getClient(clientId);
      if (!clientData) {
        navigate('/');
        return;
      }
      setClient(clientData);
      const ordersData = await window.api.getOrdersForClient(clientId);
      setOrders(ordersData);
    } catch (err) {
      console.error('Failed to load client details:', err);
      setClient(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (id) {
      fetchClientDetails(id);
    } else {
      setClient(null);
      setOrders([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Keyboard accelerators for Clients page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+N: New client
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openNewClientModal();
      }
      
      if (client) {
        // Alt+E: Edit selected client
        if (e.altKey && e.key.toLowerCase() === 'e') {
          e.preventDefault();
          openEditClientModal();
        }
        // Alt+O: New order
        if (e.altKey && e.key.toLowerCase() === 'o') {
          e.preventDefault();
          navigate(`/client/${client.id}/order/new`);
        }
        // Alt+D: Delete client
        if (e.altKey && e.key.toLowerCase() === 'd') {
          e.preventDefault();
          handleDeleteClient();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, navigate]);

  const openNewClientModal = () => {
    setIsEditing(false);
    setModalKey(prev => prev + 1);
    dialogRef.current?.showModal();
  };

  const openEditClientModal = () => {
    setIsEditing(true);
    setModalKey(prev => prev + 1);
    dialogRef.current?.showModal();
  };

  const handleFormSubmit = () => {
    dialogRef.current?.close();
    fetchClients();
    if (id) {
      fetchClientDetails(id);
    }
  };

  const handleDeleteClient = async () => {
    if (!client) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${client.name}? This will permanently delete the client and ALL of their orders.`
    );
    if (confirmDelete) {
      try {
        await window.api.deleteClient(client.id);
        navigate('/');
        fetchClients();
      } catch (err) {
        console.error('Failed to delete client:', err);
        alert('Failed to delete client.');
      }
    }
  };

  const filteredClients = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return clients.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(term) ||
        (c.phone && c.phone.includes(searchTerm));
      if (!matchesSearch) return false;

      if (selectedOrderStatus !== 'all') {
        const statuses = c.order_statuses ? c.order_statuses.split(',') : [];
        if (!statuses.includes(selectedOrderStatus)) return false;
      }

      if (selectedPaymentStatus !== 'all') {
        const statuses = c.payment_statuses ? c.payment_statuses.split(',') : [];
        if (!statuses.includes(selectedPaymentStatus)) return false;
      }

      return true;
    });
  }, [clients, searchTerm, selectedOrderStatus, selectedPaymentStatus]);

  return (
    <div className="split-pane">
      {/* LEFT PANE: Client List & Search */}
      <div className="pane-left">
        <div className="pane-left-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-body)', textTransform: 'uppercase' }}>Clients</h2>
            <button className="btn btn-primary" onClick={openNewClientModal}>
              <Plus size={16} />
              <span>New Client</span>
              <kbd style={{ marginLeft: '0.375rem', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '0.65rem', padding: '0.05rem 0.25rem' }}>Alt+N</kbd>
            </button>
          </div>
          <div className="pane-left-search" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
            <input
              type="text"
              placeholder="Filter by name or phone..."
              className="pane-left-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '0.4rem', width: '100%', alignItems: 'center' }}>
              <select
                className="form-select"
                style={{ flex: 1, minWidth: 0, fontSize: '0.7rem', padding: '0.25rem 0.4rem', height: '30px', minHeight: 'auto', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--border-radius)', textOverflow: 'ellipsis' }}
                value={selectedOrderStatus}
                onChange={(e) => setSelectedOrderStatus(e.target.value)}
                aria-label="Filter by order status"
              >
                <option value="all">ALL ORDERS</option>
                <option value="pending">PENDING</option>
                <option value="in_progress">IN PROGRESS</option>
                <option value="completed">COMPLETED</option>
                <option value="delivered">DELIVERED</option>
              </select>
              <select
                className="form-select"
                style={{ flex: 1, minWidth: 0, fontSize: '0.7rem', padding: '0.25rem 0.4rem', height: '30px', minHeight: 'auto', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--border-radius)', textOverflow: 'ellipsis' }}
                value={selectedPaymentStatus}
                onChange={(e) => setSelectedPaymentStatus(e.target.value)}
                aria-label="Filter by payment status"
              >
                <option value="all">ALL PAYMENTS</option>
                <option value="pending">PENDING</option>
                <option value="paid">PAID</option>
              </select>
            </div>
            {(searchTerm !== '' || selectedOrderStatus !== 'all' || selectedPaymentStatus !== 'all') && (
              <button
                type="button"
                className="btn btn-outline"
                style={{ width: '100%', height: '28px', minHeight: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginTop: '0.125rem' }}
                onClick={() => {
                  setSearchTerm('');
                  setSelectedOrderStatus('all');
                  setSelectedPaymentStatus('all');
                }}
              >
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        </div>

        <div className="pane-left-list">
          {loadingList ? (
            <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              [ LOADING... ]
            </div>
          ) : clients.length === 0 ? (
            <div className="empty-state" style={{ margin: '2rem auto', border: 'none', backgroundColor: 'transparent', padding: '1rem', textAlign: 'center' }}>
              <User size={32} style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }} />
              <h4 className="empty-state-title" style={{ fontSize: '0.85rem' }}>No Customers</h4>
              <p style={{ fontSize: '0.75rem', marginBottom: '0.75rem', lineHeight: '1.3' }}>Create a client to start recording order sheets.</p>
              <button className="btn btn-primary" onClick={openNewClientModal} style={{ padding: '0.375rem 0.75rem', fontSize: '0.75rem', margin: 'auto' }}>
                <Plus size={14} />
                <span>Add Client</span>
              </button>
            </div>
          ) : filteredClients.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              No clients found
            </div>
          ) : (
            filteredClients.map((c) => (
              <Link
                to={`/client/${c.id}`}
                key={c.id}
                className={`client-list-item ${client?.id === c.id ? 'active' : ''}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                  <div className="profile-avatar">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="client-list-item-title">{c.name.toUpperCase()}</div>
                    <div className="client-list-item-meta">
                      {c.phone ? c.phone : 'NO TELEPHONE'}
                    </div>
                  </div>
                </div>
                <div style={{ color: client?.id === c.id ? 'inherit' : 'var(--color-text-muted)' }}>
                  <ChevronRight size={16} />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANE: Selected Client Detail & Order History */}
      <div className="pane-right">
        {loadingDetail ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1, fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
            [ RETRIEVING HISTORY... ]
          </div>
        ) : !client ? (
          <div className="empty-state" style={{ margin: 'auto', border: 'none', backgroundColor: 'transparent' }}>
            <User size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }} />
            <h3 className="empty-state-title">No Customer Selected</h3>
            <p>Select a customer record from the left list sidebar to display their details, rates, and past order history sheets.</p>
          </div>
        ) : (
          <div className="page-container">
            {/* Client profile card header */}
            <div className="card-el" style={{ gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div className="profile-avatar" style={{ width: '48px', height: '48px', fontSize: '1.25rem' }}>
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="page-title" style={{ fontSize: '1.25rem', fontFamily: 'var(--font-body)' }}>{client.name.toUpperCase()}</h1>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}>
                      REGISTRATION ID: #{client.id} | DATE: {new Date(client.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Link to={`/client/${client.id}/order/new`} className="btn btn-primary">
                    <Plus size={16} />
                    <span>New Order</span>
                    <kbd style={{ marginLeft: '0.375rem', border: '1px solid rgba(255,255,255,0.2)', backgroundColor: 'rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '0.65rem', padding: '0.05rem 0.25rem' }}>Alt+O</kbd>
                  </Link>
                  <button className="btn btn-outline" onClick={openEditClientModal}>
                    <Edit size={16} />
                    <span>Edit Client</span>
                    <kbd style={{ marginLeft: '0.375rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-app)', color: 'var(--color-text-secondary)', fontSize: '0.65rem', padding: '0.05rem 0.25rem' }}>Alt+E</kbd>
                  </button>
                  <button className="btn btn-danger" onClick={handleDeleteClient} aria-label="Delete client record">
                    <Trash2 size={16} />
                    <span>Delete Client</span>
                    <kbd style={{ marginLeft: '0.375rem', border: '1px solid currentColor', backgroundColor: 'transparent', color: 'inherit', fontSize: '0.65rem', padding: '0.05rem 0.25rem' }}>Alt+D</kbd>
                  </button>
                </div>
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '0.5rem 0' }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', fontFamily: 'var(--font-body)', fontSize: '0.85rem' }}>
                <div style={{ borderRight: '1px solid var(--color-border)', paddingRight: '1rem' }}>
                  <div style={{ fontSize: '0.725rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>TELEPHONE</div>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{client.phone || 'NO RECORD'}</span>
                </div>
                <div>
                  <div style={{ fontSize: '0.725rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>ADDRESS</div>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{client.address || 'NO RECORD'}</span>
                </div>
              </div>
            </div>

            {/* Order history list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, fontFamily: 'var(--font-body)', textTransform: 'uppercase', color: 'var(--color-text-primary)' }}>
                Order History
              </h3>

              {orders.length === 0 ? (
                <div className="empty-state">
                  <FolderOpen size={40} style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }} />
                  <h4 className="empty-state-title">No Orders Registered</h4>
                  <p>There are no measurements sheets registered for this client. Create a new order to get started.</p>
                  <Link to={`/client/${client.id}/order/new`} className="btn btn-primary" style={{ marginTop: '0.25rem' }}>
                    <Plus size={16} />
                    <span>Create First Order</span>
                  </Link>
                </div>
              ) : (
                <div className="table-container">
                  <table className="table-el">
                    <thead>
                      <tr>
                        <th>Order ID</th>
                        <th>Order Date</th>
                        <th>Order Status</th>
                        <th>Payment Status</th>
                        <th>Unit</th>
                        <th style={{ textAlign: 'right' }}>Grand Total</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o) => (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 700 }}>#{o.id}</td>
                          <td>{new Date(o.order_date).toLocaleDateString()}</td>
                          <td>
                            <span className={`badge badge-${o.order_status}`}>
                              {o.order_status.replace('_', ' ')}
                            </span>
                          </td>
                          <td>
                            <span className={`badge badge-${o.payment_status}`}>
                              {o.payment_status.replace('_', ' ')}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', lineHeight: 1.3 }}>
                            <div>D: <span style={{ textTransform: 'capitalize' }}>{o.door_unit}</span></div>
                            <div>C: <span style={{ textTransform: 'capitalize' }}>{o.chaukhat_unit}</span></div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-emerald)' }}>
                            ₹{o.total_value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <Link to={`/order/${o.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                              <span>Open Sheet</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Dialog for New/Edit Client */}
      <dialog ref={dialogRef}>
        <ClientForm
          key={modalKey}
          client={isEditing ? client : null}
          onClose={() => dialogRef.current?.close()}
          onSubmit={handleFormSubmit}
        />
      </dialog>
    </div>
  );
}
