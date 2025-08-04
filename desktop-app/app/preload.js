const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
  showSaveDialog: (defaultName) => ipcRenderer.invoke('show-save-dialog', defaultName),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),

  // Store operations
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),
  storeClear: () => ipcRenderer.invoke('store-clear'),

  // Menu events
  onMenuImportContacts: (callback) => {
    ipcRenderer.on('menu-import-contacts', callback);
  },
  onMenuExportContacts: (callback) => {
    ipcRenderer.on('menu-export-contacts', callback);
  },

  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
