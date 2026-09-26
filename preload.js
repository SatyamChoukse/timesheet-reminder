const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dogApi', {
  // Reminder window
  init: () => ipcRenderer.invoke('reminder:init'),
  answer: (answer) => ipcRenderer.invoke('reminder:answer', answer),
  fill: () => ipcRenderer.invoke('reminder:fill'),
  snooze: (minutes) => ipcRenderer.invoke('reminder:snooze', minutes),
  close: () => ipcRenderer.send('reminder:close'),
  setIgnoreMouse: (ignore) => ipcRenderer.send('reminder:ignore-mouse', ignore),

  // Settings window
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  getDefaults: () => ipcRenderer.invoke('settings:defaults'),
  testReminder: (level) => ipcRenderer.invoke('settings:test', level),
  testPeek: () => ipcRenderer.invoke('settings:peek'),
  openUrl: (url) => ipcRenderer.invoke('settings:open-url', url),
  chooseSound: () => ipcRenderer.invoke('settings:choose-sound'),
  clearSound: () => ipcRenderer.invoke('settings:clear-sound'),
  getCustomSound: () => ipcRenderer.invoke('settings:custom-sound'),
  getHistory: () => ipcRenderer.invoke('history:get'),
});
