import React from 'react';
import { ShieldAlert, Key, Copy, Check, Database, RefreshCw } from 'lucide-react';

interface ActivationPageProps {
  machineId: string;
  onActivated: () => void;
}

export function ActivationPage({ machineId, onActivated }: ActivationPageProps) {
  const [code, setCode] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const getErrorMessage = (err: unknown, fallback: string) => {
    return err instanceof Error ? err.message : fallback;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(machineId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await window.api.activateApp(code.trim());
      if (result.success) {
        onActivated();
      } else {
        setError(result.error || 'Invalid Activation Code.');
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'An error occurred during activation.'));
    } finally {
      setLoading(false);
    }
  };

  const handleImportBackup = async () => {
    if (importing) return;
    
    const confirmImport = window.confirm(
      "Are you sure you want to import a database backup?\n\nWARNING: This will replace all current data. This action cannot be undone."
    );
    
    if (!confirmImport) return;

    setImporting(true);
    setError(null);

    try {
      const result = await window.api.importDatabase();
      if (result.success) {
        alert("Database backup restored successfully! The application will now reload to apply the data.");
        window.location.reload();
      } else {
        setError(result.error || "Failed to import database backup.");
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, "An error occurred during database import."));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="activation-screen-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100vw',
      height: '100vh',
      backgroundColor: 'var(--color-bg-app)',
      padding: '24px',
      overflow: 'auto'
    }}>
      <div className="activation-card" style={{
        width: '100%',
        maxWidth: '520px',
        backgroundColor: 'var(--color-bg-surface)',
        borderRadius: 'var(--border-radius-lg)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-dialog)',
        padding: '36px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        {/* Header Icon */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-accent-amber-light)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          color: 'var(--color-accent-amber)'
        }}>
          <Key size={32} />
        </div>

        {/* Header Text */}
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.25rem',
          fontWeight: 700,
          color: 'var(--color-text-primary)',
          textAlign: 'center',
          marginBottom: '8px'
        }}>
          SS Doors Manager
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--color-text-secondary)',
          textAlign: 'center',
          marginBottom: '28px',
          lineHeight: '1.5'
        }}>
          This software is locked to this computer. Please complete the one-time activation to unlock it.
        </p>

        {/* Step 1: Display Machine ID */}
        <div style={{ width: '100%', marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: 'var(--color-text-secondary)',
            marginBottom: '8px',
            letterSpacing: '0.05em'
          }}>
            1. Your Machine ID
          </label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--color-bg-app)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--border-radius)',
            padding: '4px 8px 4px 16px',
            gap: '8px'
          }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              letterSpacing: '0.05em',
              flexGrow: 1,
              userSelect: 'all'
            }}>
              {machineId}
            </span>
            <button
              onClick={handleCopy}
              title="Copy Machine ID"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: copied ? 'var(--color-emerald)' : 'var(--color-text-secondary)',
                padding: '8px',
                borderRadius: 'var(--border-radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition-fast)',
                backgroundColor: copied ? 'var(--color-emerald-light)' : 'transparent'
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <span style={{
            display: 'block',
            fontSize: '0.75rem',
            color: 'var(--color-text-secondary)',
            marginTop: '6px'
          }}>
            Copy this ID and share it with the developer to get your Activation Code.
          </span>
        </div>

        {/* Step 2: Enter Code Form */}
        <form onSubmit={handleActivate} style={{ width: '100%', marginBottom: '24px' }}>
          <label htmlFor="activationCode" style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: 'var(--color-text-secondary)',
            marginBottom: '8px',
            letterSpacing: '0.05em'
          }}>
            2. Enter Activation Code
          </label>
          <input
            id="activationCode"
            type="text"
            placeholder="XXXX-XXXX"
            value={code}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
            disabled={loading}
            autoFocus
            autoComplete="off"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontFamily: 'var(--font-display)',
              fontSize: '1.125rem',
              fontWeight: 600,
              textAlign: 'center',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              backgroundColor: 'var(--color-bg-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--border-radius)',
              color: 'var(--color-text-primary)',
              marginBottom: '16px',
              outline: 'none',
              transition: 'var(--transition-fast)'
            }}
            onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
              e.target.style.borderColor = 'var(--color-accent-amber)';
              e.target.style.boxShadow = '0 0 0 2px var(--color-accent-amber-light)';
            }}
            onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
              e.target.style.borderColor = 'var(--color-border)';
              e.target.style.boxShadow = 'none';
            }}
          />

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              backgroundColor: 'var(--color-rose-light)',
              border: '1px solid var(--color-rose)',
              borderRadius: 'var(--border-radius)',
              padding: '12px 16px',
              color: 'var(--color-rose)',
              fontSize: '0.8125rem',
              marginBottom: '16px',
              lineHeight: '1.4'
            }}>
              <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            style={{
              width: '100%',
              padding: '12px 24px',
              backgroundColor: 'var(--color-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--border-radius)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: (loading || !code.trim()) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'var(--transition-fast)',
              opacity: !code.trim() ? 0.6 : 1
            }}
            onMouseOver={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (code.trim() && !loading) {
                e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
              }
            }}
            onMouseOut={(e: React.MouseEvent<HTMLButtonElement>) => {
              if (code.trim() && !loading) {
                e.currentTarget.style.backgroundColor = 'var(--color-primary)';
              }
            }}
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Verifying Code...
              </>
            ) : (
              'Activate Software'
            )}
          </button>
        </form>

        {/* Divider */}
        <div style={{
          width: '100%',
          height: '1px',
          backgroundColor: 'var(--color-border)',
          margin: '12px 0 24px 0'
        }} />

        {/* Restore Backup Section */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            fontSize: '0.8125rem',
            color: 'var(--color-text-secondary)'
          }}>
            Restoring data from a previous computer?
          </span>
          <button
            onClick={handleImportBackup}
            disabled={importing}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-accent-amber)',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: 'var(--border-radius-sm)',
              transition: 'var(--transition-fast)'
            }}
            onMouseOver={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseOut={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.textDecoration = 'none'}
          >
            <Database size={16} />
            {importing ? 'Importing Backup...' : 'Import Database Backup'}
          </button>
        </div>
      </div>
      
      {/* Dynamic Keyframes inject for Spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
