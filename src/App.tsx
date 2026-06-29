import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { TopToolbar } from './components/TopToolbar.tsx';
import { ClientsPage } from './pages/ClientsPage.tsx';
import { NewOrderPage } from './pages/NewOrderPage.tsx';
import { OrderDetailPage } from './pages/OrderDetailPage.tsx';
import { OrderPrintView } from './pages/OrderPrintView.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { ActivationPage } from './pages/ActivationPage.tsx';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopToolbar />
      <div className="app-content-wrapper">
        <main className="main-content" style={{ flexGrow: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </div>
    </>
  );
}

export default function App() {
  const [isActivated, setIsActivated] = React.useState<boolean | null>(null);
  const [machineId, setMachineId] = React.useState<string>('');
  const isElectronRuntime = typeof window !== 'undefined' && Boolean(window.api);

  React.useEffect(() => {
    if (!isElectronRuntime) return;

    // 1. Check license status on startup
    window.api.checkLicense().then((res) => {
      setIsActivated(res.success);
      setMachineId(res.machineId);
    }).catch((err) => {
      console.error("License check error:", err);
      setIsActivated(false);
      setMachineId("ERROR-FETCHING-ID");
    });

    // 2. Initial Zoom configuration
    const isPrintRoute = window.location.hash.includes('/print/') || window.location.pathname.includes('/print/');
    if (isPrintRoute) {
      window.api.setZoomFactor(1.0);
      return;
    }

    let currentZoom = 1.0;
    window.api.getSetting('zoom_factor').then((val) => {
      if (val) {
        currentZoom = parseFloat(val);
        window.api.setZoomFactor(currentZoom);
      }
    });

    // 3. Keyboard shortcuts for zoom
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;

      const zoomSteps = [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5];
      let newZoom = currentZoom;

      if (e.key === '=' || e.key === '+' || e.code === 'NumpadAdd') {
        e.preventDefault();
        // Zoom in
        const currentIndex = zoomSteps.indexOf(Number(currentZoom.toFixed(1)));
        if (currentIndex !== -1 && currentIndex < zoomSteps.length - 1) {
          newZoom = zoomSteps[currentIndex + 1];
        } else if (currentZoom < 1.5) {
          newZoom = Math.min(1.5, currentZoom + 0.1);
        }
      } else if (e.key === '-' || e.code === 'NumpadSubtract') {
        e.preventDefault();
        // Zoom out
        const currentIndex = zoomSteps.indexOf(Number(currentZoom.toFixed(1)));
        if (currentIndex !== -1 && currentIndex > 0) {
          newZoom = zoomSteps[currentIndex - 1];
        } else if (currentZoom > 0.8) {
          newZoom = Math.max(0.8, currentZoom - 0.1);
        }
      } else if (e.key === '0' || e.code === 'Numpad0') {
        e.preventDefault();
        // Reset zoom
        newZoom = 1.0;
      } else {
        return;
      }

      if (newZoom !== currentZoom) {
        currentZoom = parseFloat(newZoom.toFixed(1));
        window.api.setZoomFactor(currentZoom);
        await window.api.setSetting('zoom_factor', String(currentZoom));
        window.dispatchEvent(new CustomEvent('zoom-changed', { detail: currentZoom }));
      }
    };

    const handleZoomChangedExternally = (e: Event) => {
      const customEvent = e as CustomEvent;
      currentZoom = customEvent.detail;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('zoom-changed', handleZoomChangedExternally);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('zoom-changed', handleZoomChangedExternally);
    };
  }, [isElectronRuntime]);

  if (!isElectronRuntime) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--color-bg-app)',
        color: 'var(--color-text-primary)',
        fontFamily: 'var(--font-display)',
        fontSize: '0.875rem',
        padding: '1rem',
        textAlign: 'center'
      }}>
        SS Doors Manager is an Electron desktop app. Use npm run dev and work in the app window.
      </div>
    );
  }

  // Show a quiet loading state during startup check
  if (isActivated === null) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--color-bg-app)',
        color: 'var(--color-text-secondary)',
        fontFamily: 'var(--font-display)',
        fontSize: '0.875rem'
      }}>
        Initializing SS Doors Ledger...
      </div>
    );
  }

  // Block screen with activation UI if not licensed
  if (!isActivated) {
    return <ActivationPage machineId={machineId} onActivated={() => setIsActivated(true)} />;
  }

  return (
    <Routes>
      {/* Printable Route (Hidden Window for PDF generation) */}
      <Route path="/print/order/:id" element={<OrderPrintView />} />

      {/* Interactive App Routes with Sidebar */}
      <Route path="/" element={<Layout><ClientsPage /></Layout>} />
      <Route path="/client/:id" element={<Layout><ClientsPage /></Layout>} />
      <Route path="/client/:id/order/new" element={<Layout><NewOrderPage /></Layout>} />
      <Route path="/order/:id" element={<Layout><OrderDetailPage /></Layout>} />
      <Route path="/settings" element={<Layout><SettingsPage /></Layout>} />
    </Routes>
  );
}
