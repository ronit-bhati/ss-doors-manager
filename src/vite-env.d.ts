/* eslint-disable @typescript-eslint/no-explicit-any */
/// <reference types="vite/client" />

interface Window {
  api: {
    addClient: (client: { name: string; phone?: string; address?: string }) => Promise<{ id: number }>;
    getClients: () => Promise<any[]>;
    getClient: (id: number) => Promise<any>;
    updateClient: (id: number, fields: { name: string; phone?: string; address?: string }) => Promise<boolean>;
    deleteClient: (id: number) => Promise<boolean>;

    createOrder: (data: { 
      clientId: number; 
      notes?: string; 
      doorUnit: string; 
      chaukhatUnit: string; 
      railingUnit: string;
      fixGolaUnit: string;
      mouldingUnit: string;
      woodType?: string 
    }) => Promise<{ id: number }>;
    createOrderWithItems: (payload: {
      order: {
        clientId: number;
        notes?: string;
        doorUnit: string;
        chaukhatUnit: string;
        railingUnit: string;
        fixGolaUnit: string;
        mouldingUnit: string;
        woodType?: string;
        doorsExtraLabel?: string;
        doorsExtraRate?: number;
        chaukhatExtraLabel?: string;
        chaukhatExtraRate?: number;
        railingsExtraLabel?: string;
        railingsExtraRate?: number;
        fixGolaExtraLabel?: string;
        fixGolaExtraRate?: number;
        mouldingExtraLabel?: string;
        mouldingExtraRate?: number;
      };
      items: Array<{ item_type: string; label?: string; height: number; width: number; quantity: number; rate: number }>;
    }) => Promise<{ id: number }>;
    getOrdersForClient: (clientId: number) => Promise<any[]>;
    getOrder: (orderId: number) => Promise<any>;
    updateOrderNotes: (orderId: number, notes: string) => Promise<boolean>;
    updateOrderWoodType: (orderId: number, woodType: string) => Promise<boolean>;
    updateOrderStatus: (orderId: number, status: string) => Promise<boolean>;
    updateOrderPaymentDetails: (orderId: number, details: { paymentStatus: string }) => Promise<boolean>;
    updateOrderExtras: (orderId: number, fields: {
      doorsExtraLabel?: string;
      doorsExtraRate?: number;
      chaukhatExtraLabel?: string;
      chaukhatExtraRate?: number;
      railingsExtraLabel?: string;
      railingsExtraRate?: number;
      fixGolaExtraLabel?: string;
      fixGolaExtraRate?: number;
      mouldingExtraLabel?: string;
      mouldingExtraRate?: number;
    }) => Promise<boolean>;
    addOrderPayment: (orderId: number, amount: number, paymentDate: string, notes?: string) => Promise<boolean>;
    deleteOrderPayment: (paymentId: number) => Promise<boolean>;
    addOrderItem: (orderId: number, item: { item_type: string; label?: string; height: number; width: number; quantity: number; rate: number }) => Promise<{ id: number }>;
    updateOrderItem: (itemId: number, fields: { label?: string; height?: number; width?: number; quantity?: number; rate?: number }) => Promise<boolean>;
    deleteOrderItem: (itemId: number) => Promise<boolean>;
    deleteOrder: (orderId: number) => Promise<boolean>;

    getSetting: (key: string) => Promise<string | null>;
    setSetting: (key: string, value: string) => Promise<boolean>;
    getAllSettings: () => Promise<Record<string, string>>;
    backupDatabase: () => Promise<{ success: boolean; path?: string; error?: string }>;
    importDatabase: () => Promise<{ success: boolean; error?: string }>;

    checkLicense: () => Promise<{ success: boolean; machineId: string; error?: string }>;
    activateApp: (code: string) => Promise<{ success: boolean; error?: string }>;

    exportOrderPDF: (orderId: number) => Promise<{ success: boolean; path?: string; error?: string }>;
    printOrder: (orderId: number) => Promise<{ success: boolean; error?: string }>;
    notifyPrintReady: (orderId: number) => Promise<boolean>;

    setZoomFactor: (factor: number) => void;
    getZoomFactor: () => number;
  }
}
