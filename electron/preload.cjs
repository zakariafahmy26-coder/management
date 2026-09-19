const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: 'windows',
  printReport: (options) => ipcRenderer.invoke('print-report', options),
  saveExcelFile: (payload) => ipcRenderer.invoke('save-excel-file', payload),
});
