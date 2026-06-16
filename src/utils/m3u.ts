import { Channel } from '../types'

export function detectStreamType(url: string): 'hls' | 'mpegts' | 'native' {
  const lower = url.toLowerCase().split('?')[0]
  if (lower.endsWith('.m3u8') || lower.includes('/hls/') || lower.includes('playlist.m3u8')) return 'hls'
  if (lower.endsWith('.ts') || lower.includes('/live/') || lower.includes('mpeg')) return 'mpegts'
  return 'native'
}

export function normalizeChannels(raw: any[]): Channel[] {
  return raw.map((ch, i) => ({
    id: ch.id || ch.tvgId || `ch-${i}`,
    name: ch.name || ch.tvgName || `Channel ${i + 1}`,
    url: ch.url,
    logo: ch.logo || ch.tvgLogo || undefined,
    group: ch.group || ch.groupTitle || 'General',
    country: ch.country || undefined,
    languages: ch.languages || [],
    isAdult: false
  }))
}

export function groupChannelsByCategory(channels: Channel[]): Record<string, Channel[]> {
  return channels.reduce((acc, ch) => {
    const group = ch.group || 'General'
    if (!acc[group]) acc[group] = []
    acc[group].push(ch)
    return acc
  }, {} as Record<string, Channel[]>)
}

export function getChannelInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}

export function generateChannelColor(id: string): string {
  const colors = [
    '#7c3aed', '#2563eb', '#059669', '#d97706',
    '#dc2626', '#7c3aed', '#0891b2', '#9333ea'
  ]
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash |= 0
  }
  return colors[Math.abs(hash) % colors.length]
}
