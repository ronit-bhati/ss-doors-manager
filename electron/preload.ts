import { contextBridge, ipcRenderer, webFrame } from 'electron';

// Expose the API to the renderer process safely
contextBridge.exposeInMainWorld('api', {
  // Clients
  addClient: (client: any) => ipcRenderer.invoke('addClient', client),
  getClients: () => ipcRenderer.invoke('getClients'),
  getClient: (id: number) => ipcRenderer.invoke('getClient', id),
  updateClient: (id: number, fields: any) => ipcRenderer.invoke('updateClient', id, fields),
  deleteClient: (id: number) => ipcRenderer.invoke('deleteClient', id),

  // Orders
  createOrder: (data: { clientId: number; notes?: string; doorUnit: string; chaukhatUnit: string }) => 
    ipcRenderer.invoke('createOrder', data),
  getOrdersForClient: (clientId: number) => 
    ipcRenderer.invoke('getOrdersForClient', clientId),
  getOrder: (orderId: number) => 
    ipcRenderer.invoke('getOrder', orderId),
  updateOrderNotes: (orderId: number, notes: string) => 
    ipcRenderer.invoke('updateOrderNotes', orderId, notes),
  updateOrderStatus: (orderId: number, status: string) => 
    ipcRenderer.invoke('updateOrderStatus', orderId, status),
  updateOrderRates: (orderId: number, rates: { doorRate: number; chaukhatRate: number }) => 
    ipcRenderer.invoke('updateOrderRates', orderId, rates),
  addOrderItem: (orderId: number, item: any) => 
    ipcRenderer.invoke('addOrderItem', orderId, item),
  updateOrderItem: (itemId: number, fields: any) => 
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

  // PDF Export
  exportOrderPDF: (orderId: number) => ipcRenderer.invoke('exportOrderPDF', orderId),

  // Zoom
  setZoomFactor: (factor: number) => webFrame.setZoomFactor(factor),
  getZoomFactor: () => webFrame.getZoomFactor()
});
