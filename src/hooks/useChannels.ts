import { useEffect, useCallback, useRef, useState, useMemo } from 'react'
import { useStore } from '../store'
import { fetchIptvM3UChannels, fetchCountries } from '../utils/api'
import { normalizeChannels, groupChannelsByCategory } from '../utils/m3u'
import { Channel } from '../types'

// Cache is considered fresh for 24 hours
const CACHE_MAX_AGE_HOURS = 24

function rawToChannel(row: any): Channel {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    logo: row.logo || undefined,
    group: row.group_title || 'General',
    country: row.country || undefined,
    languages: (() => { try { return JSON.parse(row.languages || '[]') } catch { return [] } })(),
    isAdult: !!row.is_adult,
    sourceId: row.source || 'iptv-org'
  }
}

export function useChannels() {
  const {
    channels, filteredChannels, categories, countries,
    isLoadingChannels, channelError,
    setChannels, setCategories, setCountries,
    setIsLoadingChannels, setChannelError,
    settings
  } = useStore()

  const initialized = useRef(false)
  const [loadingSource, setLoadingSource] = useState<'cache' | 'api' | null>(null)
  const [fetchProgress, setFetchProgress] = useState<{ loaded: number; total: number; category: string } | null>(null)

  // ── Load channels: cache-first strategy ──────────────────────────────────
  const loadChannels = useCallback(async (forceRefresh = false) => {
    if (!window.electronAPI) return
    setIsLoadingChannels(true)
    setChannelError(null)

    try {
      // 1. Check cache state
      const cacheInfo = await window.electronAPI.getCacheInfo()
      const cacheIsFresh = cacheInfo.count > 0 && cacheInfo.ageHours < CACHE_MAX_AGE_HOURS

      if (cacheIsFresh && !forceRefresh) {
        // ── FAST PATH: load from SQLite ──────────────────────────────────
        setLoadingSource('cache')
        console.log(`[cache] Loading ${cacheInfo.count} channels from SQLite (${cacheInfo.ageHours.toFixed(1)}h old)`)
        const rows = await window.electronAPI.getChannelsFromCache()
        const cached = rows.map(rawToChannel)
        const cats = extractCategories(cached)

        setChannels(cached)
        setCategories(cats)
        setIsLoadingChannels(false)
        setLoadingSource(null)

        // Load countries in background (fast, separate API)
        fetchCountries().then(c => { if (c.length) setCountries(c) }).catch(() => {})

        // Background refresh if cache is older than 6 hours but still valid
        if (cacheInfo.ageHours > 6) {
          console.log('[cache] Cache is >6h, refreshing in background...')
          refreshFromAPI(false)
        }
        return
      }

      // ── SLOW PATH: fetch from API, save to cache ─────────────────────
      setLoadingSource('api')
      console.log('[cache] Cache empty or stale, fetching from IPTV-org API...')
      await refreshFromAPI(true)

    } catch (err: any) {
      // If API fails but we have stale cache, use it as fallback
      const cacheInfo = await window.electronAPI.getCacheInfo().catch(() => ({ count: 0, ageHours: 9999 }))
      if (cacheInfo.count > 0) {
        console.warn('[cache] API failed, using stale cache as fallback')
        const rows = await window.electronAPI.getChannelsFromCache()
        setChannels(rows.map(rawToChannel))
        setCategories(extractCategories(rows.map(rawToChannel)))
      } else {
        setChannelError(err.message || 'Failed to load channels')
      }
      setIsLoadingChannels(false)
      setLoadingSource(null)
    }
  }, [])

  const refreshFromAPI = useCallback(async (showLoading: boolean) => {
    if (!window.electronAPI) return
    if (showLoading) setIsLoadingChannels(true)

    // Subscribe to per-category progress events
    const unsubscribe = window.electronAPI.onM3UProgress?.((prog) => {
      setFetchProgress(prog)
    })

    try {
      const [{ channels: fetched, categories: cats }, countriesData] = await Promise.all([
        fetchIptvM3UChannels(),
        fetchCountries()
      ])

      // SQLite save is handled by the main process during fetchM3UChannels — no round-trip needed here

      // Also load any user-added M3U sources
      const userChannels = await loadUserSources()

      const allChannels = [...fetched, ...userChannels]
      const allCats = extractCategories(allChannels)

      setChannels(allChannels)
      setCategories(allCats)
      if (countriesData.length) setCountries(countriesData)
    } catch (err: any) {
      if (showLoading) setChannelError(err.message || 'Failed to load channels')
      else console.warn('[cache] Background refresh failed:', err.message)
    } finally {
      unsubscribe?.()
      setFetchProgress(null)
      if (showLoading) {
        setIsLoadingChannels(false)
        setLoadingSource(null)
      }
    }
  }, [])

  const loadUserSources = useCallback(async (): Promise<Channel[]> => {
    try {
      const sources = await window.electronAPI!.getSources()
      const enabled = sources.filter((s: any) => s.enabled && s.type !== 'iptv-org')
      const results: Channel[] = []

      for (const src of enabled) {
        try {
          let parsed: any[] = []
          if (src.type === 'm3u-url' && src.url) {
            parsed = await window.electronAPI!.parseM3UUrl(src.url)
          }
          results.push(...normalizeChannels(parsed).map(c => ({ ...c, sourceId: src.id })))
        } catch (e) {
          console.warn(`[sources] Failed to load "${src.name}":`, e)
        }
      }
      return results
    } catch { return [] }
  }, [])

  // Initial load
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    if (settings.iptv_org_enabled === 'true') {
      loadChannels(false)
    }
  }, [settings.iptv_org_enabled, loadChannels])

  return {
    channels,
    filteredChannels,
    categories,
    countries,
    isLoadingChannels,
    loadingSource,
    fetchProgress,
    channelError,
    reload: () => loadChannels(true),      // force API refresh
    refreshCache: () => refreshFromAPI(true) // same as reload
  }
}

function extractCategories(channels: Channel[]): string[] {
  const set = new Set<string>()
  for (const ch of channels) if (ch.group) set.add(ch.group)
  return [...set].sort()
}

export function useChannelsByCategory() {
  const filteredChannels = useStore(state => state.filteredChannels)
  return useMemo(() => groupChannelsByCategory(filteredChannels), [filteredChannels])
}
