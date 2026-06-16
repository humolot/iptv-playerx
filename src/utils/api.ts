import { Channel, Country } from '../types'

export async function fetchIptvM3UChannels(): Promise<{ channels: Channel[]; categories: string[] }> {
  const { channels: raw } = await window.electronAPI.fetchM3UChannels()

  const channels: Channel[] = raw.map((ch: any) => ({
    id: ch.id,
    name: ch.name,
    url: ch.url,
    logo: ch.logo || undefined,
    group: ch.group || 'General',
    country: ch.country || undefined,
    languages: ch.languages || [],
    isAdult: (ch.group || '').toLowerCase() === 'xxx'
  }))

  const catSet = new Set<string>()
  for (const ch of channels) if (ch.group) catSet.add(ch.group)

  return { channels, categories: [...catSet].sort() }
}

export async function fetchCountries(): Promise<Country[]> {
  try {
    const raw = await window.electronAPI.fetchCountries()
    return (raw || []).map((c: any) => ({
      code: c.code,
      name: c.name,
      flag: c.flag,
      languages: c.languages
    }))
  } catch {
    return []
  }
}
