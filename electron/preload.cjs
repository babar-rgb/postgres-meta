const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    connect: (config) => ipcRenderer.invoke('db-connect', config),
    query: (sql, params) => ipcRenderer.invoke('db-query', sql, params),
    apiType: 'electron'
});
