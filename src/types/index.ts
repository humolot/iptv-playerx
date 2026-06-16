export interface Channel {
  id: string
  name: string
  url: string
  logo?: string
  group?: string
  country?: string
  languages?: string[]
  isAdult?: boolean
  sourceId?: string | number
}

export interface Source {
  id: number
  name: string
  type: 'iptv-org' | 'm3u-url' | 'm3u-file' | 'xtream'
  url?: string
  filepath?: string
  username?: string
  password?: string
  enabled: boolean
  created_at?: string
}

export interface Country {
  code: string
  name: string
  flag?: string
  languages?: string[]
}

export interface CastDevice {
  id: string
  name: string
  ip: string
  port: number
}

export interface DisplayInfo {
  id: number
  index: number
  label: string
  width: number
  height: number
  isPrimary: boolean
  scaleFactor: number
}

export interface ParentalControl {
  enabled: boolean
  pin_hash: string | null
  block_adult: boolean
  blocked_categories: string[]
  blocked_channels: string[]
}

export interface AppSettings {
  language: string
  theme: string
  player_type: 'auto' | 'hls' | 'mpegts' | 'native'
  volume: string
  display_index: string
  iptv_org_enabled: string
}

export type PlayerType = 'auto' | 'hls' | 'mpegts' | 'native'

export interface PlayerState {
  channel: Channel | null
  isPlaying: boolean
  isLoading: boolean
  isMuted: boolean
  volume: number
  isFullscreen: boolean
  isPiP: boolean
  playerType: PlayerType
  error: string | null
}

export interface AppState {
  channels: Channel[]
  filteredChannels: Channel[]
  categories: string[]
  countries: Country[]
  favorites: Channel[]
  history: Channel[]
  selectedCategory: string | null
  selectedCountry: string | null
  searchQuery: string
  isLoadingChannels: boolean
  channelError: string | null
  settings: AppSettings
  parentalControl: ParentalControl
  castDevices: CastDevice[]
  displays: DisplayInfo[]
  isParentalUnlocked: boolean
}

declare global {
  interface Window {
    electronAPI: {
      getSetting: (key: string) => Promise<string | null>
      setSetting: (key: string, value: string) => Promise<void>
      getAllSettings: () => Promise<Record<string, string>>
      getCacheInfo: () => Promise<{ count: number; cachedAt: string | null; ageHours: number }>
      getChannelsFromCache: () => Promise<any[]>
      saveChannelsToCache: (channels: any[]) => Promise<void>
      clearChannelsCache: () => Promise<void>
      getFavorites: () => Promise<any[]>
      addFavorite: (channel: any) => Promise<boolean>
      removeFavorite: (channelId: string) => Promise<boolean>
      isFavorite: (channelId: string) => Promise<boolean>
      getHistory: (limit?: number) => Promise<any[]>
      addHistory: (channel: any) => Promise<void>
      clearHistory: () => Promise<void>
      getSources: () => Promise<any[]>
      addSource: (source: any) => Promise<number>
      removeSource: (id: number) => Promise<boolean>
      toggleSource: (id: number, enabled: boolean) => Promise<void>
      getParentalControl: () => Promise<any>
      setParentalControl: (data: any) => Promise<void>
      fetchM3UChannels: () => Promise<{ channels: any[] }>
      fetchCountries: () => Promise<any[]>
      onM3UProgress: (cb: (data: { loaded: number; total: number; category: string }) => void) => () => void
      parseM3UUrl: (url: string) => Promise<any[]>
      parseM3UFile: () => Promise<{ channels: any[]; filePath: string } | null>
      getScreens: () => Promise<DisplayInfo[]>
      moveToScreen: (index: number) => Promise<void>
      minimize: () => Promise<void>
      maximize: () => Promise<void>
      close: () => Promise<void>
      isMaximized: () => Promise<boolean>
      setFullscreen: (flag: boolean) => Promise<void>
      isFullscreen: () => Promise<boolean>
      discoverCastDevices: () => Promise<CastDevice[]>
      castToDevice: (deviceId: string, streamUrl: string, channelName: string) => Promise<boolean>
      openExternal: (url: string) => Promise<void>
      showNotification: (title: string, body: string) => Promise<boolean>
      setCurrentChannel: (channelName: string | null) => Promise<void>
    }
  }
}
