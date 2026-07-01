import { contextBridge, ipcRenderer, webFrame } from 'electron';

type ClientInput = { name: string; phone?: string; address?: string };
type OrderItemInput = { item_type: string; label?: string; height: number; width: number; quantity: number; rate: number };

// Expose the API to the renderer process safely
contextBridge.exposeInMainWorld('api', {
  // Clients
  addClient: (client: ClientInput) => ipcRenderer.invoke('addClient', client),
  getClients: () => ipcRenderer.invoke('getClients'),
  getClient: (id: number) => ipcRenderer.invoke('getClient', id),
  updateClient: (id: number, fields: ClientInput) => ipcRenderer.invoke('updateClient', id, fields),
  deleteClient: (id: number) => ipcRenderer.invoke('deleteClient', id),

  // Orders
  createOrder: (data: { 
    clientId: number; 
    notes?: string; 
    doorUnit: string; 
    chaukhatUnit: string; 
    railingUnit: string;
    fixGolaUnit: string;
    mouldingUnit: string;
    woodType?: string 
  }) => 
    ipcRenderer.invoke('createOrder', data),
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
    items: OrderItemInput[];
  }) =>
    ipcRenderer.invoke('createOrderWithItems', payload),
  getOrdersForClient: (clientId: number) => 
    ipcRenderer.invoke('getOrdersForClient', clientId),
  getOrder: (orderId: number) => 
    ipcRenderer.invoke('getOrder', orderId),
  updateOrderNotes: (orderId: number, notes: string) => 
    ipcRenderer.invoke('updateOrderNotes', orderId, notes),
  updateOrderWoodType: (orderId: number, woodType: string) => 
    ipcRenderer.invoke('updateOrderWoodType', orderId, woodType),
  updateOrderStatus: (orderId: number, status: string) => 
    ipcRenderer.invoke('updateOrderStatus', orderId, status),
  updateOrderPaymentDetails: (orderId: number, details: { paymentStatus: string }) => 
    ipcRenderer.invoke('updateOrderPaymentDetails', orderId, details),
  updateOrderExtras: (orderId: number, fields: any) => 
    ipcRenderer.invoke('updateOrderExtras', orderId, fields),
  addOrderPayment: (orderId: number, amount: number, paymentDate: string, notes?: string) => 
    ipcRenderer.invoke('addOrderPayment', orderId, amount, paymentDate, notes),
  deleteOrderPayment: (paymentId: number) => 
    ipcRenderer.invoke('deleteOrderPayment', paymentId),
  addOrderItem: (orderId: number, item: OrderItemInput) => 
    ipcRenderer.invoke('addOrderItem', orderId, item),
  updateOrderItem: (itemId: number, fields: Partial<OrderItemInput>) => 
    ipcRenderer.invoke('updateOrderItem', itemId, fields),
  deleteOrderItem: (itemId: number) => 
    ipcRenderer.invoke('deleteOrderItem', itemId),
  deleteOrder: (orderId: number) => 
    ipcRenderer.invoke('deleteOrder', orderId),

  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('getSetting', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('setSetting', key, value),
  getAllSettings: () => ipcRenderer.invoke('getAllSettings'),
  backupDatabase: () => ipcRenderer.invoke('backupDatabase'),
  importDatabase: () => ipcRenderer.invoke('importDatabase'),

  // Licensing
  checkLicense: () => ipcRenderer.invoke('checkLicense'),
  activateApp: (code: string) => ipcRenderer.invoke('activateApp', code),

  // PDF Export
  exportOrderPDF: (orderId: number) => ipcRenderer.invoke('exportOrderPDF', orderId),
  notifyPrintReady: (orderId: number) => ipcRenderer.invoke('printRouteReady', orderId),

  // Zoom
  setZoomFactor: (factor: number) => webFrame.setZoomFactor(factor),
  getZoomFactor: () => webFrame.getZoomFactor()
});
