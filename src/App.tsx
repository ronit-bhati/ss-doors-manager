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
