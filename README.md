# IPTV PlayerX

A modern, free, open-source IPTV desktop player built with Electron + React. Netflix/Pluto TV-style interface, no login required, no ads, no subscription.

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- 🎬 Netflix/Pluto TV-style dark UI with smooth Framer Motion animations
- 📡 ~12,000 free channels sourced from [iptv-org](https://github.com/iptv-org/iptv) M3U category playlists
- ⚡ SQLite local cache — first launch fetches channels, every launch after is instant
- 📺 Custom M3U/M3U8 playlist support (URL or local file)
- 🔒 Parental control with 4-digit PIN, category/channel blocking, adult-content filtering
- 📽️ Multi-player engine: HLS.js, MPEG-TS.js, native HTML5 — auto-detected per stream
- 📡 Chromecast support (mDNS discovery + CASTV2 protocol)
- 🖥️ Multi-monitor support
- 🌐 English, Spanish, and Portuguese localization
- 🔔 Native Windows notifications + system tray (minimize on close, tray menu)
- 💾 Favorites & watch history, stored locally in SQLite

## Tech Stack

| Layer | Technology |
|---|---|
| Shell | Electron 29 |
| Build tool | electron-vite |
| UI | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| State | Zustand |
| Routing | React Router (HashRouter) |
| Database | better-sqlite3 |
| Video | HLS.js, mpegts.js, native HTML5 |
| i18n | i18next / react-i18next |

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ (LTS recommended)
- npm (bundled with Node.js)
- Windows: Build Tools for Visual Studio (needed to compile `better-sqlite3`'s native module) — usually installed automatically via `npm install`, or run `npm install --global windows-build-tools` if it fails
- Python (used by `node-gyp` for native module compilation on some setups)

## Getting Started

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd iptv-playerx

# 2. Install dependencies
npm install

# 3. Run in development mode (hot reload)
npm run dev
```

The app window opens automatically. Channels are fetched from iptv-org on first launch and cached in SQLite — subsequent launches load instantly.

## Available Scripts

| Command | Description |
|---|---|
| `npm install` | Install all dependencies |
| `npm run dev` | Start the app in development mode with hot reload |
| `npm run build` | Build main, preload, and renderer bundles to `out/` (no installer) |
| `npm run preview` | Preview the production build locally without packaging |
| `npm run rebuild` | Rebuild `better-sqlite3`'s native module against Electron's Node version |
| `npm run package` | Build + package an installer for the current OS → `release/` |
| `npm run package:win` | Build + rebuild native modules + package a Windows installer (`.exe`, NSIS) |
| `npm run package:mac` | Build + rebuild native modules + package a macOS installer (`.dmg`) |
| `npm run package:linux` | Build + rebuild native modules + package a Linux package (`AppImage`) |

## Updating Dependencies

```bash
# Check what's outdated
npm outdated

# Update everything to the latest semver-compatible versions
npm update

# After updating Electron, or if you see a NODE_MODULE_VERSION mismatch error,
# rebuild the native SQLite module for Electron's Node ABI:
npm run rebuild
```

> **Native module errors** (`NODE_MODULE_VERSION x vs y`) happen when `better-sqlite3` was compiled against your system Node.js instead of Electron's bundled Node. Always run `npm run rebuild` after `npm install` or after upgrading Electron.

## Building for Production

```bash
# Windows installer (.exe via NSIS)
npm run package:win

# macOS installer (.dmg)
npm run package:mac

# Linux package (.AppImage)
npm run package:linux
```

Output installers are written to `release/`. The build pipeline:
1. `electron-vite build` — compiles main/preload/renderer to `out/`
2. `electron-rebuild` — recompiles `better-sqlite3`'s native module for the target Electron ABI
3. `electron-builder` — packages everything into a platform installer (native modules are unpacked from the `.asar` archive automatically)

## Project Structure

```
electron/
  main/            # Electron main process (Node.js context)
    index.ts        # App entry, window + tray creation
    ipc-handlers.ts  # All IPC handlers (settings, channels, M3U, cast, notifications...)
    db.ts            # SQLite schema + queries (better-sqlite3)
    m3u-parser.ts     # M3U/M3U8 playlist parser
    cast.ts           # Chromecast mDNS discovery + CASTV2 protocol
  preload/         # contextBridge — exposes safe IPC API to the renderer
src/
  components/      # React components (Player, Home, Settings, common)
  pages/           # Route-level pages (Home, Browse, Settings, Player)
  hooks/           # useChannels, useParentalControl, etc.
  store/           # Zustand global state
  utils/           # API fetchers, M3U helpers
  i18n/            # EN/ES/PT translations
resources/         # App icons (icon.ico, tray-icon.png)
```

## Channel Sources

Channels are fetched directly from [iptv-org's M3U category playlists](https://github.com/iptv-org/iptv) (e.g. `categories/news.m3u`, `categories/sports.m3u`, etc.), parsed locally, deduplicated by stream URL, and cached in SQLite. You can also add your own custom M3U/M3U8 sources (URL or local file) from **Settings → Sources**.

## Parental Control

Enable parental control from **Settings → Parental Control**. Set a 4-digit PIN to lock adult content, specific categories, or specific channels. If you forget your PIN, use **"Forgot PIN? Reset parental controls"** on the PIN prompt — this disables the lock and clears the PIN so you can set a new one.

## License

MIT
