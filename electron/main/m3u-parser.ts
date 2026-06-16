export interface ParsedChannel {
  id: string
  name: string
  url: string
  logo?: string
  group?: string
  tvgId?: string
  tvgName?: string
  languages?: string[]
  country?: string
}

function parseAttributes(attrString: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const regex = /([\w-]+)="([^"]*?)"/g
  let match
  while ((match = regex.exec(attrString)) !== null) {
    attrs[match[1]] = match[2]
  }
  return attrs
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function parseM3U(content: string): ParsedChannel[] {
  const lines = content.split(/\r?\n/)
  const channels: ParsedChannel[] = []
  let currentMeta: Partial<ParsedChannel> | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    if (line.startsWith('#EXTINF:')) {
      const commaIdx = line.lastIndexOf(',')
      const attrPart = commaIdx > 0 ? line.substring(8, commaIdx) : line.substring(8)
      const displayName = commaIdx > 0 ? line.substring(commaIdx + 1).trim() : ''
      const attrs = parseAttributes(attrPart)

      currentMeta = {
        name: displayName || attrs['tvg-name'] || 'Unknown Channel',
        logo: attrs['tvg-logo'] || undefined,
        group: attrs['group-title'] || 'General',
        tvgId: attrs['tvg-id'] || undefined,
        tvgName: attrs['tvg-name'] || undefined,
        country: attrs['tvg-country'] || undefined,
        languages: attrs['tvg-language'] ? [attrs['tvg-language']] : undefined
      }
    } else if (line.startsWith('#') || !currentMeta) {
      continue
    } else {
      // Stream URL line
      const url = line.trim()
      if (url && (url.startsWith('http') || url.startsWith('rtmp') || url.startsWith('rtsp'))) {
        const id = currentMeta.tvgId || slugify(currentMeta.name || '') + '-' + channels.length
        channels.push({
          id,
          name: currentMeta.name || 'Unknown',
          url,
          logo: currentMeta.logo,
          group: currentMeta.group,
          tvgId: currentMeta.tvgId,
          tvgName: currentMeta.tvgName,
          country: currentMeta.country,
          languages: currentMeta.languages
        })
        currentMeta = null
      }
    }
  }

  return channels
}
