import { app } from 'electron'
import path from 'path'
import fs from 'fs'

let db: any = null

function getDb() {
  if (db) return db

  try {
    const Database = require('better-sqlite3')
    const dbPath = path.join(app.getPath('userData'), 'iptvplayerx.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    initSchema(db)
    return db
  } catch (err) {
    console.error('SQLite unavailable, using in-memory fallback:', err)
    return createMemoryFallback()
  }
}

function initSchema(database: any) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      url TEXT,
      filepath TEXT,
      username TEXT,
      password TEXT,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT NOT NULL UNIQUE,
      channel_name TEXT NOT NULL,
      channel_url TEXT NOT NULL,
      logo_url TEXT,
      group_title TEXT,
      country TEXT,
      languages TEXT,
      added_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS watch_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      channel_url TEXT NOT NULL,
      logo_url TEXT,
      group_title TEXT,
      watched_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS parental_control (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      pin_hash TEXT,
      enabled INTEGER DEFAULT 0,
      block_adult INTEGER DEFAULT 1,
      blocked_categories TEXT DEFAULT '[]',
      blocked_channels TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS channels_cache (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      logo TEXT,
      group_title TEXT,
      country TEXT,
      languages TEXT,
      is_adult INTEGER DEFAULT 0,
      source TEXT DEFAULT 'iptv-org'
    );

    CREATE TABLE IF NOT EXISTS cache_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO parental_control (id, enabled, block_adult, blocked_categories, blocked_channels)
    VALUES (1, 0, 1, '[]', '[]');

    INSERT OR IGNORE INTO settings (key, value) VALUES ('language', 'en');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'dark');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('player_type', 'auto');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('volume', '100');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('display_index', '0');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('iptv_org_enabled', 'true');
  `)
}

// In-memory fallback when SQLite is not available
function createMemoryFallback() {
  const store: Record<string, any> = {
    settings: {
      language: 'en', theme: 'dark', player_type: 'auto',
      volume: '100', display_index: '0', iptv_org_enabled: 'true'
    },
    favorites: [],
    history: [],
    sources: [],
    parental: {
      enabled: 0, pin_hash: null, block_adult: 1,
      blocked_categories: '[]', blocked_channels: '[]'
    }
  }

  return {
    prepare: (sql: string) => ({
      get: (...args: any[]) => {
        if (sql.includes('settings') && sql.includes('WHERE key')) {
          const key = args[0]
          const val = store.settings[key]
          return val !== undefined ? { key, value: String(val) } : undefined
        }
        if (sql.includes('parental_control')) return store.parental
        return undefined
      },
      all: (...args: any[]) => {
        if (sql.includes('favorites')) return store.favorites
        if (sql.includes('watch_history')) return store.history
        if (sql.includes('sources')) return store.sources
        if (sql.includes('settings')) return Object.entries(store.settings).map(([k, v]) => ({ key: k, value: String(v) }))
        return []
      },
      run: (...args: any[]) => ({ lastInsertRowid: Date.now(), changes: 1 })
    }),
    exec: () => {}
  }
}

export const dbOps = {
  getSetting(key: string): string | null {
    try {
      const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key)
      return row ? (row as any).value : null
    } catch { return null }
  },

  setSetting(key: string, value: string): void {
    try {
      getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
    } catch {}
  },

  getAllSettings(): Record<string, string> {
    try {
      const rows = getDb().prepare('SELECT key, value FROM settings').all() as any[]
      return rows.reduce((acc, r) => ({ ...acc, [r.key]: r.value }), {})
    } catch { return {} }
  },

  getFavorites(): any[] {
    try {
      return getDb().prepare('SELECT * FROM favorites ORDER BY added_at DESC').all() as any[]
    } catch { return [] }
  },

  addFavorite(channel: any): boolean {
    try {
      getDb().prepare(`
        INSERT OR REPLACE INTO favorites (channel_id, channel_name, channel_url, logo_url, group_title, country, languages)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(channel.id, channel.name, channel.url, channel.logo || null, channel.group || null, channel.country || null, JSON.stringify(channel.languages || []))
      return true
    } catch { return false }
  },

  removeFavorite(channelId: string): boolean {
    try {
      getDb().prepare('DELETE FROM favorites WHERE channel_id = ?').run(channelId)
      return true
    } catch { return false }
  },

  isFavorite(channelId: string): boolean {
    try {
      const row = getDb().prepare('SELECT id FROM favorites WHERE channel_id = ?').get(channelId)
      return !!row
    } catch { return false }
  },

  getHistory(limit = 50): any[] {
    try {
      return getDb().prepare('SELECT * FROM watch_history ORDER BY watched_at DESC LIMIT ?').all(limit) as any[]
    } catch { return [] }
  },

  addHistory(channel: any): void {
    try {
      const db = getDb()
      db.prepare('DELETE FROM watch_history WHERE channel_id = ?').run(channel.id)
      db.prepare(`
        INSERT INTO watch_history (channel_id, channel_name, channel_url, logo_url, group_title)
        VALUES (?, ?, ?, ?, ?)
      `).run(channel.id, channel.name, channel.url, channel.logo || null, channel.group || null)
      db.prepare('DELETE FROM watch_history WHERE id NOT IN (SELECT id FROM watch_history ORDER BY watched_at DESC LIMIT 100)').run()
    } catch {}
  },

  clearHistory(): void {
    try {
      getDb().prepare('DELETE FROM watch_history').run()
    } catch {}
  },

  getSources(): any[] {
    try {
      return getDb().prepare('SELECT * FROM sources ORDER BY created_at DESC').all() as any[]
    } catch { return [] }
  },

  addSource(source: any): number {
    try {
      const result = getDb().prepare(`
        INSERT INTO sources (name, type, url, filepath, username, password, enabled)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(source.name, source.type, source.url || null, source.filepath || null, source.username || null, source.password || null)
      return (result as any).lastInsertRowid
    } catch { return -1 }
  },

  removeSource(id: number): boolean {
    try {
      getDb().prepare('DELETE FROM sources WHERE id = ?').run(id)
      return true
    } catch { return false }
  },

  toggleSource(id: number, enabled: boolean): void {
    try {
      getDb().prepare('UPDATE sources SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id)
    } catch {}
  },

  getParentalControl(): any {
    try {
      return getDb().prepare('SELECT * FROM parental_control WHERE id = 1').get()
    } catch { return { enabled: 0, pin_hash: null, block_adult: 1, blocked_categories: '[]', blocked_channels: '[]' } }
  },

  setParentalControl(data: any): void {
    try {
      getDb().prepare(`
        UPDATE parental_control SET
          enabled = ?, pin_hash = ?, block_adult = ?,
          blocked_categories = ?, blocked_channels = ?
        WHERE id = 1
      `).run(
        data.enabled ? 1 : 0,
        data.pin_hash || null,
        data.block_adult ? 1 : 0,
        JSON.stringify(data.blocked_categories || []),
        JSON.stringify(data.blocked_channels || [])
      )
    } catch {}
  },

  // ── Channel Cache ─────────────────────────────────────────────────────────

  getCacheInfo(): { count: number; cachedAt: string | null; ageHours: number } {
    try {
      const db = getDb()
      const row = db.prepare("SELECT value FROM cache_meta WHERE key = 'last_fetch'").get() as any
      const count = (db.prepare('SELECT COUNT(*) as c FROM channels_cache').get() as any)?.c || 0
      if (!row || !count) return { count: 0, cachedAt: null, ageHours: 9999 }
      const cachedAt = row.value
      const ageMs = Date.now() - new Date(cachedAt).getTime()
      return { count, cachedAt, ageHours: ageMs / 3_600_000 }
    } catch { return { count: 0, cachedAt: null, ageHours: 9999 } }
  },

  getChannelsFromCache(): any[] {
    try {
      return getDb().prepare('SELECT * FROM channels_cache ORDER BY name ASC').all() as any[]
    } catch { return [] }
  },

  saveChannelsToCache(channels: any[]): void {
    try {
      const db = getDb()
      // Use a transaction for speed — inserting 7000 rows one by one would be very slow
      const insert = db.prepare(`
        INSERT OR REPLACE INTO channels_cache
          (id, name, url, logo, group_title, country, languages, is_adult, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const upsertMany = db.transaction((rows: any[]) => {
        for (const ch of rows) {
          insert.run(
            ch.id, ch.name, ch.url,
            ch.logo || null,
            ch.group || null,
            ch.country || null,
            JSON.stringify(ch.languages || []),
            ch.isAdult ? 1 : 0,
            ch.source || 'iptv-org'
          )
        }
      })
      upsertMany(channels)
      db.prepare("INSERT OR REPLACE INTO cache_meta (key, value) VALUES ('last_fetch', ?)").run(new Date().toISOString())
    } catch (err) { console.error('Cache save failed:', err) }
  },

  clearChannelsCache(): void {
    try {
      const db = getDb()
      db.prepare('DELETE FROM channels_cache').run()
      db.prepare("DELETE FROM cache_meta WHERE key = 'last_fetch'").run()
    } catch {}
  }
}
