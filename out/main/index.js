"use strict";
const electron = require("electron");
const path = require("path");
const https = require("https");
const http = require("http");
const fs = require("fs");
const dgram = require("dgram");
const tls = require("tls");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const dgram__namespace = /* @__PURE__ */ _interopNamespaceDefault(dgram);
const tls__namespace = /* @__PURE__ */ _interopNamespaceDefault(tls);
let db = null;
function getDb() {
  if (db) return db;
  try {
    const Database = require("better-sqlite3");
    const dbPath = path.join(electron.app.getPath("userData"), "iptvplayerx.db");
    db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    initSchema(db);
    return db;
  } catch (err) {
    console.error("SQLite unavailable, using in-memory fallback:", err);
    return createMemoryFallback();
  }
}
function initSchema(database) {
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
  `);
}
function createMemoryFallback() {
  const store = {
    settings: {
      language: "en",
      theme: "dark",
      player_type: "auto",
      volume: "100",
      display_index: "0",
      iptv_org_enabled: "true"
    },
    favorites: [],
    history: [],
    sources: [],
    parental: {
      enabled: 0,
      pin_hash: null,
      block_adult: 1,
      blocked_categories: "[]",
      blocked_channels: "[]"
    }
  };
  return {
    prepare: (sql) => ({
      get: (...args) => {
        if (sql.includes("settings") && sql.includes("WHERE key")) {
          const key = args[0];
          const val = store.settings[key];
          return val !== void 0 ? { key, value: String(val) } : void 0;
        }
        if (sql.includes("parental_control")) return store.parental;
        return void 0;
      },
      all: (...args) => {
        if (sql.includes("favorites")) return store.favorites;
        if (sql.includes("watch_history")) return store.history;
        if (sql.includes("sources")) return store.sources;
        if (sql.includes("settings")) return Object.entries(store.settings).map(([k, v]) => ({ key: k, value: String(v) }));
        return [];
      },
      run: (...args) => ({ lastInsertRowid: Date.now(), changes: 1 })
    }),
    exec: () => {
    }
  };
}
const dbOps = {
  getSetting(key) {
    try {
      const row = getDb().prepare("SELECT value FROM settings WHERE key = ?").get(key);
      return row ? row.value : null;
    } catch {
      return null;
    }
  },
  setSetting(key, value) {
    try {
      getDb().prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
    } catch {
    }
  },
  getAllSettings() {
    try {
      const rows = getDb().prepare("SELECT key, value FROM settings").all();
      return rows.reduce((acc, r) => ({ ...acc, [r.key]: r.value }), {});
    } catch {
      return {};
    }
  },
  getFavorites() {
    try {
      return getDb().prepare("SELECT * FROM favorites ORDER BY added_at DESC").all();
    } catch {
      return [];
    }
  },
  addFavorite(channel) {
    try {
      getDb().prepare(`
        INSERT OR REPLACE INTO favorites (channel_id, channel_name, channel_url, logo_url, group_title, country, languages)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(channel.id, channel.name, channel.url, channel.logo || null, channel.group || null, channel.country || null, JSON.stringify(channel.languages || []));
      return true;
    } catch {
      return false;
    }
  },
  removeFavorite(channelId) {
    try {
      getDb().prepare("DELETE FROM favorites WHERE channel_id = ?").run(channelId);
      return true;
    } catch {
      return false;
    }
  },
  isFavorite(channelId) {
    try {
      const row = getDb().prepare("SELECT id FROM favorites WHERE channel_id = ?").get(channelId);
      return !!row;
    } catch {
      return false;
    }
  },
  getHistory(limit = 50) {
    try {
      return getDb().prepare("SELECT * FROM watch_history ORDER BY watched_at DESC LIMIT ?").all(limit);
    } catch {
      return [];
    }
  },
  addHistory(channel) {
    try {
      const db2 = getDb();
      db2.prepare("DELETE FROM watch_history WHERE channel_id = ?").run(channel.id);
      db2.prepare(`
        INSERT INTO watch_history (channel_id, channel_name, channel_url, logo_url, group_title)
        VALUES (?, ?, ?, ?, ?)
      `).run(channel.id, channel.name, channel.url, channel.logo || null, channel.group || null);
      db2.prepare("DELETE FROM watch_history WHERE id NOT IN (SELECT id FROM watch_history ORDER BY watched_at DESC LIMIT 100)").run();
    } catch {
    }
  },
  clearHistory() {
    try {
      getDb().prepare("DELETE FROM watch_history").run();
    } catch {
    }
  },
  getSources() {
    try {
      return getDb().prepare("SELECT * FROM sources ORDER BY created_at DESC").all();
    } catch {
      return [];
    }
  },
  addSource(source) {
    try {
      const result = getDb().prepare(`
        INSERT INTO sources (name, type, url, filepath, username, password, enabled)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(source.name, source.type, source.url || null, source.filepath || null, source.username || null, source.password || null);
      return result.lastInsertRowid;
    } catch {
      return -1;
    }
  },
  removeSource(id) {
    try {
      getDb().prepare("DELETE FROM sources WHERE id = ?").run(id);
      return true;
    } catch {
      return false;
    }
  },
  toggleSource(id, enabled) {
    try {
      getDb().prepare("UPDATE sources SET enabled = ? WHERE id = ?").run(enabled ? 1 : 0, id);
    } catch {
    }
  },
  getParentalControl() {
    try {
      return getDb().prepare("SELECT * FROM parental_control WHERE id = 1").get();
    } catch {
      return { enabled: 0, pin_hash: null, block_adult: 1, blocked_categories: "[]", blocked_channels: "[]" };
    }
  },
  setParentalControl(data) {
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
      );
    } catch {
    }
  },
  // ── Channel Cache ─────────────────────────────────────────────────────────
  getCacheInfo() {
    try {
      const db2 = getDb();
      const row = db2.prepare("SELECT value FROM cache_meta WHERE key = 'last_fetch'").get();
      const count = db2.prepare("SELECT COUNT(*) as c FROM channels_cache").get()?.c || 0;
      if (!row || !count) return { count: 0, cachedAt: null, ageHours: 9999 };
      const cachedAt = row.value;
      const ageMs = Date.now() - new Date(cachedAt).getTime();
      return { count, cachedAt, ageHours: ageMs / 36e5 };
    } catch {
      return { count: 0, cachedAt: null, ageHours: 9999 };
    }
  },
  getChannelsFromCache() {
    try {
      return getDb().prepare("SELECT * FROM channels_cache ORDER BY name ASC").all();
    } catch {
      return [];
    }
  },
  saveChannelsToCache(channels) {
    try {
      const db2 = getDb();
      const insert = db2.prepare(`
        INSERT OR REPLACE INTO channels_cache
          (id, name, url, logo, group_title, country, languages, is_adult, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const upsertMany = db2.transaction((rows) => {
        for (const ch of rows) {
          insert.run(
            ch.id,
            ch.name,
            ch.url,
            ch.logo || null,
            ch.group || null,
            ch.country || null,
            JSON.stringify(ch.languages || []),
            ch.isAdult ? 1 : 0,
            ch.source || "iptv-org"
          );
        }
      });
      upsertMany(channels);
      db2.prepare("INSERT OR REPLACE INTO cache_meta (key, value) VALUES ('last_fetch', ?)").run((/* @__PURE__ */ new Date()).toISOString());
    } catch (err) {
      console.error("Cache save failed:", err);
    }
  },
  clearChannelsCache() {
    try {
      const db2 = getDb();
      db2.prepare("DELETE FROM channels_cache").run();
      db2.prepare("DELETE FROM cache_meta WHERE key = 'last_fetch'").run();
    } catch {
    }
  }
};
function parseAttributes(attrString) {
  const attrs = {};
  const regex = /([\w-]+)="([^"]*?)"/g;
  let match;
  while ((match = regex.exec(attrString)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function parseM3U(content) {
  const lines = content.split(/\r?\n/);
  const channels = [];
  let currentMeta = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith("#EXTINF:")) {
      const commaIdx = line.lastIndexOf(",");
      const attrPart = commaIdx > 0 ? line.substring(8, commaIdx) : line.substring(8);
      const displayName = commaIdx > 0 ? line.substring(commaIdx + 1).trim() : "";
      const attrs = parseAttributes(attrPart);
      currentMeta = {
        name: displayName || attrs["tvg-name"] || "Unknown Channel",
        logo: attrs["tvg-logo"] || void 0,
        group: attrs["group-title"] || "General",
        tvgId: attrs["tvg-id"] || void 0,
        tvgName: attrs["tvg-name"] || void 0,
        country: attrs["tvg-country"] || void 0,
        languages: attrs["tvg-language"] ? [attrs["tvg-language"]] : void 0
      };
    } else if (line.startsWith("#") || !currentMeta) {
      continue;
    } else {
      const url = line.trim();
      if (url && (url.startsWith("http") || url.startsWith("rtmp") || url.startsWith("rtsp"))) {
        const id = currentMeta.tvgId || slugify(currentMeta.name || "") + "-" + channels.length;
        channels.push({
          id,
          name: currentMeta.name || "Unknown",
          url,
          logo: currentMeta.logo,
          group: currentMeta.group,
          tvgId: currentMeta.tvgId,
          tvgName: currentMeta.tvgName,
          country: currentMeta.country,
          languages: currentMeta.languages
        });
        currentMeta = null;
      }
    }
  }
  return channels;
}
const MDNS_ADDRESS = "224.0.0.251";
const MDNS_PORT = 5353;
const CAST_QUERY = Buffer.from([
  0,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  0,
  0,
  12,
  95,
  103,
  111,
  111,
  103,
  108,
  101,
  99,
  97,
  115,
  116,
  4,
  95,
  116,
  99,
  112,
  5,
  108,
  111,
  99,
  97,
  108,
  0,
  0,
  12,
  0,
  1
]);
function discoverCastDevices(timeout = 5e3) {
  return new Promise((resolve) => {
    const devices = /* @__PURE__ */ new Map();
    let socket = null;
    try {
      socket = dgram__namespace.createSocket({ type: "udp4", reuseAddr: true });
      socket.on("error", () => resolve([...devices.values()]));
      socket.on("message", (msg, rinfo) => {
        try {
          const text = msg.toString("utf8", 0, Math.min(msg.length, 200));
          const nameMatch = text.match(/([A-Za-z0-9\s\-_'\.]+)\._googlecast/);
          const name = nameMatch ? nameMatch[1].trim() : `Chromecast (${rinfo.address})`;
          const id = rinfo.address + ":8009";
          if (!devices.has(id)) {
            devices.set(id, { id, name, ip: rinfo.address, port: 8009 });
          }
        } catch {
        }
      });
      socket.bind(() => {
        try {
          socket?.addMembership(MDNS_ADDRESS);
          socket?.send(CAST_QUERY, 0, CAST_QUERY.length, MDNS_PORT, MDNS_ADDRESS);
        } catch {
        }
      });
      setTimeout(() => {
        try {
          socket?.close();
        } catch {
        }
        resolve([...devices.values()]);
      }, timeout);
    } catch {
      resolve([]);
    }
  });
}
function castToDevice(device, streamUrl, channelName) {
  return new Promise((resolve) => {
    try {
      const socket = tls__namespace.connect(device.port, device.ip, { rejectUnauthorized: false }, () => {
        const connectMsg = buildCastMessage(
          "sender-0",
          "receiver-0",
          "urn:x-cast:com.google.cast.tp.connection",
          JSON.stringify({ type: "CONNECT" })
        );
        socket.write(connectMsg);
        setTimeout(() => {
          const launchMsg = buildCastMessage(
            "sender-0",
            "receiver-0",
            "urn:x-cast:com.google.cast.receiver",
            JSON.stringify({ type: "LAUNCH", appId: "CC1AD845", requestId: 1 })
          );
          socket.write(launchMsg);
        }, 500);
        setTimeout(() => {
          const loadMsg = buildCastMessage(
            "client-17558",
            "destination-17558",
            "urn:x-cast:com.google.cast.media",
            JSON.stringify({
              type: "LOAD",
              requestId: 2,
              media: {
                contentId: streamUrl,
                streamType: "LIVE",
                contentType: streamUrl.includes(".m3u8") ? "application/x-mpegURL" : "video/mp4",
                metadata: { type: 0, title: channelName }
              },
              autoplay: true
            })
          );
          socket.write(loadMsg);
          resolve(true);
          setTimeout(() => {
            try {
              socket.destroy();
            } catch {
            }
          }, 2e3);
        }, 2e3);
      });
      socket.on("error", () => resolve(false));
      socket.setTimeout(1e4, () => {
        socket.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}
function buildCastMessage(sourceId, destinationId, namespace, payload) {
  const srcBuf = Buffer.from(sourceId, "utf8");
  const dstBuf = Buffer.from(destinationId, "utf8");
  const nsBuf = Buffer.from(namespace, "utf8");
  const payBuf = Buffer.from(payload, "utf8");
  const msgLen = 2 + 4 + srcBuf.length + 2 + 4 + dstBuf.length + 2 + 4 + nsBuf.length + 2 + 1 + 2 + 4 + payBuf.length;
  const msg = Buffer.alloc(4 + msgLen);
  let offset = 0;
  msg.writeUInt32BE(msgLen, offset);
  offset += 4;
  msg.writeUInt8(8, offset++);
  msg.writeUInt8(0, offset++);
  msg.writeUInt8(18, offset++);
  msg.writeUInt8(srcBuf.length, offset++);
  srcBuf.copy(msg, offset);
  offset += srcBuf.length;
  msg.writeUInt8(26, offset++);
  msg.writeUInt8(dstBuf.length, offset++);
  dstBuf.copy(msg, offset);
  offset += dstBuf.length;
  msg.writeUInt8(34, offset++);
  msg.writeUInt8(nsBuf.length, offset++);
  nsBuf.copy(msg, offset);
  offset += nsBuf.length;
  msg.writeUInt8(40, offset++);
  msg.writeUInt8(0, offset++);
  msg.writeUInt8(50, offset++);
  msg.writeUInt8(payBuf.length, offset++);
  payBuf.copy(msg, offset);
  return msg;
}
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "*/*"
      },
      timeout: 3e4
    }, (res) => {
      let data = "";
      if (res.statusCode === 301 || res.statusCode === 302) {
        if (res.headers.location) return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      res.setEncoding("utf8");
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Timeout"));
    });
  });
}
function registerIpcHandlers(mainWindow2) {
  electron.ipcMain.handle("db:getSetting", (_, key) => dbOps.getSetting(key));
  electron.ipcMain.handle("db:setSetting", (_, key, value) => {
    dbOps.setSetting(key, value);
  });
  electron.ipcMain.handle("db:getAllSettings", () => dbOps.getAllSettings());
  electron.ipcMain.handle("db:getFavorites", () => dbOps.getFavorites());
  electron.ipcMain.handle("db:addFavorite", (_, channel) => dbOps.addFavorite(channel));
  electron.ipcMain.handle("db:removeFavorite", (_, channelId) => dbOps.removeFavorite(channelId));
  electron.ipcMain.handle("db:isFavorite", (_, channelId) => dbOps.isFavorite(channelId));
  electron.ipcMain.handle("db:getHistory", (_, limit) => dbOps.getHistory(limit));
  electron.ipcMain.handle("db:addHistory", (_, channel) => dbOps.addHistory(channel));
  electron.ipcMain.handle("db:clearHistory", () => dbOps.clearHistory());
  electron.ipcMain.handle("db:getSources", () => dbOps.getSources());
  electron.ipcMain.handle("db:addSource", (_, source) => dbOps.addSource(source));
  electron.ipcMain.handle("db:removeSource", (_, id) => dbOps.removeSource(id));
  electron.ipcMain.handle("db:toggleSource", (_, id, enabled) => dbOps.toggleSource(id, enabled));
  electron.ipcMain.handle("db:getParentalControl", () => dbOps.getParentalControl());
  electron.ipcMain.handle("db:setParentalControl", (_, data) => dbOps.setParentalControl(data));
  electron.ipcMain.handle("cache:getInfo", () => dbOps.getCacheInfo());
  electron.ipcMain.handle("cache:getChannels", () => dbOps.getChannelsFromCache());
  electron.ipcMain.handle("cache:saveChannels", (_, channels) => dbOps.saveChannelsToCache(channels));
  electron.ipcMain.handle("cache:clear", () => dbOps.clearChannelsCache());
  const M3U_CATEGORIES = [
    { name: "Animation", url: "https://iptv-org.github.io/iptv/categories/animation.m3u" },
    { name: "Auto", url: "https://iptv-org.github.io/iptv/categories/auto.m3u" },
    { name: "Business", url: "https://iptv-org.github.io/iptv/categories/business.m3u" },
    { name: "Classic", url: "https://iptv-org.github.io/iptv/categories/classic.m3u" },
    { name: "Comedy", url: "https://iptv-org.github.io/iptv/categories/comedy.m3u" },
    { name: "Cooking", url: "https://iptv-org.github.io/iptv/categories/cooking.m3u" },
    { name: "Culture", url: "https://iptv-org.github.io/iptv/categories/culture.m3u" },
    { name: "Documentary", url: "https://iptv-org.github.io/iptv/categories/documentary.m3u" },
    { name: "Education", url: "https://iptv-org.github.io/iptv/categories/education.m3u" },
    { name: "Entertainment", url: "https://iptv-org.github.io/iptv/categories/entertainment.m3u" },
    { name: "Family", url: "https://iptv-org.github.io/iptv/categories/family.m3u" },
    { name: "Kids", url: "https://iptv-org.github.io/iptv/categories/kids.m3u" },
    { name: "Legislative", url: "https://iptv-org.github.io/iptv/categories/legislative.m3u" },
    { name: "Lifestyle", url: "https://iptv-org.github.io/iptv/categories/lifestyle.m3u" },
    { name: "Movies", url: "https://iptv-org.github.io/iptv/categories/movies.m3u" },
    { name: "Music", url: "https://iptv-org.github.io/iptv/categories/music.m3u" },
    { name: "News", url: "https://iptv-org.github.io/iptv/categories/news.m3u" },
    { name: "Outdoor", url: "https://iptv-org.github.io/iptv/categories/outdoor.m3u" },
    { name: "Public", url: "https://iptv-org.github.io/iptv/categories/public.m3u" },
    { name: "Relax", url: "https://iptv-org.github.io/iptv/categories/relax.m3u" },
    { name: "Religious", url: "https://iptv-org.github.io/iptv/categories/religious.m3u" },
    { name: "Science", url: "https://iptv-org.github.io/iptv/categories/science.m3u" },
    { name: "Series", url: "https://iptv-org.github.io/iptv/categories/series.m3u" },
    { name: "Shop", url: "https://iptv-org.github.io/iptv/categories/shop.m3u" },
    { name: "Sports", url: "https://iptv-org.github.io/iptv/categories/sports.m3u" },
    { name: "Travel", url: "https://iptv-org.github.io/iptv/categories/travel.m3u" },
    { name: "Weather", url: "https://iptv-org.github.io/iptv/categories/weather.m3u" },
    { name: "General", url: "https://iptv-org.github.io/iptv/categories/general.m3u" },
    { name: "Undefined", url: "https://iptv-org.github.io/iptv/categories/undefined.m3u" }
  ];
  electron.ipcMain.handle("api:fetchM3UChannels", async () => {
    const total = M3U_CATEGORIES.length;
    let loaded = 0;
    async function fetchCategory(cat) {
      try {
        const content = await fetchUrl(cat.url);
        const channels = parseM3U(content);
        loaded++;
        if (!mainWindow2.isDestroyed()) {
          mainWindow2.webContents.send("api:m3uProgress", { loaded, total, category: cat.name });
        }
        return channels;
      } catch (err) {
        loaded++;
        if (!mainWindow2.isDestroyed()) {
          mainWindow2.webContents.send("api:m3uProgress", { loaded, total, category: cat.name });
        }
        console.warn(`[m3u] Failed to fetch ${cat.name}:`, err.message);
        return [];
      }
    }
    const CONCURRENCY = 8;
    const results = new Array(M3U_CATEGORIES.length);
    let idx = 0;
    async function worker() {
      while (idx < M3U_CATEGORIES.length) {
        const i = idx++;
        results[i] = await fetchCategory(M3U_CATEGORIES[i]);
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    const seen = /* @__PURE__ */ new Set();
    const allChannels = [];
    for (const batch of results) {
      for (const ch of batch) {
        if (!seen.has(ch.url)) {
          seen.add(ch.url);
          allChannels.push(ch);
        }
      }
    }
    console.log(`[m3u] Fetched ${allChannels.length} unique channels from ${total} categories`);
    try {
      dbOps.saveChannelsToCache(allChannels);
      console.log("[m3u] Saved to SQLite cache");
    } catch (err) {
      console.error("[m3u] Cache save failed:", err.message);
    }
    return { channels: allChannels };
  });
  electron.ipcMain.handle("api:fetchCountries", async () => {
    try {
      const data = await fetchUrl("https://iptv-org.github.io/api/countries.json");
      return JSON.parse(data);
    } catch {
      return [];
    }
  });
  electron.ipcMain.handle("m3u:parseUrl", async (_, url) => {
    try {
      const content = await fetchUrl(url);
      return parseM3U(content);
    } catch (err) {
      throw new Error(`Failed to parse M3U from URL: ${err.message}`);
    }
  });
  electron.ipcMain.handle("m3u:parseFile", async () => {
    const result = await electron.dialog.showOpenDialog(mainWindow2, {
      title: "Open M3U Playlist",
      filters: [
        { name: "M3U Playlists", extensions: ["m3u", "m3u8", "txt"] },
        { name: "All Files", extensions: ["*"] }
      ],
      properties: ["openFile"]
    });
    if (result.canceled || !result.filePaths.length) return null;
    const content = fs.readFileSync(result.filePaths[0], "utf8");
    return { channels: parseM3U(content), filePath: result.filePaths[0] };
  });
  electron.ipcMain.handle("display:getScreens", () => {
    return electron.screen.getAllDisplays().map((d, i) => ({
      id: d.id,
      index: i,
      label: `Display ${i + 1} (${d.size.width}x${d.size.height})`,
      width: d.size.width,
      height: d.size.height,
      isPrimary: d.id === electron.screen.getPrimaryDisplay().id,
      scaleFactor: d.scaleFactor
    }));
  });
  electron.ipcMain.handle("display:moveToScreen", (_, displayIndex) => {
    const displays = electron.screen.getAllDisplays();
    const target = displays[displayIndex] || displays[0];
    if (target) {
      mainWindow2.setBounds({
        x: target.bounds.x,
        y: target.bounds.y,
        width: mainWindow2.getBounds().width,
        height: mainWindow2.getBounds().height
      });
    }
  });
  electron.ipcMain.handle("window:minimize", () => mainWindow2.minimize());
  electron.ipcMain.handle("window:maximize", () => {
    if (mainWindow2.isMaximized()) mainWindow2.unmaximize();
    else mainWindow2.maximize();
  });
  electron.ipcMain.handle("window:close", () => mainWindow2.close());
  electron.ipcMain.handle("window:isMaximized", () => mainWindow2.isMaximized());
  electron.ipcMain.handle("window:setFullscreen", (_, flag) => mainWindow2.setFullScreen(flag));
  electron.ipcMain.handle("window:isFullscreen", () => mainWindow2.isFullScreen());
  electron.ipcMain.handle("cast:discover", async () => {
    return await discoverCastDevices(5e3);
  });
  electron.ipcMain.handle("cast:cast", async (_, deviceId, streamUrl, channelName) => {
    const devices = await discoverCastDevices(2e3);
    const device = devices.find((d) => d.id === deviceId);
    if (!device) return false;
    return await castToDevice(device, streamUrl, channelName);
  });
  electron.ipcMain.handle("notification:show", (_, title, body) => {
    if (electron.Notification.isSupported()) {
      const n = new electron.Notification({ title, body, silent: false });
      n.on("click", () => {
        mainWindow2.show();
        mainWindow2.focus();
      });
      n.show();
      return true;
    }
    return false;
  });
  electron.ipcMain.handle("shell:openExternal", (_, url) => electron.shell.openExternal(url));
}
electron.nativeTheme.themeSource = "dark";
electron.app.setAppUserModelId("com.iptv.playerx");
let mainWindow = null;
let tray = null;
let forceQuit = false;
let currentChannel = null;
function getTrayIcon() {
  const iconPath = path.join(__dirname, "../../resources/tray-icon.png");
  const img = electron.nativeImage.createFromPath(iconPath);
  return img.isEmpty() ? electron.nativeImage.createEmpty() : img;
}
function buildTrayMenu() {
  return electron.Menu.buildFromTemplate([
    { label: "IPTV PlayerX", enabled: false },
    {
      label: currentChannel ? `▶  ${currentChannel}` : "Not playing",
      enabled: false
    },
    { type: "separator" },
    {
      label: mainWindow?.isVisible() ? "Hide Window" : "Show Window",
      click: () => {
        toggleWindow();
        tray?.setContextMenu(buildTrayMenu());
      }
    },
    { type: "separator" },
    {
      label: "Quit IPTV PlayerX",
      click: () => {
        forceQuit = true;
        electron.app.quit();
      }
    }
  ]);
}
function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}
function createTray() {
  tray = new electron.Tray(getTrayIcon());
  tray.setToolTip("IPTV PlayerX");
  tray.setContextMenu(buildTrayMenu());
  tray.on("click", () => {
    toggleWindow();
    tray?.setContextMenu(buildTrayMenu());
  });
}
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#0d0d12",
    show: false,
    icon: getTrayIcon(),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  });
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({
      requestHeaders: {
        ...details.requestHeaders,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Origin": void 0,
        "Referer": void 0
      }
    });
  });
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Access-Control-Allow-Origin": ["*"],
        "Access-Control-Allow-Methods": ["GET, POST, OPTIONS"],
        "Access-Control-Allow-Headers": ["*"]
      }
    });
  });
  registerIpcHandlers(mainWindow);
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("close", (e) => {
    if (!forceQuit) {
      e.preventDefault();
      mainWindow?.hide();
      tray?.setContextMenu(buildTrayMenu());
    }
  });
  mainWindow.on("show", () => tray?.setContextMenu(buildTrayMenu()));
  mainWindow.on("hide", () => tray?.setContextMenu(buildTrayMenu()));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
electron.app.whenReady().then(() => {
  createWindow();
  createTray();
  electron.ipcMain.handle("tray:setChannel", (_, channelName) => {
    currentChannel = channelName;
    tray?.setToolTip(channelName ? `▶  ${channelName}  —  IPTV PlayerX` : "IPTV PlayerX");
    tray?.setContextMenu(buildTrayMenu());
  });
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("before-quit", () => {
  forceQuit = true;
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && forceQuit) electron.app.quit();
});
