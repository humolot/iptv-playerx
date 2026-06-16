import { ipcMain, dialog, screen, BrowserWindow, shell, Notification } from 'electron'
import https from 'https'
import http from 'http'
import fs from 'fs'
import { dbOps } from './db'
import { parseM3U } from './m3u-parser'
import { discoverCastDevices, castToDevice } from './cast'

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*'
      },
      timeout: 30000
    }, (res) => {
      let data = ''
      if (res.statusCode === 301 || res.statusCode === 302) {
        if (res.headers.location) return fetchUrl(res.headers.location).then(resolve).catch(reject)
      }
      res.setEncoding('utf8')
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  // ── Settings ──────────────────────────────────────────────────────────────
  ipcMain.handle('db:getSetting', (_, key: string) => dbOps.getSetting(key))
  ipcMain.handle('db:setSetting', (_, key: string, value: string) => { dbOps.setSetting(key, value) })
  ipcMain.handle('db:getAllSettings', () => dbOps.getAllSettings())

  // ── Favorites ─────────────────────────────────────────────────────────────
  ipcMain.handle('db:getFavorites', () => dbOps.getFavorites())
  ipcMain.handle('db:addFavorite', (_, channel) => dbOps.addFavorite(channel))
  ipcMain.handle('db:removeFavorite', (_, channelId: string) => dbOps.removeFavorite(channelId))
  ipcMain.handle('db:isFavorite', (_, channelId: string) => dbOps.isFavorite(channelId))

  // ── History ───────────────────────────────────────────────────────────────
  ipcMain.handle('db:getHistory', (_, limit?: number) => dbOps.getHistory(limit))
  ipcMain.handle('db:addHistory', (_, channel) => dbOps.addHistory(channel))
  ipcMain.handle('db:clearHistory', () => dbOps.clearHistory())

  // ── Sources ───────────────────────────────────────────────────────────────
  ipcMain.handle('db:getSources', () => dbOps.getSources())
  ipcMain.handle('db:addSource', (_, source) => dbOps.addSource(source))
  ipcMain.handle('db:removeSource', (_, id: number) => dbOps.removeSource(id))
  ipcMain.handle('db:toggleSource', (_, id: number, enabled: boolean) => dbOps.toggleSource(id, enabled))

  // ── Parental Control ──────────────────────────────────────────────────────
  ipcMain.handle('db:getParentalControl', () => dbOps.getParentalControl())
  ipcMain.handle('db:setParentalControl', (_, data) => dbOps.setParentalControl(data))

  // ── Channel Cache ─────────────────────────────────────────────────────────
  ipcMain.handle('cache:getInfo', () => dbOps.getCacheInfo())
  ipcMain.handle('cache:getChannels', () => dbOps.getChannelsFromCache())
  ipcMain.handle('cache:saveChannels', (_, channels: any[]) => dbOps.saveChannelsToCache(channels))
  ipcMain.handle('cache:clear', () => dbOps.clearChannelsCache())

  // ── IPTV-ORG M3U Category Playlists ──────────────────────────────────────
  const M3U_CATEGORIES = [
    { name: 'Animation',    url: 'https://iptv-org.github.io/iptv/categories/animation.m3u' },
    { name: 'Auto',         url: 'https://iptv-org.github.io/iptv/categories/auto.m3u' },
    { name: 'Business',     url: 'https://iptv-org.github.io/iptv/categories/business.m3u' },
    { name: 'Classic',      url: 'https://iptv-org.github.io/iptv/categories/classic.m3u' },
    { name: 'Comedy',       url: 'https://iptv-org.github.io/iptv/categories/comedy.m3u' },
    { name: 'Cooking',      url: 'https://iptv-org.github.io/iptv/categories/cooking.m3u' },
    { name: 'Culture',      url: 'https://iptv-org.github.io/iptv/categories/culture.m3u' },
    { name: 'Documentary',  url: 'https://iptv-org.github.io/iptv/categories/documentary.m3u' },
    { name: 'Education',    url: 'https://iptv-org.github.io/iptv/categories/education.m3u' },
    { name: 'Entertainment',url: 'https://iptv-org.github.io/iptv/categories/entertainment.m3u' },
    { name: 'Family',       url: 'https://iptv-org.github.io/iptv/categories/family.m3u' },
    { name: 'Kids',         url: 'https://iptv-org.github.io/iptv/categories/kids.m3u' },
    { name: 'Legislative',  url: 'https://iptv-org.github.io/iptv/categories/legislative.m3u' },
    { name: 'Lifestyle',    url: 'https://iptv-org.github.io/iptv/categories/lifestyle.m3u' },
    { name: 'Movies',       url: 'https://iptv-org.github.io/iptv/categories/movies.m3u' },
    { name: 'Music',        url: 'https://iptv-org.github.io/iptv/categories/music.m3u' },
    { name: 'News',         url: 'https://iptv-org.github.io/iptv/categories/news.m3u' },
    { name: 'Outdoor',      url: 'https://iptv-org.github.io/iptv/categories/outdoor.m3u' },
    { name: 'Public',       url: 'https://iptv-org.github.io/iptv/categories/public.m3u' },
    { name: 'Relax',        url: 'https://iptv-org.github.io/iptv/categories/relax.m3u' },
    { name: 'Religious',    url: 'https://iptv-org.github.io/iptv/categories/religious.m3u' },
    { name: 'Science',      url: 'https://iptv-org.github.io/iptv/categories/science.m3u' },
    { name: 'Series',       url: 'https://iptv-org.github.io/iptv/categories/series.m3u' },
    { name: 'Shop',         url: 'https://iptv-org.github.io/iptv/categories/shop.m3u' },
    { name: 'Sports',       url: 'https://iptv-org.github.io/iptv/categories/sports.m3u' },
    { name: 'Travel',       url: 'https://iptv-org.github.io/iptv/categories/travel.m3u' },
    { name: 'Weather',      url: 'https://iptv-org.github.io/iptv/categories/weather.m3u' },
    { name: 'General',      url: 'https://iptv-org.github.io/iptv/categories/general.m3u' },
    { name: 'Undefined',    url: 'https://iptv-org.github.io/iptv/categories/undefined.m3u' },
  ]

  ipcMain.handle('api:fetchM3UChannels', async () => {
    const total = M3U_CATEGORIES.length
    let loaded = 0

    // Concurrency-limited parallel fetch (8 at a time)
    async function fetchCategory(cat: { name: string; url: string }): Promise<any[]> {
      try {
        const content = await fetchUrl(cat.url)
        const channels = parseM3U(content)
        loaded++
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('api:m3uProgress', { loaded, total, category: cat.name })
        }
        return channels
      } catch (err: any) {
        loaded++
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('api:m3uProgress', { loaded, total, category: cat.name })
        }
        console.warn(`[m3u] Failed to fetch ${cat.name}:`, err.message)
        return []
      }
    }

    const CONCURRENCY = 8
    const results: any[][] = new Array(M3U_CATEGORIES.length)
    let idx = 0
    async function worker() {
      while (idx < M3U_CATEGORIES.length) {
        const i = idx++
        results[i] = await fetchCategory(M3U_CATEGORIES[i])
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))

    // Deduplicate by URL (some channels appear in multiple categories)
    const seen = new Set<string>()
    const allChannels: any[] = []
    for (const batch of results) {
      for (const ch of batch) {
        if (!seen.has(ch.url)) {
          seen.add(ch.url)
          allChannels.push(ch)
        }
      }
    }

    console.log(`[m3u] Fetched ${allChannels.length} unique channels from ${total} categories`)

    // Save to SQLite here in main process — avoids sending 12k objects back to renderer for saving
    try {
      dbOps.saveChannelsToCache(allChannels)
      console.log('[m3u] Saved to SQLite cache')
    } catch (err: any) {
      console.error('[m3u] Cache save failed:', err.message)
    }

    return { channels: allChannels }
  })

  ipcMain.handle('api:fetchCountries', async () => {
    try {
      const data = await fetchUrl('https://iptv-org.github.io/api/countries.json')
      return JSON.parse(data)
    } catch {
      return []
    }
  })

  // ── M3U Parsing ───────────────────────────────────────────────────────────
  ipcMain.handle('m3u:parseUrl', async (_, url: string) => {
    try {
      const content = await fetchUrl(url)
      return parseM3U(content)
    } catch (err: any) {
      throw new Error(`Failed to parse M3U from URL: ${err.message}`)
    }
  })

  ipcMain.handle('m3u:parseFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open M3U Playlist',
      filters: [
        { name: 'M3U Playlists', extensions: ['m3u', 'm3u8', 'txt'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    if (result.canceled || !result.filePaths.length) return null
    const content = fs.readFileSync(result.filePaths[0], 'utf8')
    return { channels: parseM3U(content), filePath: result.filePaths[0] }
  })

  // ── Display / Screen ──────────────────────────────────────────────────────
  ipcMain.handle('display:getScreens', () => {
    return screen.getAllDisplays().map((d, i) => ({
      id: d.id,
      index: i,
      label: `Display ${i + 1} (${d.size.width}x${d.size.height})`,
      width: d.size.width,
      height: d.size.height,
      isPrimary: d.id === screen.getPrimaryDisplay().id,
      scaleFactor: d.scaleFactor
    }))
  })

  ipcMain.handle('display:moveToScreen', (_, displayIndex: number) => {
    const displays = screen.getAllDisplays()
    const target = displays[displayIndex] || displays[0]
    if (target) {
      mainWindow.setBounds({
        x: target.bounds.x,
        y: target.bounds.y,
        width: mainWindow.getBounds().width,
        height: mainWindow.getBounds().height
      })
    }
  })

  // ── Window Controls ───────────────────────────────────────────────────────
  ipcMain.handle('window:minimize', () => mainWindow.minimize())
  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  })
  ipcMain.handle('window:close', () => mainWindow.close())
  ipcMain.handle('window:isMaximized', () => mainWindow.isMaximized())
  ipcMain.handle('window:setFullscreen', (_, flag: boolean) => mainWindow.setFullScreen(flag))
  ipcMain.handle('window:isFullscreen', () => mainWindow.isFullScreen())

  // ── Chromecast ────────────────────────────────────────────────────────────
  ipcMain.handle('cast:discover', async () => {
    return await discoverCastDevices(5000)
  })

  ipcMain.handle('cast:cast', async (_, deviceId: string, streamUrl: string, channelName: string) => {
    const devices = await discoverCastDevices(2000)
    const device = devices.find(d => d.id === deviceId)
    if (!device) return false
    return await castToDevice(device, streamUrl, channelName)
  })

  // ── Native Notifications ──────────────────────────────────────────────────
  ipcMain.handle('notification:show', (_, title: string, body: string) => {
    if (Notification.isSupported()) {
      const n = new Notification({ title, body, silent: false })
      n.on('click', () => {
        mainWindow.show()
        mainWindow.focus()
      })
      n.show()
      return true
    }
    return false
  })

  // ── Shell / External ──────────────────────────────────────────────────────
  ipcMain.handle('shell:openExternal', (_, url: string) => shell.openExternal(url))
}
