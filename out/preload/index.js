"use strict";
const electron = require("electron");
const api = {
  // Settings
  getSetting: (key) => electron.ipcRenderer.invoke("db:getSetting", key),
  setSetting: (key, value) => electron.ipcRenderer.invoke("db:setSetting", key, value),
  getAllSettings: () => electron.ipcRenderer.invoke("db:getAllSettings"),
  // Channel Cache
  getCacheInfo: () => electron.ipcRenderer.invoke("cache:getInfo"),
  getChannelsFromCache: () => electron.ipcRenderer.invoke("cache:getChannels"),
  saveChannelsToCache: (channels) => electron.ipcRenderer.invoke("cache:saveChannels", channels),
  clearChannelsCache: () => electron.ipcRenderer.invoke("cache:clear"),
  // Favorites
  getFavorites: () => electron.ipcRenderer.invoke("db:getFavorites"),
  addFavorite: (channel) => electron.ipcRenderer.invoke("db:addFavorite", channel),
  removeFavorite: (channelId) => electron.ipcRenderer.invoke("db:removeFavorite", channelId),
  isFavorite: (channelId) => electron.ipcRenderer.invoke("db:isFavorite", channelId),
  // History
  getHistory: (limit) => electron.ipcRenderer.invoke("db:getHistory", limit),
  addHistory: (channel) => electron.ipcRenderer.invoke("db:addHistory", channel),
  clearHistory: () => electron.ipcRenderer.invoke("db:clearHistory"),
  // Sources
  getSources: () => electron.ipcRenderer.invoke("db:getSources"),
  addSource: (source) => electron.ipcRenderer.invoke("db:addSource", source),
  removeSource: (id) => electron.ipcRenderer.invoke("db:removeSource", id),
  toggleSource: (id, enabled) => electron.ipcRenderer.invoke("db:toggleSource", id, enabled),
  // Parental Control
  getParentalControl: () => electron.ipcRenderer.invoke("db:getParentalControl"),
  setParentalControl: (data) => electron.ipcRenderer.invoke("db:setParentalControl", data),
  // API
  fetchM3UChannels: () => electron.ipcRenderer.invoke("api:fetchM3UChannels"),
  fetchCountries: () => electron.ipcRenderer.invoke("api:fetchCountries"),
  onM3UProgress: (cb) => {
    const handler = (_, data) => cb(data);
    electron.ipcRenderer.on("api:m3uProgress", handler);
    return () => electron.ipcRenderer.removeListener("api:m3uProgress", handler);
  },
  // M3U
  parseM3UUrl: (url) => electron.ipcRenderer.invoke("m3u:parseUrl", url),
  parseM3UFile: () => electron.ipcRenderer.invoke("m3u:parseFile"),
  // Display
  getScreens: () => electron.ipcRenderer.invoke("display:getScreens"),
  moveToScreen: (displayIndex) => electron.ipcRenderer.invoke("display:moveToScreen", displayIndex),
  // Window
  minimize: () => electron.ipcRenderer.invoke("window:minimize"),
  maximize: () => electron.ipcRenderer.invoke("window:maximize"),
  close: () => electron.ipcRenderer.invoke("window:close"),
  isMaximized: () => electron.ipcRenderer.invoke("window:isMaximized"),
  setFullscreen: (flag) => electron.ipcRenderer.invoke("window:setFullscreen", flag),
  isFullscreen: () => electron.ipcRenderer.invoke("window:isFullscreen"),
  // Chromecast
  discoverCastDevices: () => electron.ipcRenderer.invoke("cast:discover"),
  castToDevice: (deviceId, streamUrl, channelName) => electron.ipcRenderer.invoke("cast:cast", deviceId, streamUrl, channelName),
  // Shell
  openExternal: (url) => electron.ipcRenderer.invoke("shell:openExternal", url),
  // Native notification
  showNotification: (title, body) => electron.ipcRenderer.invoke("notification:show", title, body),
  // Tray channel name
  setCurrentChannel: (channelName) => electron.ipcRenderer.invoke("tray:setChannel", channelName)
};
electron.contextBridge.exposeInMainWorld("electronAPI", api);
