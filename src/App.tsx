import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { TopToolbar } from './components/TopToolbar.tsx';
import { ClientsPage } from './pages/ClientsPage.tsx';
import { NewOrderPage } from './pages/NewOrderPage.tsx';
import { OrderDetailPage } from './pages/OrderDetailPage.tsx';
import { OrderPrintView } from './pages/OrderPrintView.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';

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
  React.useEffect(() => {
    // 1. Initial Zoom configuration
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

    // 2. Keyboard shortcuts for zoom
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
  }, []);

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
