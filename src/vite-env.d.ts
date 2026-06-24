/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="vite/client" />

interface Window {
  api: {
    addClient: (client: { name: string; phone?: string; address?: string }) => Promise<{ id: number }>;
    getClients: () => Promise<any[]>;
    getClient: (id: number) => Promise<any>;
    updateClient: (id: number, fields: { name: string; phone?: string; address?: string }) => Promise<boolean>;
    deleteClient: (id: number) => Promise<boolean>;

    createOrder: (data: { clientId: number; notes?: string; doorUnit: string; chaukhatUnit: string }) => Promise<{ id: number }>;
    getOrdersForClient: (clientId: number) => Promise<any[]>;
    getOrder: (orderId: number) => Promise<any>;
    updateOrderNotes: (orderId: number, notes: string) => Promise<boolean>;
    updateOrderStatus: (orderId: number, status: string) => Promise<boolean>;
    updateOrderRates: (orderId: number, rates: { doorRate: number; chaukhatRate: number }) => Promise<boolean>;
    addOrderItem: (orderId: number, item: { item_type: string; label?: string; height: number; width: number; quantity: number }) => Promise<{ id: number }>;
    updateOrderItem: (itemId: number, fields: { label?: string; height?: number; width?: number; quantity?: number }) => Promise<boolean>;
    deleteOrderItem: (itemId: number) => Promise<boolean>;
    deleteOrder: (orderId: number) => Promise<boolean>;

    getSetting: (key: string) => Promise<string | null>;
    setSetting: (key: string, value: string) => Promise<boolean>;
    getAllSettings: () => Promise<Record<string, string>>;
    backupDatabase: () => Promise<{ success: boolean; path?: string; error?: string }>;

    exportOrderPDF: (orderId: number) => Promise<{ success: boolean; path?: string; error?: string }>;
  }
}
