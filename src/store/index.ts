import { create } from 'zustand'
import { Channel, ParentalControl, AppSettings, CastDevice, DisplayInfo, Country } from '../types'
import i18n from '../i18n'

const ADULT_KEYWORDS = ['adult', 'xxx', '18+', 'erotic', 'porn', 'sex', 'nsfw', 'mature']

function isAdultChannel(channel: Channel): boolean {
  const text = `${channel.name} ${channel.group || ''}`.toLowerCase()
  return ADULT_KEYWORDS.some(k => text.includes(k))
}

function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(16)
}

interface Store {
  // Data
  channels: Channel[]
  filteredChannels: Channel[]
  categories: string[]
  countries: Country[]
  favorites: Set<string>
  history: Channel[]

  // Filters
  selectedCategory: string | null
  selectedCountry: string | null
  searchQuery: string

  // Loading states
  isLoadingChannels: boolean
  channelError: string | null

  // Settings
  settings: AppSettings

  // Parental
  parentalControl: ParentalControl
  isParentalUnlocked: boolean

  // Cast / Display
  castDevices: CastDevice[]
  displays: DisplayInfo[]

  // Player state (current channel)
  currentChannel: Channel | null

  // Actions
  setChannels: (channels: Channel[]) => void
  setCategories: (categories: string[]) => void
  setCountries: (countries: Country[]) => void
  setSelectedCategory: (cat: string | null) => void
  setSelectedCountry: (country: string | null) => void
  setSearchQuery: (q: string) => void
  setIsLoadingChannels: (v: boolean) => void
  setChannelError: (e: string | null) => void
  setSettings: (s: Partial<AppSettings>) => void
  setParentalControl: (p: ParentalControl) => void
  setParentalUnlocked: (v: boolean) => void
  setFavorites: (ids: string[]) => void
  toggleFavorite: (channel: Channel) => void
  setHistory: (channels: Channel[]) => void
  addToHistory: (channel: Channel) => void
  setCastDevices: (devices: CastDevice[]) => void
  setDisplays: (displays: DisplayInfo[]) => void
  setCurrentChannel: (channel: Channel | null) => void
  applyFilters: () => void

  // Parental helpers
  verifyPIN: (pin: string) => boolean
  setPIN: (pin: string) => void
  isChannelBlocked: (channel: Channel) => boolean
}

export const useStore = create<Store>((set, get) => ({
  channels: [],
  filteredChannels: [],
  categories: [],
  countries: [],
  favorites: new Set(),
  history: [],
  selectedCategory: null,
  selectedCountry: null,
  searchQuery: '',
  isLoadingChannels: false,
  channelError: null,
  settings: {
    language: 'en',
    theme: 'dark',
    player_type: 'auto',
    volume: '100',
    display_index: '0',
    iptv_org_enabled: 'true'
  },
  parentalControl: {
    enabled: false,
    pin_hash: null,
    block_adult: true,
    blocked_categories: [],
    blocked_channels: []
  },
  isParentalUnlocked: false,
  castDevices: [],
  displays: [],
  currentChannel: null,

  setChannels: (channels) => {
    set({ channels })
    get().applyFilters()
  },

  setCategories: (categories) => set({ categories }),
  setCountries: (countries) => set({ countries }),

  setSelectedCategory: (cat) => {
    set({ selectedCategory: cat })
    get().applyFilters()
  },

  setSelectedCountry: (country) => {
    set({ selectedCountry: country })
    get().applyFilters()
  },

  setSearchQuery: (q) => {
    set({ searchQuery: q })
    get().applyFilters()
  },

  setIsLoadingChannels: (v) => set({ isLoadingChannels: v }),
  setChannelError: (e) => set({ channelError: e }),

  setSettings: (s) => {
    const newSettings = { ...get().settings, ...s }
    set({ settings: newSettings })
    if (s.language) {
      i18n.changeLanguage(s.language)
    }
  },

  setParentalControl: (p) => set({
    parentalControl: {
      ...p,
      blocked_categories: Array.isArray(p.blocked_categories) ? p.blocked_categories :
        JSON.parse(p.blocked_categories as any || '[]'),
      blocked_channels: Array.isArray(p.blocked_channels) ? p.blocked_channels :
        JSON.parse(p.blocked_channels as any || '[]')
    }
  }),

  setParentalUnlocked: (v) => set({ isParentalUnlocked: v }),

  setFavorites: (ids) => set({ favorites: new Set(ids) }),

  toggleFavorite: (channel) => {
    const favs = new Set(get().favorites)
    if (favs.has(channel.id)) {
      favs.delete(channel.id)
      window.electronAPI?.removeFavorite(channel.id)
    } else {
      favs.add(channel.id)
      window.electronAPI?.addFavorite(channel)
    }
    set({ favorites: favs })
  },

  setHistory: (channels) => set({ history: channels }),

  addToHistory: (channel) => {
    const history = [channel, ...get().history.filter(h => h.id !== channel.id)].slice(0, 50)
    set({ history })
    window.electronAPI?.addHistory(channel)
  },

  setCastDevices: (devices) => set({ castDevices: devices }),
  setDisplays: (displays) => set({ displays }),
  setCurrentChannel: (channel) => set({ currentChannel: channel }),

  applyFilters: () => {
    const { channels, selectedCategory, selectedCountry, searchQuery, parentalControl, isParentalUnlocked } = get()

    const needsParentalFilter = parentalControl.enabled && !isParentalUnlocked
    const hasFilters = selectedCategory || selectedCountry || searchQuery.trim() || needsParentalFilter

    // Fast path: no active filters — reuse array reference
    if (!hasFilters) {
      set({ filteredChannels: channels })
      return
    }

    const q = searchQuery.trim().toLowerCase()
    const blockedCats = new Set(parentalControl.blocked_categories)
    const blockedChs = new Set(parentalControl.blocked_channels)

    const filtered = channels.filter(c => {
      if (selectedCategory && c.group !== selectedCategory) return false
      if (selectedCountry && c.country !== selectedCountry) return false
      if (q && !c.name.toLowerCase().includes(q) && !(c.group || '').toLowerCase().includes(q)) return false
      if (needsParentalFilter) {
        if (parentalControl.block_adult && isAdultChannel(c)) return false
        if (blockedCats.size > 0 && blockedCats.has(c.group || '')) return false
        if (blockedChs.size > 0 && blockedChs.has(c.id)) return false
      }
      return true
    })

    set({ filteredChannels: filtered })
  },

  verifyPIN: (pin) => {
    const { parentalControl } = get()
    if (!parentalControl.pin_hash) return false
    return simpleHash(pin) === parentalControl.pin_hash
  },

  setPIN: (pin) => {
    const hash = simpleHash(pin)
    const pc = { ...get().parentalControl, pin_hash: hash }
    set({ parentalControl: pc })
    window.electronAPI?.setParentalControl({ ...pc, pin_hash: hash })
  },

  isChannelBlocked: (channel) => {
    const { parentalControl, isParentalUnlocked } = get()
    if (!parentalControl.enabled || isParentalUnlocked) return false
    if (parentalControl.block_adult && isAdultChannel(channel)) return true
    if (parentalControl.blocked_categories.includes(channel.group || '')) return true
    if (parentalControl.blocked_channels.includes(channel.id)) return true
    return false
  }
}))
