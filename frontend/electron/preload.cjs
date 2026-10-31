const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('railscopeDesktop', {
  platform: process.platform,
  isElectron: true,
});

