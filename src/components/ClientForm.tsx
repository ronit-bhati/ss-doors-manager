import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Client {
  id?: number;
  name: string;
  phone: string;
  address: string;
}

interface ClientFormProps {
  client?: Client | null;
  onClose: () => void;
  onSubmit: () => void;
}

export function ClientForm({ client, onClose, onSubmit }: ClientFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (client) {
      setName(client.name);
      setPhone(client.phone || '');
      setAddress(client.address || '');
    } else {
      setName('');
      setPhone('');
      setAddress('');
    }
  }, [client]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Client name is required');
      return;
    }
    
    setError('');
    setSubmitting(true);

    try {
      if (client && client.id) {
        await window.api.updateClient(client.id, { name, phone, address });
      } else {
        await window.api.addClient({ name, phone, address });
      }
      onSubmit();
    } catch (err: unknown) {
      console.error(err);
      setError((err as Error).message || 'Failed to save client');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'contents' }}>
      <div className="dialog-header">
        <h3 className="dialog-title">{client ? 'Edit Client Ledger' : 'Create Customer Record'}</h3>
        <button type="button" className="dialog-close" onClick={onClose} aria-label="Close dialog">
          <X size={18} />
        </button>
      </div>

      {error && (
        <div style={{ color: 'var(--color-rose)', border: '1px solid var(--color-rose)', padding: '0.5rem', marginBottom: '1.25rem', fontSize: '0.8rem', fontFamily: 'var(--font-body)', fontWeight: 700, backgroundColor: 'var(--color-rose-light)' }}>
          [ERROR] {error.toUpperCase()}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="client-name" className="form-label">Client Name *</label>
          <input
            id="client-name"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="E.G. RAJESH KUMAR"
            required
            maxLength={100}
            autoComplete="name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="client-phone" className="form-label">Phone Number</label>
          <input
            id="client-phone"
            type="tel"
            className="form-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="E.G. +91 98765 43210"
            maxLength={20}
            autoComplete="tel"
          />
        </div>

        <div className="form-group">
          <label htmlFor="client-address" className="form-label">Address</label>
          <textarea
            id="client-address"
            className="form-textarea"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="E.G. SHOP NO. 12, MAIN MARKET, SECTOR 5"
            maxLength={300}
            autoComplete="street-address"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Client'}
          </button>
        </div>
      </form>
    </div>
  );
}
