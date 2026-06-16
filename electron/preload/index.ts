import { contextBridge, ipcRenderer } from 'electron'

const api = {
  // Settings
  getSetting: (key: string) => ipcRenderer.invoke('db:getSetting', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('db:setSetting', key, value),
  getAllSettings: () => ipcRenderer.invoke('db:getAllSettings'),

  // Channel Cache
  getCacheInfo: () => ipcRenderer.invoke('cache:getInfo'),
  getChannelsFromCache: () => ipcRenderer.invoke('cache:getChannels'),
  saveChannelsToCache: (channels: any[]) => ipcRenderer.invoke('cache:saveChannels', channels),
  clearChannelsCache: () => ipcRenderer.invoke('cache:clear'),

  // Favorites
  getFavorites: () => ipcRenderer.invoke('db:getFavorites'),
  addFavorite: (channel: any) => ipcRenderer.invoke('db:addFavorite', channel),
  removeFavorite: (channelId: string) => ipcRenderer.invoke('db:removeFavorite', channelId),
  isFavorite: (channelId: string) => ipcRenderer.invoke('db:isFavorite', channelId),

  // History
  getHistory: (limit?: number) => ipcRenderer.invoke('db:getHistory', limit),
  addHistory: (channel: any) => ipcRenderer.invoke('db:addHistory', channel),
  clearHistory: () => ipcRenderer.invoke('db:clearHistory'),

  // Sources
  getSources: () => ipcRenderer.invoke('db:getSources'),
  addSource: (source: any) => ipcRenderer.invoke('db:addSource', source),
  removeSource: (id: number) => ipcRenderer.invoke('db:removeSource', id),
  toggleSource: (id: number, enabled: boolean) => ipcRenderer.invoke('db:toggleSource', id, enabled),

  // Parental Control
  getParentalControl: () => ipcRenderer.invoke('db:getParentalControl'),
  setParentalControl: (data: any) => ipcRenderer.invoke('db:setParentalControl', data),

  // API
  fetchM3UChannels: () => ipcRenderer.invoke('api:fetchM3UChannels'),
  fetchCountries: () => ipcRenderer.invoke('api:fetchCountries'),
  onM3UProgress: (cb: (data: { loaded: number; total: number; category: string }) => void) => {
    const handler = (_: Electron.IpcRendererEvent, data: any) => cb(data)
    ipcRenderer.on('api:m3uProgress', handler)
    return () => ipcRenderer.removeListener('api:m3uProgress', handler)
  },

  // M3U
  parseM3UUrl: (url: string) => ipcRenderer.invoke('m3u:parseUrl', url),
  parseM3UFile: () => ipcRenderer.invoke('m3u:parseFile'),

  // Display
  getScreens: () => ipcRenderer.invoke('display:getScreens'),
  moveToScreen: (displayIndex: number) => ipcRenderer.invoke('display:moveToScreen', displayIndex),

  // Window
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  setFullscreen: (flag: boolean) => ipcRenderer.invoke('window:setFullscreen', flag),
  isFullscreen: () => ipcRenderer.invoke('window:isFullscreen'),

  // Chromecast
  discoverCastDevices: () => ipcRenderer.invoke('cast:discover'),
  castToDevice: (deviceId: string, streamUrl: string, channelName: string) =>
    ipcRenderer.invoke('cast:cast', deviceId, streamUrl, channelName),

  // Shell
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),

  // Native notification
  showNotification: (title: string, body: string) => ipcRenderer.invoke('notification:show', title, body),

  // Tray channel name
  setCurrentChannel: (channelName: string | null) => ipcRenderer.invoke('tray:setChannel', channelName)
}

contextBridge.exposeInMainWorld('electronAPI', api)
